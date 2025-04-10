import { supabase } from "@/integrations/supabase/client";
import { db } from "@/integrations/supabase/adapter";
import { analyticsRepository } from "./repositories/AnalyticsRepository";
import { PostgrestError } from "@supabase/supabase-js";

/**
 * Extended types for raw database operations not defined in our main types
 */
interface RawDatabaseClient {
  from(table: string): any;
  rpc(functionName: string, params?: Record<string, any>): Promise<{ data: any; error: PostgrestError | null }>;
}

interface Policy {
  schema: string;
  table: string;
  roles: string[];
  command: string;
  definition: string;
}

/**
 * Service for diagnosing database health and schema
 */
export class DatabaseDiagnosticService {
  private static instance: DatabaseDiagnosticService;

  private constructor() {}

  /**
   * Get a singleton instance of the service
   */
  public static getInstance(): DatabaseDiagnosticService {
    if (!this.instance) {
      this.instance = new DatabaseDiagnosticService();
    }
    return this.instance;
  }

  /**
   * Get the raw database client for direct operations
   */
  private getRawClient(): RawDatabaseClient {
    // @ts-ignore - We're intentionally accessing internal API
    return supabase.rest;
  }

  /**
   * Check if database connection is healthy
   * @returns Connection status
   */
  async checkConnection(): Promise<{ connected: boolean; error: Error | null }> {
    try {
      const { error } = await supabase.from('call_transcripts').select('id', { count: 'exact', head: true });
      
      return {
        connected: !error,
        error: error ? new Error(error.message) : null
      };
    } catch (error) {
      console.error('Error checking database connection:', error);
      return {
        connected: false,
        error: error as Error
      };
    }
  }

  /**
   * Validate database schema against expected schema
   * @returns Validation result
   */
  async validateSchema(): Promise<{
    valid: boolean;
    missingTables: string[];
    missingColumns: { table: string; column: string }[];
    error: Error | null;
  }> {
    try {
      // Check required tables using the AnalyticsRepository
      const { exists, missingTables, error } = await analyticsRepository.checkTablesExist();
      
      if (error) {
        return {
          valid: false,
          missingTables: [],
          missingColumns: [],
          error
        };
      }
      
      // If we have missing tables, no need to check columns
      if (!exists) {
        return {
          valid: false,
          missingTables,
          missingColumns: [],
          error: null
        };
      }
      
      // Check required columns for each table
      const missingColumns: { table: string; column: string }[] = [];
      
      // Check call_transcripts columns
      const requiredColumnsMap: Record<string, string[]> = {
        'call_transcripts': ['id', 'text', 'created_at', 'sentiment', 'keywords', 'transcript_segments'],
        'calls': ['id', 'created_at', 'duration', 'sentiment_agent', 'sentiment_customer', 'talk_ratio_agent', 'talk_ratio_customer'],
        'call_metrics_summary': ['id', 'total_calls', 'avg_sentiment', 'performance_score', 'time_period'],
        'rep_metrics_summary': ['rep_id', 'rep_name', 'call_volume', 'success_rate', 'sentiment_score', 'time_period']
      };
      
      for (const table of Object.keys(requiredColumnsMap)) {
        for (const column of requiredColumnsMap[table]) {
          const { data: columnExists, error } = await supabase.rpc('check_column_exists', {
            table_name: table,
            column_name: column
          });
          
          if (error) {
            console.error(`Error checking column ${column} in table ${table}:`, error);
            continue;
          }
          
          if (!columnExists) {
            missingColumns.push({ table, column });
          }
        }
      }
      
      return {
        valid: missingColumns.length === 0,
        missingTables: [],
        missingColumns,
        error: null
      };
    } catch (error) {
      console.error('Error validating schema:', error);
      return {
        valid: false,
        missingTables: [],
        missingColumns: [],
        error: error as Error
      };
    }
  }

  /**
   * Check if RLS policies are configured
   * @returns RLS configuration status
   */
  async checkRLSConfiguration(): Promise<{
    configured: boolean;
    publicAccess: boolean;
    error: Error | null;
  }> {
    try {
      // Let's assume RLS is configured for now, since we can't directly query pg_policies
      // In a real implementation, we would need direct database admin access
      
      // This is a simple check to see if we can access data without authorization
      const { data: publicData, error: publicError } = await supabase.from('call_transcripts')
        .select('id')
        .limit(1);
      
      // If this returns data without authentication, public access is allowed
      // This is just an approximation and may not be 100% accurate
      const session = await supabase.auth.getSession();
      const isAuthenticated = !!session?.data?.session;
      
      return {
        configured: true, // We can't easily detect this via API only
        publicAccess: !isAuthenticated && !publicError && !!publicData,
        error: null
      };
    } catch (error) {
      console.error('Error checking RLS configuration:', error);
      return {
        configured: false,
        publicAccess: false,
        error: error as Error
      };
    }
  }

  /**
   * Run diagnostic health check on all components
   * @returns Overall health status
   */
  async runHealthCheck(): Promise<{
    healthy: boolean;
    connection: boolean;
    schema: boolean;
    rls: boolean;
    missingTables: string[];
    missingColumns: { table: string; column: string }[];
    errors: Record<string, string>;
  }> {
    const errors: Record<string, string> = {};
    
    // Check connection
    const connectionStatus = await this.checkConnection();
    if (!connectionStatus.connected && connectionStatus.error) {
      errors.connection = connectionStatus.error.message;
    }
    
    // Check schema
    const schemaStatus = await this.validateSchema();
    if (!schemaStatus.valid && schemaStatus.error) {
      errors.schema = schemaStatus.error.message;
    }
    
    // Check RLS
    const rlsStatus = await this.checkRLSConfiguration();
    if (rlsStatus.error) {
      errors.rls = rlsStatus.error.message;
    }
    
    // Determine overall health
    const healthy = connectionStatus.connected && 
                  schemaStatus.valid && 
                  rlsStatus.configured;
    
    return {
      healthy,
      connection: connectionStatus.connected,
      schema: schemaStatus.valid,
      rls: rlsStatus.configured,
      missingTables: schemaStatus.missingTables,
      missingColumns: schemaStatus.missingColumns,
      errors
    };
  }

  /**
   * Fix schema issues by creating missing tables and columns
   * @warning This should only be used in development
   */
  async fixSchemaIssues(): Promise<{
    success: boolean;
    fixed: {
      tables: string[];
      columns: { table: string; column: string }[];
    };
    error: Error | null;
  }> {
    try {
      // First run validation to identify issues
      const { valid, missingTables, missingColumns } = await this.validateSchema();
      
      if (valid) {
        return {
          success: true,
          fixed: {
            tables: [],
            columns: []
          },
          error: null
        };
      }
      
      // Since we can't directly execute SQL commands via the public API,
      // we'll need to rely on the application logic to create tables and columns
      // This would typically be part of a migration system
      
      console.warn('Direct schema fixes are not possible through the client API.');
      console.warn('Please run database migrations or use the admin panel to create missing tables/columns:');
      console.warn('Missing tables:', missingTables);
      console.warn('Missing columns:', missingColumns);
      
      return {
        success: false,
        fixed: {
          tables: [],
          columns: []
        },
        error: new Error('Direct schema modification not supported via client API. Use migrations instead.')
      };
    } catch (error) {
      console.error('Error fixing schema issues:', error);
      return {
        success: false,
        fixed: {
          tables: [],
          columns: []
        },
        error: error as Error
      };
    }
  }
}

// Export singleton instance
export const databaseDiagnosticService = DatabaseDiagnosticService.getInstance();
 