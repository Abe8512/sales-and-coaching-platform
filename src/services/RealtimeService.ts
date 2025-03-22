import { supabase } from '@/integrations/supabase/client';
import { errorHandler } from './ErrorHandlingService';
import { realtimeLogger as logger } from './LoggingService';
import { REALTIME_TABLES, TableName } from '@/constants/tables';

// List of tables that need realtime functionality
// Replaced with import from constants
// export const REALTIME_TABLES = [
//   'call_transcripts',
//   'calls',
//   'keyword_trends',
//   'sentiment_trends'
// ];

/**
 * Service for enabling and managing realtime functionality in Supabase tables
 */
export const realtimeService = {
  /**
   * Enable realtime functionality for a table via RPC function
   * @param tableName - The name of the table to enable realtime for
   * @returns A result object indicating success or failure
   */
  enableRealtimeForTable: async (tableName: string) => {
    try {
      logger.info(`Enabling realtime for table: ${tableName}`);
      
      // First, set the table to full replica mode to capture all columns in change events
      const { error: replicaError } = await supabase.rpc('set_replica_identity_full_for_table', {
        table_name: tableName
      });
      
      if (replicaError) {
        logger.error(`Error setting replica identity for ${tableName}`, replicaError);
        errorHandler.handleError({
          message: `Failed to set replica identity for ${tableName}`,
          technical: replicaError.message,
          severity: 'error',
          code: 'REALTIME_REPLICA_ERROR'
        }, 'RealtimeService');
        return { success: false, error: replicaError };
      }
      
      // Then, add the table to the realtime publication
      const { error: pubError } = await supabase.rpc('add_table_to_realtime_publication', {
        table_name: tableName
      });
      
      if (pubError) {
        logger.error(`Error adding ${tableName} to publication`, pubError);
        errorHandler.handleError({
          message: `Failed to add ${tableName} to realtime publication`,
          technical: pubError.message,
          severity: 'error',
          code: 'REALTIME_PUB_ERROR'
        }, 'RealtimeService');
        return { success: false, error: pubError };
      }
      
      logger.info(`Successfully enabled realtime for ${tableName}`);
      return { success: true, error: null };
    } catch (error) {
      logger.error(`Failed to enable realtime for ${tableName}`, error);
      errorHandler.handleError({
        message: `Unexpected error enabling realtime for ${tableName}`,
        technical: error instanceof Error ? error.message : String(error),
        severity: 'error',
        code: 'REALTIME_UNKNOWN_ERROR'
      }, 'RealtimeService');
      return { success: false, error };
    }
  },
  
  /**
   * Check if a table has realtime enabled using our custom SQL function
   * @param tableName - The name of the table to check
   * @returns An object indicating if realtime is enabled for the table
   */
  checkRealtimeEnabled: async (tableName: string) => {
    try {
      logger.debug(`Checking realtime status for table: ${tableName}`);
      
      // This uses our new SQL function to check if the table is in the realtime publication
      const { data, error } = await supabase.rpc('check_table_in_publication', {
        table_name: tableName,
        publication_name: 'supabase_realtime'
      });
      
      if (error) {
        logger.error(`Error checking realtime status for ${tableName}`, error);
        errorHandler.handleError({
          message: `Failed to check realtime status for ${tableName}`,
          technical: error.message,
          severity: 'warning',
          code: 'REALTIME_CHECK_ERROR'
        }, 'RealtimeService');
        return { enabled: false, error };
      }
      
      const isEnabled = !!data;
      logger.debug(`Realtime status for ${tableName}: ${isEnabled ? 'enabled' : 'disabled'}`);
      return { enabled: isEnabled, error: null };
    } catch (error) {
      logger.error(`Failed to check realtime status for ${tableName}`, error);
      errorHandler.handleError({
        message: `Unexpected error checking realtime status for ${tableName}`,
        technical: error instanceof Error ? error.message : String(error),
        severity: 'warning',
        code: 'REALTIME_CHECK_UNKNOWN_ERROR'
      }, 'RealtimeService');
      return { enabled: false, error };
    }
  },
  
  /**
   * Enable realtime for all important tables
   * @returns Array of results for each table
   */
  enableRealtimeForAllTables: async () => {
    logger.info(`Enabling realtime for ${REALTIME_TABLES.length} tables`);
    const results = [];
    
    for (const table of REALTIME_TABLES) {
      const result = await realtimeService.enableRealtimeForTable(table);
      results.push({ table, ...result });
    }
    
    const successCount = results.filter(r => r.success).length;
    logger.info(`Enabled realtime for ${successCount}/${REALTIME_TABLES.length} tables`);
    
    return results;
  },
  
  /**
   * Check realtime status for all important tables
   * @returns Array of status results for each table
   */
  checkRealtimeForAllTables: async () => {
    logger.info(`Checking realtime status for ${REALTIME_TABLES.length} tables`);
    const results = [];
    
    for (const table of REALTIME_TABLES) {
      const result = await realtimeService.checkRealtimeEnabled(table);
      results.push({ table, ...result });
    }
    
    const enabledCount = results.filter(r => r.enabled).length;
    logger.info(`Realtime status: ${enabledCount}/${REALTIME_TABLES.length} tables enabled`);
    
    return results;
  }
};
