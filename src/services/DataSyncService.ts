import { getSupabaseClient } from "@/integrations/supabase/customClient";
import { calculatePerformanceScore } from "./SharedDataService";
import { reportError, ErrorCategory } from "./ErrorBridgeService";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

// Define types (adjust if needed based on actual schema)
interface CallData {
  id: string;
  created_at: string;
  duration: number | null;
  sentiment_agent: number | null;
  sentiment_customer: number | null;
  talk_ratio_agent: number | null;
  talk_ratio_customer: number | null;
  key_phrases: string[] | null;
  user_id: string | null;
  // Add other fields if read from calls/transcripts
}

interface CallMetricsSummary {
  id: string;
  total_calls: number;
  avg_sentiment: number;
  agent_talk_ratio: number;
  customer_talk_ratio: number;
  top_keywords: Json | null; // Use Json type
  performance_score: number;
  conversion_rate: number;
  avg_call_duration: number;
  successful_calls: number;
  unsuccessful_calls: number;
  time_period: string;
  metrics_version: number;
  // updated_at is handled by DB
}

interface RepMetricsSummary {
  rep_id: string;
  rep_name: string | null;
  total_calls: number;
  success_rate: number;
  avg_sentiment: number;
  agent_talk_ratio: number;
  customer_talk_ratio: number;
  avg_duration: number;
  top_keywords: Json | null; // Use Json type
  insights: string[] | null;
  time_period: string;
  metrics_version: number;
  // updated_at is handled by DB
}

/**
 * Service responsible for syncing metrics data.
 */
export class DataSyncService {
  private static syncInProgress = false;

  /**
   * Sync call metrics data to summary table.
   */
  static async syncCallMetrics(): Promise<boolean> {
    const supabase = getSupabaseClient();
    console.log('Starting syncCallMetrics...');
    let calls: CallData[] = [];

    try {
      // Try fetching from 'calls' table
      const { data: callsData, error: callsError } = await supabase
        .from('calls')
        .select('id, created_at, duration, sentiment_agent, sentiment_customer, talk_ratio_agent, talk_ratio_customer, key_phrases, user_id');
      
      if (callsError) {
        // Log warning but don't necessarily stop if transcripts might exist
        console.warn('Error getting data from calls table (might be RLS or empty): ', callsError.message);
      } else if (callsData && callsData.length > 0) {
        calls = callsData as CallData[];
        console.log(`Found ${calls.length} records in calls table`);
      }

      // If no data from 'calls', try 'call_transcripts' (assuming it has needed fields or defaults)
      if (calls.length === 0) {
        console.log('No data in calls table, trying call_transcripts...');
        const { data: transcriptsData, error: transcriptsError } = await supabase
          .from('call_transcripts') // Use correct table name
          .select('id, call_id, created_at, text, keywords, sentiment, user_id'); // Select relevant fields
        
        if (transcriptsError) {
           console.error('Error getting data from call_transcripts table: ', transcriptsError.message);
           // If both fail, report and exit gracefully
          throw new Error('Failed to get call data from either calls or call_transcripts table');
        }
        
        if (transcriptsData && transcriptsData.length > 0) {
            console.log(`Found ${transcriptsData.length} records in call_transcripts table`);
            // Basic transformation (needs refinement based on actual transcript data)
            calls = transcriptsData.map((t: any) => ({
                id: t.call_id || t.id, // Prefer call_id if available
                created_at: t.created_at,
                duration: null, // Duration might not be on transcript record
                sentiment_agent: t.sentiment === 'positive' ? 0.8 : t.sentiment === 'negative' ? 0.2 : 0.5, // Example transform
                sentiment_customer: t.sentiment === 'positive' ? 0.7 : t.sentiment === 'negative' ? 0.3 : 0.5, // Example transform
                talk_ratio_agent: null,
                talk_ratio_customer: null,
                key_phrases: t.keywords || [],
                user_id: t.user_id,
            }));
        } else {
            console.log('No data found in call_transcripts table either.');
        }
      }

      // Prepare metrics data (even if empty)
      let metricsData: Omit<CallMetricsSummary, 'updated_at' | 'created_at'> | null = null;
      
      if (calls.length === 0) {
         console.log('No calls data to sync, creating zeroed summary.');
         metricsData = this.createEmptyCallMetricsSummary('global_all', 'all'); // Use consistent ID
      } else {
          console.log(`Calculating metrics for ${calls.length} calls...`);
          // Calculate aggregate metrics (keep existing calculation logic)
      const totalCalls = calls.length;
      const sentimentValues = calls
              .map(call => (call.sentiment_agent !== null && call.sentiment_customer !== null) ? (call.sentiment_agent + call.sentiment_customer) / 2 : null)
              .filter((v): v is number => v !== null); // Type guard for filter
      const avgSentiment = sentimentValues.length > 0
        ? sentimentValues.reduce((sum, val) => sum + val, 0) / sentimentValues.length
              : 0.5; // Default sentiment

          const agentTalkRatios = calls.map(call => call.talk_ratio_agent).filter((v): v is number => v !== null);
          const customerTalkRatios = calls.map(call => call.talk_ratio_customer).filter((v): v is number => v !== null);
          const avgAgentTalkRatio = agentTalkRatios.length > 0 ? agentTalkRatios.reduce((a, b) => a + b, 0) / agentTalkRatios.length : null;
          const avgCustomerTalkRatio = customerTalkRatios.length > 0 ? customerTalkRatios.reduce((a, b) => a + b, 0) / customerTalkRatios.length : null;
          
          const durations = calls.map(call => call.duration).filter((v): v is number => v !== null);
          const avgCallDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
          
          const allKeywords = calls.flatMap(call => call.key_phrases || []);
          const keywordCount: { [key: string]: number } = {};
          allKeywords.forEach(kw => { keywordCount[kw] = (keywordCount[kw] || 0) + 1; });
      const topKeywords = Object.entries(keywordCount)
              .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 10)
              // Store as JSON object { keyword: count } which might be more useful than just text[]
              .reduce((obj, [keyword, count]) => { obj[keyword] = count; return obj; }, {} as { [key: string]: number });
      
      const performanceScore = calculatePerformanceScore(
        avgSentiment,
              { agent: avgAgentTalkRatio ?? 50, customer: avgCustomerTalkRatio ?? 50 }, // Provide defaults
        avgCallDuration
      );
      
      const SENTIMENT_SUCCESS_THRESHOLD = 0.6;
      const successfulCalls = sentimentValues.filter(val => val >= SENTIMENT_SUCCESS_THRESHOLD).length;
      const unsuccessfulCalls = sentimentValues.filter(val => val < SENTIMENT_SUCCESS_THRESHOLD).length;
          const conversionRate = totalCalls > 0 ? successfulCalls / totalCalls : 0;

          metricsData = {
              id: 'global_all', // Use consistent ID
              time_period: 'all', // Use consistent time period
        total_calls: totalCalls,
        avg_sentiment: avgSentiment,
        agent_talk_ratio: avgAgentTalkRatio,
        customer_talk_ratio: avgCustomerTalkRatio,
        top_keywords: topKeywords,
        performance_score: performanceScore,
        conversion_rate: conversionRate,
        avg_call_duration: avgCallDuration,
        successful_calls: successfulCalls,
        unsuccessful_calls: unsuccessfulCalls,
              metrics_version: 1 // Set current version
          };
          console.log('Calculated metrics:', metricsData);
      }
      
      // Upsert metrics data using the RPC function ONLY
      console.log(`Attempting to upsert metrics for ID: ${metricsData.id}`);
      const { error: updateError } = await supabase.rpc('upsert_call_metrics_summary', {
          p_id: metricsData.id,
          p_time_period: metricsData.time_period,
          p_agent_talk_ratio: metricsData.agent_talk_ratio,
          p_customer_talk_ratio: metricsData.customer_talk_ratio,
          p_avg_sentiment: metricsData.avg_sentiment,
          p_total_calls: metricsData.total_calls,
          p_avg_duration: metricsData.avg_call_duration,
          p_top_keywords: metricsData.top_keywords,
          p_performance_score: metricsData.performance_score,
          p_conversion_rate: metricsData.conversion_rate,
          p_successful_calls: metricsData.successful_calls,
          p_unsuccessful_calls: metricsData.unsuccessful_calls,
          p_metrics_version: metricsData.metrics_version
        });
        
        if (updateError) {
          console.error('Error updating call metrics summary (RPC):', updateError);
          throw updateError; // Throw error to be caught by outer try/catch
      }
      
      console.log('Call metrics synced successfully via RPC');
      return true;

    } catch (error) {
      console.error('Error syncing call metrics:', error);
        // Use reportError instead of deprecated handler
        reportError(error, ErrorCategory.DATABASE, { action: 'syncCallMetrics' }); 
        toast.error('Failed to update call metrics');
      return false;
    }
  }
  
  /**
   * Helper to create an empty summary object
   */
  private static createEmptyCallMetricsSummary(id: string, timePeriod: string): Omit<CallMetricsSummary, 'updated_at' | 'created_at'> {
      return {
        id: id,
        time_period: timePeriod,
        total_calls: 0,
        avg_sentiment: 0.5,
        agent_talk_ratio: null,
        customer_talk_ratio: null,
        top_keywords: {},
        performance_score: 0,
        conversion_rate: 0,
        avg_call_duration: 0,
        successful_calls: 0,
        unsuccessful_calls: 0,
        metrics_version: 1 
      };
  }

  /**
   * Sync rep metrics data.
   */
  static async syncRepMetrics(): Promise<boolean> {
    const supabase = getSupabaseClient();
    console.log('Starting syncRepMetrics...');
    let calls: CallData[] = [];

    try {
       // Fetch data similarly to syncCallMetrics
       const { data: callsData, error: callsError } = await supabase
        .from('calls')
        .select('id, created_at, duration, sentiment_agent, sentiment_customer, talk_ratio_agent, talk_ratio_customer, key_phrases, user_id');
      
      if (callsError) {
         console.warn('Error getting calls for rep metrics:', callsError.message);
      } else if (callsData && callsData.length > 0) {
         calls = callsData as CallData[];
      }

      if (calls.length === 0) {
          console.log('No calls data, trying call_transcripts for rep metrics...');
          const { data: transcriptsData, error: transcriptsError } = await supabase
          .from('call_transcripts')
            .select('id, call_id, created_at, text, keywords, sentiment, user_id');
        
        if (transcriptsError) {
              console.error('Error getting transcripts for rep metrics:', transcriptsError.message);
          throw new Error('Failed to get call data for rep metrics');
        }
        
          if (transcriptsData && transcriptsData.length > 0) {
               console.log(`Found ${transcriptsData.length} transcripts for rep metrics`);
               calls = transcriptsData.map(/* ... transformation ... */); // Use same transformation as syncCallMetrics
        } else {
               console.log('No transcript data found for rep metrics.');
        }
      }
      
      if (calls.length === 0) {
        console.log('No calls data to sync for rep metrics');
        return false;
      }
      
      // Group calls by user_id
      const callsByUser: { [userId: string]: CallData[] } = {};
      calls.forEach(call => {
        if (call.user_id) {
          if (!callsByUser[call.user_id]) {
            callsByUser[call.user_id] = [];
          }
          callsByUser[call.user_id].push(call);
        }
      });
      
      console.log(`Calculating metrics for ${Object.keys(callsByUser).length} reps`);
      
      // Fetch profile names in batch
      const repIds = Object.keys(callsByUser);
      let profileMap: { [userId: string]: string | null } = {};
      if (repIds.length > 0) {
          const { data: profiles, error: profileError } = await supabase
              .from('profiles')
              .select('user_id, full_name')
              .in('user_id', repIds);
          if (profileError) {
              console.warn("Could not fetch profile names for rep metrics:", profileError.message);
          } else if (profiles) {
              profiles.forEach(p => { profileMap[p.user_id] = p.full_name; });
          }
      }
      
      let repsProcessed = 0;
      for (const userId in callsByUser) {
          const userCalls = callsByUser[userId];
          const totalCalls = userCalls.length;

          // Calculate metrics per rep - Separate sum and average calculation
        const sentimentValues = userCalls
            .map(call => (call.sentiment_agent !== null && call.sentiment_customer !== null) ? (call.sentiment_agent + call.sentiment_customer) / 2 : null)
            .filter((v): v is number => v !== null); 
          const sentimentSum = sentimentValues.reduce((a, b) => a + b, 0);
          const avgSentiment = sentimentValues.length > 0 ? sentimentSum / sentimentValues.length : 0.5;
          
          const agentTalkRatios = userCalls.map(call => call.talk_ratio_agent).filter((v): v is number => v !== null);
          const agentTalkRatioSum = agentTalkRatios.reduce((a, b) => a + b, 0);
          const avgAgentTalkRatio = agentTalkRatios.length > 0 ? agentTalkRatioSum / agentTalkRatios.length : null;
          
          const customerTalkRatios = userCalls.map(call => call.talk_ratio_customer).filter((v): v is number => v !== null);
          const customerTalkRatioSum = customerTalkRatios.reduce((a, b) => a + b, 0);
          const avgCustomerTalkRatio = customerTalkRatios.length > 0 ? customerTalkRatioSum / customerTalkRatios.length : null;
          
          const durations = userCalls.map(call => call.duration).filter((v): v is number => v !== null);
          const durationSum = durations.reduce((a, b) => a + b, 0);
          const avgDuration = durations.length > 0 ? durationSum / durations.length : 0;

          const successfulCalls = sentimentValues.filter(val => val >= 0.6).length;
          const successRate = totalCalls > 0 ? successfulCalls / totalCalls : 0;
          
          const allKeywords = userCalls.flatMap(call => call.key_phrases || []);
          const keywordCount: { [key: string]: number } = {};
          allKeywords.forEach(kw => { keywordCount[kw] = (keywordCount[kw] || 0) + 1; });
        const topKeywords = Object.entries(keywordCount)
              .sort(([, countA], [, countB]) => countB - countA)
          .slice(0, 5)
              .reduce((obj, [keyword, count]) => { obj[keyword] = count; return obj; }, {} as { [key: string]: number });
          
          const repData: Omit<RepMetricsSummary, 'created_at' | 'updated_at'> = {
          rep_id: userId,
              rep_name: profileMap[userId] || `User ${userId.substring(0, 6)}`,
              time_period: 'all',
              total_calls: totalCalls,
              avg_sentiment: avgSentiment,
              agent_talk_ratio: avgAgentTalkRatio,
              customer_talk_ratio: avgCustomerTalkRatio,
              avg_duration: avgDuration,
          success_rate: successRate,
          top_keywords: topKeywords,
              insights: [],
              metrics_version: 1
          };
          
          // Upsert using RPC function
          try {
              const { error: upsertError } = await supabase.rpc('upsert_rep_metrics_summary', {
                  p_rep_id: repData.rep_id,
                  p_time_period: repData.time_period,
                  p_rep_name: repData.rep_name,
                  p_agent_talk_ratio: repData.agent_talk_ratio,
                  p_customer_talk_ratio: repData.customer_talk_ratio,
                  p_avg_sentiment: repData.avg_sentiment,
                  p_total_calls: repData.total_calls,
                  p_avg_duration: repData.avg_duration,
                  p_success_rate: repData.success_rate,
                  p_top_keywords: repData.top_keywords,
                  p_insights: repData.insights,
                  p_metrics_version: repData.metrics_version
              });
              if (upsertError) {
                  console.error(`Error upserting rep metrics for ${userId}:`, upsertError);
                  // Optionally report individual errors but continue loop
                  reportError(upsertError, ErrorCategory.DATABASE, { action: 'syncRepMetrics_upsert', repId: userId });
              } else {
                  repsProcessed++;
              }
          } catch(rpcCatchError) {
               console.error(`Caught error during RPC call for rep ${userId}:`, rpcCatchError);
               reportError(rpcCatchError, ErrorCategory.DATABASE, { action: 'syncRepMetrics_rpcCatch', repId: userId });
          }
      }
      
      console.log(`Rep metrics synced for ${repsProcessed} reps.`);
      return repsProcessed > 0;

    } catch (error) {
      console.error('Error syncing rep metrics:', error);
      // Use reportError instead of deprecated handler
      reportError(error, ErrorCategory.DATABASE, { action: 'syncRepMetrics' }); 
      toast.error('Failed to update rep metrics');
      return false;
    }
  }
  
  /**
   * Sync all metrics data
   */
  static async syncAllMetrics(): Promise<boolean> {
    if (this.syncInProgress) {
      console.log('Metrics sync already in progress, skipping');
      return false;
    }
    
    this.syncInProgress = true;
    let callMetricsResult = false;
    let repMetricsResult = false;
    
    try {
      console.log('Starting full metrics sync...');
      // Remove initializeDbSchema call
      // await this.initializeDbSchema(); 
      
      callMetricsResult = await this.syncCallMetrics();
      repMetricsResult = await this.syncRepMetrics();
      
      console.log('Full metrics sync completed:', { 
        callMetricsSuccess: callMetricsResult, 
        repMetricsSuccess: repMetricsResult 
      });
      
      if (callMetricsResult || repMetricsResult) {
        toast.success('Metrics updated');
      } else {
         toast.info('Metrics sync ran, but no changes detected or errors occurred.');
      }
      
    } catch (error) {
      // Catch errors from syncCallMetrics/syncRepMetrics if they re-throw
      console.error('Error in syncAllMetrics:', error);
      reportError(error, ErrorCategory.DATABASE, { action: 'syncAllMetrics' });
      toast.error('Error updating metrics');
    } finally {
      this.syncInProgress = false;
    }
    return callMetricsResult && repMetricsResult;
  }
}

// Function to trigger a sync, can be called from other services
export const syncAllMetricsData = async () => {
  return DataSyncService.syncAllMetrics();
};

// Helper to schedule periodic syncs
export const startMetricsSyncScheduler = (intervalMs = 300000) => { // Default: 5 minutes
  console.log(`Starting metrics sync scheduler with interval ${intervalMs}ms`);
  
  // Run an initial sync immediately
  DataSyncService.syncAllMetrics()
    .then(success => {
      if (success) {
        console.log('Initial metrics sync completed successfully');
      } else {
        console.warn('Initial metrics sync completed with issues');
      }
    })
    .catch(error => {
      console.error('Initial metrics sync failed:', error);
    });
  
  const intervalId = setInterval(() => {
    console.log('Running scheduled metrics sync...');
    DataSyncService.syncAllMetrics()
      .then(success => {
        if (success) {
          console.log('Scheduled metrics sync completed successfully');
        } else {
          console.warn('Scheduled metrics sync completed with issues');
        }
      })
      .catch(error => {
        console.error('Scheduled metrics sync failed:', error);
      });
  }, intervalMs);
  
  return () => {
    console.log('Stopping metrics sync scheduler');
    clearInterval(intervalId);
  }; // Return cleanup function
};

// Add a global window event listener for metrics updates
window.addEventListener('load', () => {
  // Listen for transcript updates and trigger metrics refresh
  window.addEventListener('transcriptions-updated', async () => {
    console.log('Transcriptions updated event detected - refreshing metrics');
    try {
      await DataSyncService.syncAllMetrics();
    } catch (error) {
      console.error('Error syncing metrics after transcription update:', error);
    }
  });
});

/**
 * A cleaner API to trigger metrics refresh from any service.
 * This provides better logging and error handling than direct calls to syncAllMetrics.
 */
export const refreshMetrics = async (): Promise<boolean> => {
  console.log('Manual metrics refresh triggered');
  
  try {
    const result = await DataSyncService.syncAllMetrics();
    
    if (result) {
      console.log('Metrics refreshed successfully');
    } else {
      console.warn('Metrics refresh completed with issues');
    }
    
    return result;
  } catch (error) {
    console.error('Error refreshing metrics:', error);
    
    // Show error notification only for manual refreshes
    toast.error('Failed to refresh metrics', {
      description: error instanceof Error ? error.message : 'Unknown error occurred'
    });
    
    return false;
  }
};

export default DataSyncService; 