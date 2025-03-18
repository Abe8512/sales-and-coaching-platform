
import { supabase } from '@/integrations/supabase/client';

// This script can be run to enable realtime capabilities for the tables
// This only needs to be run once per table
// Call this function from a developer tool or admin panel, not from the regular app flow

export const enableRealtimeForTable = async (tableName: string) => {
  try {
    console.log(`Enabling realtime for table: ${tableName}`);

    // Set the table to track all field changes
    const { error: replicaError } = await supabase.rpc('enable_replica_identity', {
      table_name: tableName,
    });

    if (replicaError) {
      console.error(`Error enabling replica identity for ${tableName}:`, replicaError);
      return { success: false, error: replicaError };
    }

    // Add the table to the realtime publication
    const { error: pubError } = await supabase.rpc('add_table_to_publication', {
      table_name: tableName,
    });

    if (pubError) {
      console.error(`Error adding ${tableName} to publication:`, pubError);
      return { success: false, error: pubError };
    }

    console.log(`Successfully enabled realtime for ${tableName}`);
    return { success: true, error: null };
  } catch (error) {
    console.error(`Unexpected error enabling realtime for ${tableName}:`, error);
    return { success: false, error };
  }
};

// Helper function to enable realtime for multiple tables at once
export const enableRealtimeForAllTables = async () => {
  // List of tables that need realtime functionality
  const tables = [
    'call_transcripts',
    'calls',
    'keyword_trends',
    'sentiment_trends'
  ];
  
  const results = [];
  for (const table of tables) {
    const result = await enableRealtimeForTable(table);
    results.push({ table, ...result });
  }
  
  return results;
};
