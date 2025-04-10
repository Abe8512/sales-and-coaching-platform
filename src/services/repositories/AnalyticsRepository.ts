import { getSupabaseClient } from '@/integrations/supabase/customClient';
import { reportError, ErrorCategory } from '@/services/ErrorBridgeService';
import { PostgrestError } from '@supabase/supabase-js';

// --- Interfaces for Data Structures ---

export interface DailyMetrics {
  date: string;
  total_calls: number;
  avg_sentiment: number;
  avg_duration: number;
  avg_talk_ratio_agent?: number | null;
  avg_talk_ratio_customer?: number | null;
  performance_score?: number | null;
  // Add other metrics returned by your RPC function or view
}

export interface SentimentData {
  date: string;
  sentiment_score: number;
  // Add other fields returned by get_sentiment_over_time
}

export interface RepPerformanceData {
  rep_id: string;
  rep_name: string;
  avg_score: number;
  total_calls: number;
  // Add other fields returned by get_rep_performance
}

// Interface for the result of the analysis function
export interface TranscriptAnalysisResult {
  sentiment: string | object | null;
  sentiment_score?: number | null;
  keywords: string[] | null;
  call_score: number | null;
  talk_ratio_agent: number | null;
  talk_ratio_customer: number | null;
  speaking_speed?: { overall: number; agent?: number; customer?: number } | null;
  filler_word_count?: number | null;
  objection_count?: number | null;
}

// --- Helper Functions ---

// Helper to check for PostgrestError type (useful for specific error handling)
export const isPostgrestError = (error: any): error is PostgrestError => {
  return error && typeof error === 'object' && 'code' in error && 'message' in error && 'details' in error;
};

// --- Exported Repository Functions ---

/**
 * Fetches daily call metrics.
 * Assumes an RPC function `get_daily_metrics` exists.
 * @returns A promise resolving to daily metrics data.
 */
export const getDailyMetrics = async (): Promise<DailyMetrics[]> => {
  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase.rpc('get_daily_metrics');

    if (error) {
      // Can add specific PostgrestError check if needed
      // if (isPostgrestError(error) && error.code === 'PGRST116') { ... }
      throw error;
    }
    // Use type assertion, assuming the RPC returns the expected structure
    return (data as DailyMetrics[]) || [];
  } catch (error) {
    reportError(error, ErrorCategory.DATABASE, { action: 'getDailyMetrics' });
    // Re-throw the error so the calling code knows something went wrong
    throw error;
  }
};

/**
 * Fetches sentiment data over time.
 * Assumes an RPC function `get_sentiment_over_time` exists that accepts a `period` argument.
 * @param timePeriod The period (e.g., '7d', '30d').
 * @returns A promise resolving to sentiment trend data.
 */
export const getSentimentOverTime = async (timePeriod: string): Promise<SentimentData[]> => {
  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase.rpc('get_sentiment_over_time', { period: timePeriod });

    if (error) throw error;
    return (data as SentimentData[]) || [];
  } catch (error) {
    reportError(error, ErrorCategory.DATABASE, { action: 'getSentimentOverTime', timePeriod });
    throw error;
  }
};

/**
 * Fetches performance data for representatives.
 * Assumes an RPC function `get_rep_performance` exists.
 * @returns A promise resolving to representative performance data.
 */
export const getRepPerformance = async (): Promise<RepPerformanceData[]> => {
  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase.rpc('get_rep_performance');

    if (error) throw error;
    return (data as RepPerformanceData[]) || [];
  } catch (error) {
    reportError(error, ErrorCategory.DATABASE, { action: 'getRepPerformance' });
    throw error;
  }
};

/**
 * Analyzes a given transcript text using a Supabase RPC function.
 * Assumes an RPC function `analyze_call_transcript` exists.
 * @param transcriptText The text of the transcript to analyze.
 * @returns A promise resolving to the analysis results.
 */
export const analyzeTranscript = async (transcriptText: string): Promise<TranscriptAnalysisResult | null> => {
  if (!transcriptText || transcriptText.trim() === '') {
    console.warn('[AnalyticsRepository] analyzeTranscript called with empty text.');
    return null;
  }
  
  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase.rpc('analyze_call_transcript', { 
      transcript_text: transcriptText 
    });

    if (error) {
      // Handle specific errors like function not existing if necessary
      if (isPostgrestError(error) && error.code === '42883') { // Routine not found
        reportError(error, ErrorCategory.DATABASE, { 
          action: 'analyzeTranscript', 
          message: 'RPC function analyze_call_transcript not found in Supabase.'
        });
        // Return null or throw a more specific error depending on desired handling
        return null; 
      }
      throw error;
    }
    
    // Return the data, asserting the type. Handle cases where RPC might return null/empty.
    return data ? (data as TranscriptAnalysisResult) : null;
  } catch (error) {
    reportError(error, ErrorCategory.DATABASE, { action: 'analyzeTranscript' });
    throw error; // Re-throw error after reporting
  }
};

// Add other analytics functions here as needed, following the same pattern.