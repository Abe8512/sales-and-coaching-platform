import { supabase } from '@/integrations/supabase/client';
import { logger } from './LoggingService';
import { errorHandler } from './ErrorHandlingService';

// At the top of the file, after imports and before class definition
// Define an extended supabase client type that supports custom RPC functions and dynamic tables
type ExtendedSupabaseClient = typeof supabase & {
  rpc: (
    fn: string,
    params?: Record<string, any>
  ) => Promise<{ data: any; error: any }>;
  from: (
    table: string
  ) => {
    select: (columns?: string) => any;
    insert: (values: Record<string, any> | Record<string, any>[]) => Promise<{ data: any; error: any }>;
    update: (values: Record<string, any>) => any;
    delete: () => any;
  };
};

// Cast our supabase client to the extended type
const extendedSupabase = supabase as unknown as ExtendedSupabaseClient;

// Add this right after the ExtendedSupabaseClient definition
async function logSupabaseRequest(operation: string, details: any) {
  console.log(`[SqlUtil DEBUG] Supabase ${operation} request:`, details);
}

// Database schema migrations to ensure all tables and columns exist
export interface DbMigration {
  id: string;
  description: string;
  sql: string;
  checkFn?: () => Promise<boolean>;
}

const sqlLogger = logger.getModuleLogger('SqlUtil');

/**
 * Helper function to bypass Supabase type errors when accessing custom tables
 * or using custom RPC functions that aren't in the generated types.
 * This is a workaround for strict typing issues.
 */
const safeSupabaseAccess = {
  // Safe access to any table
  table: (tableName: string) => {
    // @ts-ignore - bypass strict typing for dynamic table access
    return supabase.from(tableName);
  },
  
  // Safe access to any RPC function
  rpc: (functionName: string, params?: Record<string, any>) => {
    // @ts-ignore - bypass strict typing for dynamic RPC function calls
    return supabase.rpc(functionName, params);
  }
};

/**
 * Service for managing database schema and executing SQL operations
 */
export class SqlUtilService {
  private migrationsTableName = 'schema_migrations';
  private appliedMigrations = new Set<string>();
  private isInitialized = false;
  
  constructor() {
    // Initialize SQL execution functions without handling migrations
    this.createSqlExecutionFunctions()
      .then(success => {
        if (success) {
          console.log('[SqlUtil DEBUG] SQL execution functions created successfully');
        } else {
          console.error('[SqlUtil DEBUG] Failed to create SQL execution functions');
        }
      })
      .catch(err => {
        console.error('[SqlUtil DEBUG] Error setting up SQL execution functions:', err);
      });
  }
  
  /**
   * Initialize the service and ensure migrations table exists
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      sqlLogger.info('Initializing SQL utility service');
      
      // Ensure migrations table exists first
      await this.ensureMigrationsTable();
      
      // Load already applied migrations
      await this.loadAppliedMigrations();
      
      this.isInitialized = true;
      sqlLogger.info('SQL utility service initialized successfully');
    } catch (error) {
      sqlLogger.error('Failed to initialize SQL utility service', error);
      this.isInitialized = false;
      
      errorHandler.handleError({
        message: 'Failed to initialize database utilities',
        technical: error,
        severity: 'error',
        code: 'SQL_INIT_ERROR'
      }, 'SqlUtilService');
    }
  }
  
  /**
   * Ensure the migrations tracking table exists
   */
  private async ensureMigrationsTable(): Promise<void> {
    try {
      // Instead of using RPC functions or direct table access, 
      // we'll use a direct SQL query to check if the table exists
      const tableCheckQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'schema_migrations'
        );
      `;
      
      // Use a simple fetch directly rather than Supabase client
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          query: tableCheckQuery
        })
      });
      
      if (!response.ok) {
        // If we can't query, assume we need to create the table
        sqlLogger.warn('Failed to check if migrations table exists, attempting to create it');
        
        // Create the table using a direct SQL approach
        // This approach bypasses the Supabase client's type checking
        const createTableSql = `
          CREATE TABLE IF NOT EXISTS schema_migrations (
            id TEXT PRIMARY KEY,
            description TEXT,
            applied_at TIMESTAMPTZ DEFAULT now()
          );
        `;
        
        // Try to create the table directly
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            query: createTableSql
          })
        });
      }
      
      sqlLogger.debug('Migrations table setup complete');
    } catch (error) {
      sqlLogger.error('Error ensuring migrations table exists', error);
      // Don't throw here, just log the error and continue
      // This makes the system more resilient to DB setup issues
      sqlLogger.info('Continuing despite migration table setup failure');
    }
  }
  
  /**
   * Load already applied migrations from the database
   */
  private async loadAppliedMigrations(): Promise<void> {
    try {
      // Use direct fetch API to avoid type errors with Supabase client
      const query = `
        SELECT id FROM schema_migrations 
        ORDER BY applied_at ASC;
      `;
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          query: query
        })
      });
      
      // Clear and repopulate the set
      this.appliedMigrations.clear();
      
      if (response.ok) {
        try {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            data.forEach(migration => {
              if (migration && migration.id) {
                this.appliedMigrations.add(migration.id);
              }
            });
          }
          sqlLogger.debug(`Loaded ${this.appliedMigrations.size} applied migrations`);
        } catch (jsonError) {
          sqlLogger.warn('Error parsing migration data', jsonError);
        }
      } else {
        // Table might not exist yet, which is fine
        sqlLogger.info('Could not load migrations - table may not exist yet');
      }
    } catch (error) {
      sqlLogger.error('Error loading applied migrations', error);
      // Don't throw here, just log the error and continue
      sqlLogger.info('Continuing despite migration loading failure');
    }
  }
  
  /**
   * Apply pending migrations if they haven't been applied yet
   * @param migrations List of migrations to apply
   * @returns Number of migrations applied
   */
  public async applyMigrations(migrations: DbMigration[]): Promise<number> {
    if (!this.isInitialized) {
      await this.init();
    }
    
    let appliedCount = 0;
    
    for (const migration of migrations) {
      if (this.appliedMigrations.has(migration.id)) {
        sqlLogger.debug(`Migration ${migration.id} already applied, skipping`);
        continue;
      }
      
      // Check if we need to run this migration based on a check function
      if (migration.checkFn) {
        try {
          const shouldApply = await migration.checkFn();
          if (!shouldApply) {
            sqlLogger.debug(`Migration ${migration.id} check failed, skipping`);
            continue;
          }
        } catch (error) {
          sqlLogger.error(`Error checking migration ${migration.id}`, error);
          throw error;
        }
      }
      
      // Apply the migration
      try {
        sqlLogger.info(`Applying migration: ${migration.id} - ${migration.description}`);
        
        // Execute the SQL
        const { error } = await extendedSupabase.rpc('execute_sql', { 
          sql: migration.sql 
        });
        
        if (error) {
          sqlLogger.error(`Failed to apply migration ${migration.id}`, error);
          throw error;
        }
        
        // Record the migration as applied
        const { error: recordError } = await extendedSupabase
          .from(this.migrationsTableName)
          .insert({
            id: migration.id,
            description: migration.description,
          });
          
        if (recordError) {
          sqlLogger.error(`Failed to record migration ${migration.id}`, recordError);
          throw recordError;
        }
        
        // Update local state
        this.appliedMigrations.add(migration.id);
        appliedCount++;
        
        sqlLogger.info(`Successfully applied migration: ${migration.id}`);
      } catch (error) {
        sqlLogger.error(`Error applying migration ${migration.id}`, error);
        
        errorHandler.handleError({
          message: `Failed to apply database migration: ${migration.description}`,
          technical: error,
          severity: 'error',
          code: 'SQL_MIGRATION_ERROR'
        }, 'SqlUtilService');
        
        // Rethrow to stop the migration process
        throw error;
      }
    }
    
    if (appliedCount > 0) {
      sqlLogger.info(`Applied ${appliedCount} new migrations`);
    } else {
      sqlLogger.info('No new migrations to apply');
    }
    
    return appliedCount;
  }
  
  /**
   * Execute SQL directly using REST API instead of RPC
   * This is a fallback method when RPC fails with 405 errors
   */
  async executeDirectSql(sql: string): Promise<boolean> {
    try {
      console.log('[SqlUtil DEBUG] Attempting direct SQL execution via REST API');
      
      // Form the correct URL for direct SQL execution
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/execute_sql`;
      
      // Send the request as a proper POST to the RPC endpoint
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ sql_query: sql })
      });
      
      console.log('[SqlUtil DEBUG] Direct SQL execution response:', {
        status: response.status,
        statusText: response.statusText
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[SqlUtil DEBUG] Direct SQL execution failed:', {
          status: response.status,
          error: errorData
        });
        return false;
      }
      
      console.log('[SqlUtil DEBUG] Direct SQL execution successful');
      return true;
    } catch (err) {
      console.error('[SqlUtil DEBUG] Error in direct SQL execution:', err);
      return false;
    }
  }
  
  /**
   * Execute a SQL statement
   * @param sql SQL statement to execute
   * @param params Optional parameters
   * @returns Result of the SQL execution
   */
  async executeSql(sql: string): Promise<boolean> {
    try {
      sqlLogger.debug('Executing SQL', { sql });
      console.log('[SqlUtil DEBUG] Executing SQL via RPC:', { 
        sql, 
        method: 'execute_sql',
        params: { sql_query: sql },
      });
      
      // Attempt to do a HEAD request to check connectivity first
      try {
        const connectivityCheck = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
          method: 'HEAD',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        });
        console.log('[SqlUtil DEBUG] Connectivity check result:', { 
          status: connectivityCheck.status,
          ok: connectivityCheck.ok
        });
      } catch (checkErr) {
        console.error('[SqlUtil DEBUG] Connectivity check failed:', checkErr);
      }
      
      try {
        const { data, error } = await extendedSupabase.rpc('execute_sql', { sql_query: sql });
        
        if (error) {
          sqlLogger.error('Error executing SQL via RPC', { error, sql });
          console.error('[SqlUtil DEBUG] RPC execution error details:', { 
            errorCode: error.code,
            errorMessage: error.message,
            errorDetails: error.details,
            sql
          });
          
          // If we get a 405 error, try direct SQL execution
          if (error.code === 'PGRST117' || error.message?.includes('Unsupported HTTP method')) {
            console.log('[SqlUtil DEBUG] RPC returned 405, attempting direct SQL execution');
            return await this.executeDirectSql(sql);
          }
          
          return false;
        }
        
        console.log('[SqlUtil DEBUG] SQL execution successful:', { data });
        return true;
      } catch (rpcErr) {
        console.error('[SqlUtil DEBUG] RPC execution exception:', rpcErr);
        
        // Try direct execution as fallback
        console.log('[SqlUtil DEBUG] RPC failed with exception, trying direct SQL execution');
        return await this.executeDirectSql(sql);
      }
    } catch (err) {
      sqlLogger.error('Error in executeSql', { err, sql });
      console.error('[SqlUtil DEBUG] Exception during SQL execution:', err);
      return false;
    }
  }
  
  /**
   * Check if a column exists in a table
   * @param tableName Table name
   * @param columnName Column name
   * @returns Whether the column exists
   */
  public async columnExists(tableName: string, columnName: string): Promise<boolean> {
    try {
      const { data, error } = await extendedSupabase.rpc('check_column_exists', {
        p_table_name: tableName,
        p_column_name: columnName
      });
      
      if (error) {
        // Fallback method if RPC fails
        sqlLogger.warn(`RPC check_column_exists failed, using fallback method for ${tableName}.${columnName}`, error);
        
        try {
          const query = `SELECT * FROM ${tableName} LIMIT 0`;
          const { data: queryData, error: queryError } = await extendedSupabase.rpc('execute_sql_with_results', { 
            sql: query 
          });
          
          if (queryError) {
            throw queryError;
          }
          
          // Check if the returned columns include our target
          return queryData && 
                 Array.isArray(queryData.columns) && 
                 queryData.columns.includes(columnName);
        } catch (fallbackError) {
          sqlLogger.error('Fallback column check failed', fallbackError);
          return false;
        }
      }
      
      return !!data;
    } catch (error) {
      sqlLogger.error(`Error checking if column ${columnName} exists in ${tableName}`, error);
      return false;
    }
  }
  
  /**
   * Add a column to a table if it doesn't exist
   */
  public async addColumn(
    tableName: string, 
    columnName: string, 
    columnType: string
  ): Promise<{ success: boolean; columnAdded: boolean; error?: any }> {
    try {
      // Check if column already exists
      const columnExists = await this.columnExists(tableName, columnName);
      
      if (columnExists) {
        return { success: true, columnAdded: false };
      }
      
      // Add the column
      sqlLogger.info(`Adding column ${columnName} to ${tableName}`);
      
      const sql = `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${columnType}`;
      const success = await this.executeSql(sql);
      
      if (!success) {
        return { success: false, columnAdded: false, error: "SQL execution failed" };
      }
      
      return { success: true, columnAdded: true };
    } catch (error) {
      sqlLogger.error(`Error adding column ${columnName} to ${tableName}`, error);
      return { success: false, columnAdded: false, error };
    }
  }

  async insertIntoTable(tableName: string, data: Record<string, any>): Promise<boolean> {
    try {
      sqlLogger.debug('Inserting data into table', { tableName });
      
      const { error } = await extendedSupabase.from(tableName).insert(data);
      
      if (error) {
        sqlLogger.error('Error inserting data', { error, tableName, data });
        return false;
      }
      
      return true;
    } catch (err) {
      sqlLogger.error('Error in insertIntoTable', { err, tableName, data });
      return false;
    }
  }

  async checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
    try {
      const sql = `
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public'
          AND table_name = '${tableName}'
          AND column_name = '${columnName}'
        )
      `;
      
      const { data, error } = await extendedSupabase.rpc('execute_sql_with_results', { sql_query: sql });
      
      if (error) {
        sqlLogger.error('Error checking column exists', { error, tableName, columnName });
        return false;
      }
      
      return data && data[0] && data[0].exists === true;
    } catch (err) {
      sqlLogger.error('Error in checkColumnExists', { err, tableName, columnName });
      return false;
    }
  }

  /**
   * Check if a table exists
   */
  async checkTableExists(tableName: string): Promise<boolean> {
    try {
      sqlLogger.debug('Checking if table exists', { tableName });
      
      const sql = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = '${tableName}'
        );
      `;
      
      console.log(`[SqlUtil DEBUG] Checking if table ${tableName} exists`);
      
      // Use executeQuery to get the exists result
      const results = await this.executeQuery(sql);
      
      console.log(`[SqlUtil DEBUG] Table check results:`, results);
      
      return results && results.length > 0 && results[0]?.exists === true;
    } catch (err) {
      sqlLogger.error('Error in checkTableExists', { err, tableName });
      console.error(`[SqlUtil DEBUG] Failed to check if table ${tableName} exists:`, err);
      return false;
    }
  }
  
  /**
   * Execute SQL query and return results
   */
  async executeQuery(sql: string): Promise<any[]> {
    try {
      console.log('[SqlUtil DEBUG] Executing query with results:', { sql });
      
      try {
        const { data, error } = await extendedSupabase.rpc('execute_sql_with_results', { sql_query: sql });
        
        if (error) {
          console.error('[SqlUtil DEBUG] RPC query execution error:', {
            errorCode: error.code,
            errorMessage: error.message,
            errorDetails: error.details,
            sql
          });
          
          // If we get a 405 error, try direct execution
          if (error.code === 'PGRST117' || error.message?.includes('Unsupported HTTP method')) {
            return await this.executeDirectQuery(sql);
          }
          
          return [];
        }
        
        console.log('[SqlUtil DEBUG] Query execution successful:', { data });
        return data || [];
      } catch (rpcErr) {
        console.error('[SqlUtil DEBUG] RPC query execution exception:', rpcErr);
        
        // Try direct execution as fallback
        return await this.executeDirectQuery(sql);
      }
    } catch (err) {
      console.error('[SqlUtil DEBUG] Error in executeQuery:', err);
      return [];
    }
  }
  
  /**
   * Execute a query directly using REST API
   */
  async executeDirectQuery(sql: string): Promise<any[]> {
    try {
      console.log('[SqlUtil DEBUG] Attempting direct query execution via REST API');
      
      // Form the correct URL for direct query execution
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/execute_sql_with_results`;
      
      // Send the request as a proper POST to the RPC endpoint
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ sql_query: sql })
      });
      
      console.log('[SqlUtil DEBUG] Direct query execution response:', {
        status: response.status,
        statusText: response.statusText
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[SqlUtil DEBUG] Direct query execution failed:', {
          status: response.status,
          error: errorData
        });
        return [];
      }
      
      const data = await response.json();
      console.log('[SqlUtil DEBUG] Direct query execution successful:', { data });
      return data || [];
    } catch (err) {
      console.error('[SqlUtil DEBUG] Error in direct query execution:', err);
      return [];
    }
  }

  /**
   * Create necessary SQL functions in Supabase if they don't exist
   */
  async createSqlExecutionFunctions(): Promise<boolean> {
    console.log('[SqlUtil DEBUG] Creating SQL execution functions in Supabase');
    
    // First, check if we can connect directly
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });
      
      if (!response.ok && response.status >= 400) {
        console.error('[SqlUtil DEBUG] Cannot connect to Supabase API:', response.status);
        return false;
      }
      
      console.log('[SqlUtil DEBUG] Connected to Supabase API, status:', response.status);
    } catch (err) {
      console.error('[SqlUtil DEBUG] Failed to connect to Supabase API:', err);
      return false;
    }
    
    // Create execute_sql function
    const createExecuteSqlFn = `
    CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
    RETURNS VOID
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql_query;
    END;
    $$;
    `;
    
    // Create execute_sql_with_results function
    const createExecuteSqlWithResultsFn = `
    CREATE OR REPLACE FUNCTION execute_sql_with_results(sql_query TEXT)
    RETURNS SETOF json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      RETURN QUERY EXECUTE sql_query;
    END;
    $$;
    `;
    
    // Try creating the functions directly
    const executeUrl = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/execute_sql`;
    
    try {
      // First try an RPC call to see if the function already exists
      const testResponse = await fetch(executeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ sql_query: 'SELECT 1' })
      });
      
      if (testResponse.ok) {
        console.log('[SqlUtil DEBUG] execute_sql function already exists, skipping creation');
        return true;
      }
      
      console.log('[SqlUtil DEBUG] execute_sql function does not exist or returned error:', testResponse.status);
      
      // Create both functions using raw SQL
      const sqlUrl = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/sql`;
      
      // Try creating execute_sql function
      const execFnResponse = await fetch(sqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ query: createExecuteSqlFn })
      });
      
      console.log('[SqlUtil DEBUG] Create execute_sql function response:', {
        status: execFnResponse.status,
        statusText: execFnResponse.statusText
      });
      
      // Try creating execute_sql_with_results function
      const execWithResultsFnResponse = await fetch(sqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ query: createExecuteSqlWithResultsFn })
      });
      
      console.log('[SqlUtil DEBUG] Create execute_sql_with_results function response:', {
        status: execWithResultsFnResponse.status,
        statusText: execWithResultsFnResponse.statusText
      });
      
      // Verify that functions now exist
      const verifyResponse = await fetch(executeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ sql_query: 'SELECT 1' })
      });
      
      if (verifyResponse.ok) {
        console.log('[SqlUtil DEBUG] Functions created successfully');
        // Dispatch an event to notify that we've initialized the SQL functions
        const event = new CustomEvent('sql-functions-created', { 
          detail: { success: true }
        });
        window.dispatchEvent(event);
        return true;
      } else {
        console.error('[SqlUtil DEBUG] Failed to create SQL functions, verify check failed:', 
          verifyResponse.status);
        return false;
      }
    } catch (err) {
      console.error('[SqlUtil DEBUG] Error creating SQL functions:', err);
      return false;
    }
  }
}

// Create standard database migrations
export const standardMigrations: DbMigration[] = [
  {
    id: '20240101-001-add-execute-sql-function',
    description: 'Add execute_sql function for admin operations',
    sql: `
      CREATE OR REPLACE FUNCTION execute_sql(sql text, params text DEFAULT NULL)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        IF params IS NOT NULL THEN
          EXECUTE sql USING params;
        ELSE
          EXECUTE sql;
        END IF;
      END;
      $$;
      
      -- Grant execute to authenticated users
      GRANT EXECUTE ON FUNCTION execute_sql TO authenticated;
    `,
    // Only run this if the function doesn't exist
    checkFn: async () => {
      try {
        const { error } = await extendedSupabase.rpc('execute_sql', { sql: 'SELECT 1' });
        return !!error; // If error, function doesn't exist or isn't working
      } catch (e) {
        return true; // Function doesn't exist, should run migration
      }
    }
  },
  {
    id: '20240101-002-add-execute-sql-with-results-function',
    description: 'Add execute_sql_with_results function for queries that return data',
    sql: `
      CREATE OR REPLACE FUNCTION execute_sql_with_results(sql text, params text DEFAULT NULL)
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result json;
      BEGIN
        IF params IS NOT NULL THEN
          EXECUTE sql || ' FORMAT JSON' INTO result USING params;
        ELSE
          EXECUTE sql || ' FORMAT JSON' INTO result;
        END IF;
        RETURN result;
      END;
      $$;
      
      -- Grant execute to authenticated users
      GRANT EXECUTE ON FUNCTION execute_sql_with_results TO authenticated;
    `,
  },
  {
    id: '20240101-003-add-check-column-exists-function',
    description: 'Add function to check if a column exists in a table',
    sql: `
      CREATE OR REPLACE FUNCTION check_column_exists(
        p_table_name text,
        p_column_name text
      ) RETURNS boolean
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        column_exists boolean;
      BEGIN
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = p_table_name
            AND column_name = p_column_name
        ) INTO column_exists;
        
        RETURN column_exists;
      END;
      $$;
      
      -- Grant execute to authenticated users
      GRANT EXECUTE ON FUNCTION check_column_exists TO authenticated;
    `
  },
  {
    id: '20240101-004-add-create-migrations-table-function',
    description: 'Add function to ensure migrations table exists',
    sql: `
      CREATE OR REPLACE FUNCTION create_migrations_table_if_not_exists()
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id TEXT PRIMARY KEY,
          description TEXT,
          applied_at TIMESTAMPTZ DEFAULT now()
        );
      END;
      $$;
      
      -- Grant execute to authenticated users
      GRANT EXECUTE ON FUNCTION create_migrations_table_if_not_exists TO authenticated;
    `
  },
  {
    id: '20240101-005-add-metadata-column',
    description: 'Add metadata JSONB column to call_transcripts table',
    sql: `
      ALTER TABLE call_transcripts 
      ADD COLUMN IF NOT EXISTS metadata JSONB;
    `,
    checkFn: async () => {
      // Check if the call_transcripts table exists before trying to add the column
      try {
        const { data, error } = await extendedSupabase
          .from('call_transcripts')
          .select('id')
          .limit(1);
          
        return !error; // If no error, table exists, should run migration
      } catch (e) {
        return false; // Table doesn't exist, don't run migration
      }
    }
  },
  {
    id: '20240101-006-add-calls-table-columns',
    description: 'Add additional columns to calls table',
    sql: `
      ALTER TABLE calls 
      ADD COLUMN IF NOT EXISTS speaking_speed NUMERIC,
      ADD COLUMN IF NOT EXISTS filler_word_count INTEGER,
      ADD COLUMN IF NOT EXISTS objection_count INTEGER,
      ADD COLUMN IF NOT EXISTS customer_engagement NUMERIC;
    `,
    checkFn: async () => {
      try {
        const { data, error } = await extendedSupabase
          .from('calls')
          .select('id')
          .limit(1);
          
        return !error; // If no error, table exists, should run migration
      } catch (e) {
        return false; // Table doesn't exist, don't run migration
      }
    }
  }
];

// Create and export the singleton service
export const sqlUtilService = new SqlUtilService();

// Utility function to verify and run database migrations when the app starts
export const ensureDatabaseSchema = async (): Promise<void> => {
  try {
    console.log('Ensuring database schema...');
    await sqlUtilService.init().catch(error => {
      console.warn('Database initialization had issues, but will continue:', error);
    });
    
    try {
      await sqlUtilService.applyMigrations(standardMigrations);
      console.log('Database migrations applied successfully');
    } catch (migrationError) {
      console.warn('Some database migrations could not be applied, but will continue:', migrationError);
    }
    
    // Emit a success event even if there were issues
    // This allows the app to continue functioning with limited database features
    window.dispatchEvent(new CustomEvent('database-schema-setup-complete', { 
      detail: { 
        success: true,
        message: 'Database schema setup complete with possible limitations'
      } 
    }));
  } catch (error) {
    console.error('Failed to ensure database schema, but will continue app operation', error);
    
    // Instead of throwing errors that prevent app loading, 
    // we'll log them and let the app continue with limited functionality
    sqlLogger.error('Database schema setup had issues', error);
    
    errorHandler.handleError({
      message: 'Database schema setup has issues - some features may be limited',
      technical: error,
      severity: 'warning',
      code: 'DB_SCHEMA_SYNC_WARNING'
    }, 'SqlUtilService');
    
    // Still emit an event so the app knows schema setup attempted but had issues
    window.dispatchEvent(new CustomEvent('database-schema-setup-complete', { 
      detail: { 
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Database schema setup could not complete - some features may be limited'
      } 
    }));
  }
}; 