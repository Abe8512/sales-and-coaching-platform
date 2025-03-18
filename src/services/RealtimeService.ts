
import { supabase } from '@/integrations/supabase/client';

/**
 * Service for enabling realtime functionality in Supabase tables
 */
export const realtimeService = {
  /**
   * Enable realtime functionality for a table via RPC function
   */
  enableRealtimeForTable: async (tableName: string) => {
    try {
      console.log(`Enabling realtime for table: ${tableName}`);
      
      // First, set the table to full replica mode to capture all columns in change events
      const { error: replicaError } = await supabase.rpc('set_replica_identity_full_for_table', {
        table_name: tableName
      });
      
      if (replicaError) {
        console.error(`Error setting replica identity for ${tableName}:`, replicaError);
        throw replicaError;
      }
      
      // Then, add the table to the realtime publication
      const { error: pubError } = await supabase.rpc('add_table_to_realtime_publication', {
        table_name: tableName
      });
      
      if (pubError) {
        console.error(`Error adding ${tableName} to publication:`, pubError);
        throw pubError;
      }
      
      console.log(`Successfully enabled realtime for ${tableName}`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to enable realtime for ${tableName}:`, error);
      return { success: false, error };
    }
  },
  
  /**
   * Check if a table has realtime enabled using our custom SQL function
   */
  checkRealtimeEnabled: async (tableName: string) => {
    try {
      // This uses our new SQL function to check if the table is in the realtime publication
      const { data, error } = await supabase.rpc('check_table_in_publication', {
        table_name: tableName,
        publication_name: 'supabase_realtime'
      });
      
      if (error) {
        console.error(`Error checking realtime status for ${tableName}:`, error);
        return { enabled: false, error };
      }
      
      return { enabled: !!data };
    } catch (error) {
      console.error(`Failed to check realtime status for ${tableName}:`, error);
      return { enabled: false, error };
    }
  },
  
  /**
   * Enable realtime for all important tables
   */
  enableRealtimeForAllTables: async () => {
    const tables = [
      'call_transcripts',
      'calls',
      'keyword_trends', 
      'sentiment_trends'
    ];
    
    const results = [];
    for (const table of tables) {
      const result = await realtimeService.enableRealtimeForTable(table);
      results.push({ table, ...result });
    }
    
    return results;
  }
};
