import { getSupabaseClient } from '@/integrations/supabase/customClient';
import { reportError, ErrorCategory } from '@/services/ErrorBridgeService';

// Define the structure of a Transcript (Based on call_transcripts table)
export interface Transcript {
  id: string;
  created_at: string;
  call_id: string | null; // Match schema
  text: string;
  speaker_label?: string | null; // Needs corresponding column or logic
  start_time?: number | null;    // Needs corresponding column or logic
  end_time?: number | null;      // Needs corresponding column or logic
  user_id: string; // Match schema
  filename?: string | null; // Match schema
  duration?: number | null; // Match schema
  sentiment?: string | null; // Match schema
  sentiment_score?: number | null; // Match schema
  keywords?: string[] | null; // Match schema
  call_score?: number | null; // Match schema
  talk_ratio_agent?: number | null; // Match schema
  talk_ratio_customer?: number | null; // Match schema
  transcript_segments?: object | null; // Match schema (JSONB maps to object)
  language?: string | null; // Match schema
  metadata?: object | null; // Match schema (JSONB maps to object)
}

// Define the structure for transcript creation payload (match INSERT types)
export interface CreateTranscriptPayload {
  id?: string; // Optional if using DB default UUID
  call_id?: string | null;
  user_id: string;
  filename?: string | null;
  text: string;
  duration?: number | null;
  language?: string | null;
  sentiment?: string | null;
  sentiment_score?: number | null;
  keywords?: string[] | null;
  call_score?: number | null;
  talk_ratio_agent?: number | null;
  talk_ratio_customer?: number | null;
  transcript_segments?: object | null;
  metadata?: object | null;
  created_at?: string; // Optional if using DB default timestamp
  // Omit speaker_label, start_time, end_time if not actual columns
}

// Define filter type (match available query columns)
export interface TranscriptFilter {
  callId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  sortBy?: string; // e.g., 'created_at', 'call_score'
  sortOrder?: string; // 'asc' or 'desc'
  userId?: string; // Filter by user
  // Add other potential filter fields based on schema (e.g., sentiment)
}

// Define the primary table name directly
const TRANSCRIPTS_TABLE_NAME = 'call_transcripts';
const DEFAULT_TRANSCRIPT_LIMIT = 50;

/**
 * Fetches transcripts using only the call_transcripts table.
 */
export const getTranscripts = async (filter?: TranscriptFilter): Promise<Transcript[]> => {
  const supabase = getSupabaseClient();
  const TABLE_TO_QUERY = TRANSCRIPTS_TABLE_NAME; // Use the constant
  
  try {
    const limit = filter?.limit ?? DEFAULT_TRANSCRIPT_LIMIT;
    const page = 1; 
    const offset = (page - 1) * limit;

    let query = supabase
      .from(TABLE_TO_QUERY) 
      .select('*')
      .order(filter?.sortBy ?? 'created_at', { ascending: (filter?.sortOrder ?? 'desc') === 'asc' })
      .range(offset, offset + limit - 1);

    // Apply filters precisely matching table columns
    if (filter?.callId) {
      query = query.eq('call_id', filter.callId);
    }
    if (filter?.startDate) {
      query = query.gte('created_at', filter.startDate);
    }
    if (filter?.endDate) {
      query = query.lte('created_at', filter.endDate);
    }
    if (filter?.userId) { // Add User ID filter if provided
       query = query.eq('user_id', filter.userId);
    }
    
    console.debug(`[TranscriptsRepository] Fetching from ${TABLE_TO_QUERY} with limit ${limit}`);
    const { data, error } = await query;

    if (error) {
      console.error(`[TranscriptsRepository] Error fetching from ${TABLE_TO_QUERY}:`, error);
      // Log the full error before throwing
      reportError(error, ErrorCategory.DATABASE, { action: 'getTranscripts', filter, table: TABLE_TO_QUERY });
      throw error; // Re-throw to allow hook to catch it
    }
    
    console.debug(`[TranscriptsRepository] Successfully fetched ${data?.length ?? 0} transcripts from ${TABLE_TO_QUERY}.`);
    return data || []; // Type assertion might be needed if columns differ slightly from Transcript interface

  } catch (error) {
    // Log error from the catch block as well
    console.error(`[TranscriptsRepository] Catch block error fetching from ${TABLE_TO_QUERY}:`, error);
    // Ensure error is reported even if it didn't come from the initial query result
    if (!(error instanceof Error && (error as any).details)) { // Avoid double reporting
        reportError(error, ErrorCategory.DATABASE, { action: 'getTranscripts', filter, table: TABLE_TO_QUERY });
    }
    return []; // Return empty on error
  }
};

/**
 * Creates a new transcript entry in call_transcripts table.
 */
export const createTranscript = async (payload: CreateTranscriptPayload): Promise<Transcript | null> => {
  const supabase = getSupabaseClient();
  const TABLE_TO_QUERY = TRANSCRIPTS_TABLE_NAME;
  
  try {
    console.debug(`[TranscriptsRepository] Creating transcript in ${TABLE_TO_QUERY}`);
    const { data, error } = await supabase
      .from(TABLE_TO_QUERY)
      .insert([payload]) // Ensure payload matches table schema exactly
      .select()
      .single();

    if (error) {
      console.error(`[TranscriptsRepository] Error creating transcript in ${TABLE_TO_QUERY}:`, error);
      reportError(error, ErrorCategory.DATABASE, { action: 'createTranscript', payload, table: TABLE_TO_QUERY });
      throw error;
    }
    if (!data) {
      console.warn(`[TranscriptsRepository] Transcript creation in ${TABLE_TO_QUERY} returned no data.`);
      // Don't throw an error here, just return null, as it might be RLS preventing SELECT return
      return null; 
    }
    console.debug(`[TranscriptsRepository] Successfully created transcript ID: ${data.id}`);
    // Cast to Transcript, ensure properties align
    return data as Transcript; 

  } catch (error) {
    console.error(`[TranscriptsRepository] Catch block error during creation in ${TABLE_TO_QUERY}:`, error);
    if (!(error instanceof Error && (error as any).details)) { // Avoid double reporting
       reportError(error, ErrorCategory.DATABASE, { action: 'createTranscript', payload, table: TABLE_TO_QUERY });
    }
    return null;
  }
};

// Remove previous fetch functions if getTranscripts covers their functionality
// Or keep them if they have distinct logic or usage patterns

/* // Removed fetchTranscriptsByCallId as getTranscripts({ callId }) covers it
export const fetchTranscriptsByCallId = async (callId: string): Promise<Transcript[]> => { ... };
*/

/* // Removed fetchTranscriptsByDateRange as getTranscripts({ startDate, endDate }) covers it
export const fetchTranscriptsByDateRange = async (startDate: string, endDate: string): Promise<Transcript[]> => { ... };
*/

// Remove unused type exports related to the old Database type
// export type TranscriptInsert = Database['public']['Tables']['call_transcripts']['Insert'];
// export type TranscriptUpdate = Database['public']['Tables']['call_transcripts']['Update'];

// Remove old class structure if it's no longer used
/*
export class TranscriptsRepository {
    private tableName = 'call_transcripts';
    // ... old methods ...
}
*/ // Add closing comment tag