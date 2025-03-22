import { supabase } from "@/integrations/supabase/client";
import { calculatePerformanceScore } from "./SharedDataService";
import { errorHandler } from "./ErrorHandlingService";
import { toast } from "sonner";

// Define types for our tables
interface CallMetricsSummary {
  id: string;
  total_calls: number;
  avg_sentiment: number;
  agent_talk_ratio: number;
  customer_talk_ratio: number;
  top_keywords: string[];
  performance_score: number;
  conversion_rate: number;
  avg_call_duration: number;
  successful_calls: number;
  unsuccessful_calls: number;
  time_period: string;
  updated_at: string;
}

interface RepMetricsSummary {
  rep_id: string;
  rep_name: string;
  call_volume: number;
  success_rate: number;
  sentiment_score: number;
  top_keywords: string[];
  insights: string[];
  time_period: string;
  updated_at: string;
}

// Using any to bypass TypeScript's type checking for Supabase RPC and upsert operations
// This is needed because the database structure changes during runtime
type SupabaseAny = any;

/**
 * Service responsible for keeping data in sync between primary tables and summary tables.
 * This ensures that all components get their data from the same source.
 */
export class DataSyncService {
  // Track database initialization state
  private static isDbInitialized = false;
  private static syncInProgress = false;

  /**
   * Initialize the database schema
   */
  static async initializeDbSchema() {
    if (this.isDbInitialized) return true;

    console.log('Initializing DataSyncService database schema...');
    try {
      // Create call_metrics_summary table if it doesn't exist
      const createTableResult = await (supabase.rpc as SupabaseAny)('execute_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS call_metrics_summary (
            id TEXT PRIMARY KEY,
            total_calls INTEGER,
            avg_sentiment FLOAT,
            agent_talk_ratio FLOAT,
            customer_talk_ratio FLOAT,
            top_keywords TEXT[],
            performance_score FLOAT,
            conversion_rate FLOAT,
            avg_call_duration FLOAT,
            successful_calls INTEGER,
            unsuccessful_calls INTEGER,
            time_period TEXT,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
          );
        `
      });

      // Create RPC function for upserting metrics
      const createFunctionResult = await (supabase.rpc as SupabaseAny)('execute_sql', {
        sql_query: `
          CREATE OR REPLACE FUNCTION upsert_call_metrics_summary(
            p_id TEXT,
            p_total_calls INTEGER,
            p_avg_sentiment FLOAT,
            p_agent_talk_ratio FLOAT,
            p_customer_talk_ratio FLOAT,
            p_top_keywords TEXT[],
            p_performance_score FLOAT,
            p_conversion_rate FLOAT,
            p_avg_call_duration FLOAT,
            p_successful_calls INTEGER,
            p_unsuccessful_calls INTEGER,
            p_time_period TEXT
          )
          RETURNS VOID
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          BEGIN
            INSERT INTO call_metrics_summary (
              id, 
              total_calls, 
              avg_sentiment, 
              agent_talk_ratio, 
              customer_talk_ratio, 
              top_keywords, 
              performance_score, 
              conversion_rate, 
              avg_call_duration, 
              successful_calls, 
              unsuccessful_calls, 
              time_period,
              updated_at
            )
            VALUES (
              p_id, 
              p_total_calls, 
              p_avg_sentiment, 
              p_agent_talk_ratio, 
              p_customer_talk_ratio, 
              p_top_keywords, 
              p_performance_score, 
              p_conversion_rate, 
              p_avg_call_duration, 
              p_successful_calls, 
              p_unsuccessful_calls, 
              p_time_period,
              now()
            )
            ON CONFLICT (id)
            DO UPDATE SET
              total_calls = p_total_calls,
              avg_sentiment = p_avg_sentiment,
              agent_talk_ratio = p_agent_talk_ratio,
              customer_talk_ratio = p_customer_talk_ratio,
              top_keywords = p_top_keywords,
              performance_score = p_performance_score,
              conversion_rate = p_conversion_rate,
              avg_call_duration = p_avg_call_duration,
              successful_calls = p_successful_calls,
              unsuccessful_calls = p_unsuccessful_calls,
              time_period = p_time_period,
              updated_at = now();
          END;
          $$;
        `
      });

      this.isDbInitialized = true;
      console.log('DataSyncService database schema initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize DataSyncService database schema:', error);
      return false;
    }
  }

  /**
   * Sync call metrics data from primary tables to summary tables
   */
  static async syncCallMetrics() {
    try {
      await this.initializeDbSchema();
      
      console.log('Starting syncCallMetrics...');
      
      // Start by trying the 'calls' table
      let { data: calls, error: callsError } = await supabase
        .from('calls')
        .select('*');
      
      if (callsError) {
        console.warn('Error getting data from calls table:', callsError);
        console.log('Trying call_transcripts table instead...');
        calls = [];
      }
      
      // If calls is empty, try the call_transcripts table
      if (!calls || calls.length === 0) {
        const { data: transcripts, error: transcriptsError } = await supabase
          .from('call_transcripts')
          .select('*');
        
        if (transcriptsError) {
          console.error('Error getting data from call_transcripts table:', transcriptsError);
          throw new Error('Failed to get call data from either calls or call_transcripts table');
        }
        
        // If we have transcripts, transform them to match the expected format
        if (transcripts && transcripts.length > 0) {
          console.log(`Found ${transcripts.length} records in call_transcripts table`);
          
          // Transform call_transcripts schema to match calls schema
          calls = transcripts.map(transcript => ({
            id: transcript.id,
            created_at: transcript.created_at,
            duration: transcript.duration || 0,
            // Map sentiment field from the transcript
            sentiment_agent: transcript.sentiment === 'positive' ? 0.8 :
                           transcript.sentiment === 'negative' ? 0.3 : 0.5,
            sentiment_customer: transcript.sentiment === 'positive' ? 0.7 :
                              transcript.sentiment === 'negative' ? 0.4 : 0.6,
            // Default talk ratio
            talk_ratio_agent: 50,
            talk_ratio_customer: 50,
            // Map keyword array
            key_phrases: transcript.keywords || [],
            user_id: transcript.user_id,
            // Add missing required properties with default values
            speaking_speed: 0,
            filler_word_count: 0,
            objection_count: 0,
            customer_engagement: 0.5
          })) as any; // Use type assertion since we're creating data to match schema
          
          console.log(`Transformed ${calls.length} call_transcripts records to calls format`);
        } else {
          console.log('No data found in call_transcripts table');
          calls = [];
        }
      } else {
        console.log(`Found ${calls.length} records in calls table`);
      }
      
      if (!calls || calls.length === 0) {
        console.log('No calls data to sync');
        // Create a default "no data" entry in the metrics summary
        await this.createNoDataMetricsSummary();
        return false;
      }
      
      // Calculate aggregate metrics
      const totalCalls = calls.length;
      
      // Calculate average sentiment
      const sentimentValues = calls
        .map(call => (call.sentiment_agent + call.sentiment_customer) / 2)
        .filter(Boolean);
      const avgSentiment = sentimentValues.length > 0
        ? sentimentValues.reduce((sum, val) => sum + val, 0) / sentimentValues.length
        : 0.5;
      
      // Calculate average talk ratio
      const agentTalkRatios = calls
        .map(call => call.talk_ratio_agent)
        .filter(Boolean);
      const customerTalkRatios = calls
        .map(call => call.talk_ratio_customer)
        .filter(Boolean);
      
      const avgAgentTalkRatio = agentTalkRatios.length > 0
        ? agentTalkRatios.reduce((sum, val) => sum + val, 0) / agentTalkRatios.length
        : 50;
      const avgCustomerTalkRatio = customerTalkRatios.length > 0
        ? customerTalkRatios.reduce((sum, val) => sum + val, 0) / customerTalkRatios.length
        : 50;
      
      // Calculate average call duration
      const durations = calls
        .map(call => call.duration)
        .filter(Boolean);
      const avgCallDuration = durations.length > 0
        ? durations.reduce((sum, val) => sum + val, 0) / durations.length
        : 0;
      
      // Extract keywords
      const allKeywords = calls
        .flatMap(call => call.key_phrases || []);
      
      // Get top keywords by frequency
      const keywordCount = allKeywords.reduce((acc, keyword) => {
        acc[keyword] = (acc[keyword] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topKeywords = Object.entries(keywordCount)
        .sort((a, b) => Number(b[1]) - Number(a[1])) // Cast to Number for TS
        .slice(0, 10)
        .map(([keyword]) => keyword);
      
      // Calculate performance score
      const performanceScore = calculatePerformanceScore(
        avgSentiment,
        { agent: avgAgentTalkRatio, customer: avgCustomerTalkRatio },
        avgCallDuration
      );
      
      // Count successful and unsuccessful calls (sentiment above/below threshold)
      const SENTIMENT_SUCCESS_THRESHOLD = 0.6;
      const successfulCalls = sentimentValues.filter(val => val >= SENTIMENT_SUCCESS_THRESHOLD).length;
      const unsuccessfulCalls = sentimentValues.filter(val => val < SENTIMENT_SUCCESS_THRESHOLD).length;
      
      // Calculate conversion rate
      const conversionRate = totalCalls > 0 
        ? successfulCalls / totalCalls
        : 0;
      
      // Create data object for the summary table
      const metricsData: CallMetricsSummary = {
        id: 'global', // Use a fixed ID for the global metrics
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
        time_period: 'all_time',
        updated_at: new Date().toISOString()
      };
      
      console.log('Calculated metrics:', {
        total_calls: totalCalls,
        avg_sentiment: avgSentiment,
        performance_score: performanceScore,
        top_keywords: topKeywords.slice(0, 3) // Log just the first 3 for brevity
      });
      
      // Update call_metrics_summary table using the RPC function
      try {
        const { error: updateError } = await (supabase.rpc as SupabaseAny)('upsert_call_metrics_summary', {
          p_id: metricsData.id,
          p_total_calls: metricsData.total_calls,
          p_avg_sentiment: metricsData.avg_sentiment,
          p_agent_talk_ratio: metricsData.agent_talk_ratio,
          p_customer_talk_ratio: metricsData.customer_talk_ratio,
          p_top_keywords: metricsData.top_keywords,
          p_performance_score: metricsData.performance_score,
          p_conversion_rate: metricsData.conversion_rate,
          p_avg_call_duration: metricsData.avg_call_duration,
          p_successful_calls: metricsData.successful_calls,
          p_unsuccessful_calls: metricsData.unsuccessful_calls,
          p_time_period: metricsData.time_period
        });
        
        if (updateError) {
          console.error('Error updating call metrics summary (RPC):', updateError);
          throw updateError;
        }
        
        console.log('Call metrics synced successfully via RPC');
      } catch (rpcError) {
        console.error('RPC update failed, falling back to direct SQL:', rpcError);
        
        // Use SQL directly to bypass type checking
        try {
          // Format array for SQL with proper escaping
          const keywordsArrayStr = topKeywords.length > 0 
            ? `ARRAY['${topKeywords.join("','")}']` 
            : 'ARRAY[]::TEXT[]';
          
          const { error: sqlError } = await (supabase.rpc as SupabaseAny)('execute_sql', {
            sql_query: `
              INSERT INTO call_metrics_summary (
                id, total_calls, avg_sentiment, agent_talk_ratio, customer_talk_ratio, 
                top_keywords, performance_score, conversion_rate, avg_call_duration, 
                successful_calls, unsuccessful_calls, time_period, updated_at
              ) VALUES (
                '${metricsData.id}', ${metricsData.total_calls}, ${metricsData.avg_sentiment}, 
                ${metricsData.agent_talk_ratio}, ${metricsData.customer_talk_ratio}, 
                ${keywordsArrayStr}, ${metricsData.performance_score}, ${metricsData.conversion_rate}, 
                ${metricsData.avg_call_duration}, ${metricsData.successful_calls}, 
                ${metricsData.unsuccessful_calls}, '${metricsData.time_period}', NOW()
              )
              ON CONFLICT (id) DO UPDATE SET
                total_calls = ${metricsData.total_calls},
                avg_sentiment = ${metricsData.avg_sentiment},
                agent_talk_ratio = ${metricsData.agent_talk_ratio},
                customer_talk_ratio = ${metricsData.customer_talk_ratio},
                top_keywords = ${keywordsArrayStr},
                performance_score = ${metricsData.performance_score},
                conversion_rate = ${metricsData.conversion_rate},
                avg_call_duration = ${metricsData.avg_call_duration},
                successful_calls = ${metricsData.successful_calls},
                unsuccessful_calls = ${metricsData.unsuccessful_calls},
                time_period = '${metricsData.time_period}',
                updated_at = NOW();
            `
          });
          
          if (sqlError) {
            console.error('Error with direct SQL execution:', sqlError);
            throw sqlError;
          }
          
          console.log('Call metrics synced successfully via direct SQL');
        } catch (sqlErr) {
          console.error('Error updating call metrics summary (direct SQL):', sqlErr);
          throw sqlErr;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error syncing call metrics:', error);
      errorHandler.handle('Failed to sync call metrics');
      
      // Show a toast notification about the error
      toast.error('Failed to update metrics', {
        description: 'Check the console for more details.'
      });
      
      return false;
    }
  }
  
  /**
   * Create a default "no data" entry when no calls are available
   */
  private static async createNoDataMetricsSummary() {
    try {
      const noDataMetrics: CallMetricsSummary = {
        id: 'global',
        total_calls: 0,
        avg_sentiment: 0.5,
        agent_talk_ratio: 50,
        customer_talk_ratio: 50,
        top_keywords: [],
        performance_score: 0,
        conversion_rate: 0,
        avg_call_duration: 0,
        successful_calls: 0,
        unsuccessful_calls: 0,
        time_period: 'all_time',
        updated_at: new Date().toISOString()
      };
      
      // Use SQL directly to bypass type checking for non-standard tables
      await (supabase.rpc as SupabaseAny)('execute_sql', {
        sql_query: `
          INSERT INTO call_metrics_summary (
            id, total_calls, avg_sentiment, agent_talk_ratio, customer_talk_ratio, 
            top_keywords, performance_score, conversion_rate, avg_call_duration, 
            successful_calls, unsuccessful_calls, time_period, updated_at
          ) VALUES (
            '${noDataMetrics.id}', ${noDataMetrics.total_calls}, ${noDataMetrics.avg_sentiment}, 
            ${noDataMetrics.agent_talk_ratio}, ${noDataMetrics.customer_talk_ratio}, 
            '{}', ${noDataMetrics.performance_score}, ${noDataMetrics.conversion_rate}, 
            ${noDataMetrics.avg_call_duration}, ${noDataMetrics.successful_calls}, 
            ${noDataMetrics.unsuccessful_calls}, '${noDataMetrics.time_period}', NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            total_calls = ${noDataMetrics.total_calls},
            avg_sentiment = ${noDataMetrics.avg_sentiment},
            agent_talk_ratio = ${noDataMetrics.agent_talk_ratio},
            customer_talk_ratio = ${noDataMetrics.customer_talk_ratio},
            top_keywords = '{}',
            performance_score = ${noDataMetrics.performance_score},
            conversion_rate = ${noDataMetrics.conversion_rate},
            avg_call_duration = ${noDataMetrics.avg_call_duration},
            successful_calls = ${noDataMetrics.successful_calls},
            unsuccessful_calls = ${noDataMetrics.unsuccessful_calls},
            time_period = '${noDataMetrics.time_period}',
            updated_at = NOW();
        `
      });
      
      console.log('Created no-data metrics entry');
    } catch (error) {
      console.error('Failed to create no-data metrics:', error);
    }
  }
  
  /**
   * Sync rep metrics data from primary tables to summary tables
   */
  static async syncRepMetrics() {
    try {
      await this.initializeDbSchema();
      
      console.log('Starting syncRepMetrics...');
      
      // Start by trying the 'calls' table
      let { data: calls, error: callsError } = await supabase
        .from('calls')
        .select('*');
      
      if (callsError) {
        console.warn('Error getting data from calls table for rep metrics:', callsError);
        console.log('Trying call_transcripts table instead...');
        calls = [];
      }
      
      // If calls is empty, try the call_transcripts table
      if (!calls || calls.length === 0) {
        const { data: transcripts, error: transcriptsError } = await supabase
          .from('call_transcripts')
          .select('*');
        
        if (transcriptsError) {
          console.error('Error getting data from call_transcripts table for rep metrics:', transcriptsError);
          throw new Error('Failed to get call data for rep metrics');
        }
        
        // If we have transcripts, transform them to match the expected format
        if (transcripts && transcripts.length > 0) {
          console.log(`Found ${transcripts.length} records in call_transcripts table for rep metrics`);
          
          // Transform call_transcripts schema to match calls schema
          calls = transcripts.map(transcript => ({
            id: transcript.id,
            created_at: transcript.created_at,
            duration: transcript.duration || 0,
            // Map sentiment field from the transcript
            sentiment_agent: transcript.sentiment === 'positive' ? 0.8 :
                           transcript.sentiment === 'negative' ? 0.3 : 0.5,
            sentiment_customer: transcript.sentiment === 'positive' ? 0.7 :
                              transcript.sentiment === 'negative' ? 0.4 : 0.6,
            // Default talk ratio
            talk_ratio_agent: 50,
            talk_ratio_customer: 50,
            // Map keyword array
            key_phrases: transcript.keywords || [],
            user_id: transcript.user_id,
            // Add missing required properties with default values
            speaking_speed: 0,
            filler_word_count: 0,
            objection_count: 0,
            customer_engagement: 0.5
          })) as any; // Use type assertion since we're creating data to match schema
          
          console.log(`Transformed ${calls.length} call_transcripts records to calls format for rep metrics`);
        } else {
          console.log('No data found in call_transcripts table for rep metrics');
          calls = [];
        }
      } else {
        console.log(`Found ${calls.length} records in calls table for rep metrics`);
      }
      
      if (!calls || calls.length === 0) {
        console.log('No calls data to sync for rep metrics');
        return false;
      }
      
      // Group calls by user_id
      const callsByUser: Record<string, any[]> = {};
      calls.forEach(call => {
        if (call.user_id) {
          if (!callsByUser[call.user_id]) {
            callsByUser[call.user_id] = [];
          }
          callsByUser[call.user_id].push(call);
        }
      });
      
      // Calculate metrics for each rep
      const repMetrics: RepMetricsSummary[] = Object.entries(callsByUser).map(([userId, userCalls]) => {
        // Total calls for this rep
        const callVolume = userCalls.length;
        
        // Calculate success rate (calls with positive sentiment)
        const SENTIMENT_SUCCESS_THRESHOLD = 0.6;
        const successfulCalls = userCalls.filter(call => 
          ((call.sentiment_agent + call.sentiment_customer) / 2) >= SENTIMENT_SUCCESS_THRESHOLD
        ).length;
        const successRate = callVolume > 0 ? successfulCalls / callVolume : 0;
        
        // Calculate average sentiment
        const sentimentValues = userCalls
          .map(call => (call.sentiment_agent + call.sentiment_customer) / 2)
          .filter(Boolean);
        const avgSentiment = sentimentValues.length > 0
          ? sentimentValues.reduce((sum, val) => sum + val, 0) / sentimentValues.length
          : 0.5;
        
        // Extract keywords
        const allKeywords = userCalls
          .flatMap(call => call.key_phrases || []);
        
        // Get top keywords by frequency
        const keywordCount = allKeywords.reduce((acc: Record<string, number>, keyword: string) => {
          acc[keyword] = (acc[keyword] || 0) + 1;
          return acc;
        }, {});
        
        const topKeywords = Object.entries(keywordCount)
          .sort((a, b) => Number(b[1]) - Number(a[1])) // Cast to Number for TS
          .slice(0, 5)
          .map(([keyword]) => keyword);
        
        // Generate insights based on the data
        const insights = [];
        
        if (successRate > 0.8) {
          insights.push('High success rate on calls');
        } else if (successRate < 0.4) {
          insights.push('Could improve success rate on calls');
        }
        
        if (avgSentiment > 0.7) {
          insights.push('Maintains positive customer sentiment');
        } else if (avgSentiment < 0.4) {
          insights.push('Work on improving customer sentiment');
        }
        
        // Get rep name from first call
        const repName = userCalls[0]?.sales_rep_name || `Rep ${userId}`;
        
        return {
          rep_id: userId,
          rep_name: repName,
          call_volume: callVolume,
          success_rate: successRate,
          sentiment_score: avgSentiment,
          top_keywords: topKeywords,
          insights: insights,
          time_period: 'all_time',
          updated_at: new Date().toISOString()
        };
      });
      
      console.log(`Calculated metrics for ${repMetrics.length} reps`);
      
      // Update rep_metrics_summary table
      if (repMetrics.length > 0) {
        try {
          // Check if the table exists first
          try {
            await (supabase.rpc as SupabaseAny)('execute_sql', {
              sql_query: `
                CREATE TABLE IF NOT EXISTS rep_metrics_summary (
                  rep_id TEXT PRIMARY KEY,
                  rep_name TEXT,
                  call_volume INTEGER,
                  success_rate FLOAT,
                  sentiment_score FLOAT,
                  top_keywords TEXT[],
                  insights TEXT[],
                  time_period TEXT,
                  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
                );
              `
            });
          } catch (tableError) {
            console.warn('Error creating rep_metrics_summary table:', tableError);
          }
          
          // Use direct SQL instead of typed methods to bypass type checking
          for (const repMetric of repMetrics) {
            try {
              // Format arrays for SQL with proper escaping
              const keywordsArrayStr = repMetric.top_keywords.length > 0 
                ? `ARRAY['${repMetric.top_keywords.join("','")}']` 
                : 'ARRAY[]::TEXT[]';
                
              const insightsArrayStr = repMetric.insights.length > 0 
                ? `ARRAY['${repMetric.insights.join("','")}']` 
                : 'ARRAY[]::TEXT[]';
              
              // Use SQL to insert/update rep metrics
              await (supabase.rpc as SupabaseAny)('execute_sql', {
                sql_query: `
                  INSERT INTO rep_metrics_summary (
                    rep_id, rep_name, call_volume, success_rate, sentiment_score, 
                    top_keywords, insights, time_period, updated_at
                  ) VALUES (
                    '${repMetric.rep_id}', '${repMetric.rep_name.replace(/'/g, "''")}', 
                    ${repMetric.call_volume}, ${repMetric.success_rate}, ${repMetric.sentiment_score}, 
                    ${keywordsArrayStr}, ${insightsArrayStr}, 
                    '${repMetric.time_period}', NOW()
                  )
                  ON CONFLICT (rep_id) DO UPDATE SET
                    rep_name = '${repMetric.rep_name.replace(/'/g, "''")}',
                    call_volume = ${repMetric.call_volume},
                    success_rate = ${repMetric.success_rate},
                    sentiment_score = ${repMetric.sentiment_score},
                    top_keywords = ${keywordsArrayStr},
                    insights = ${insightsArrayStr},
                    time_period = '${repMetric.time_period}',
                    updated_at = NOW();
                `
              });
            } catch (repError) {
              console.error(`Error upserting rep metrics for ${repMetric.rep_id}:`, repError);
            }
          }
          
          console.log('Rep metrics synced successfully');
        } catch (error) {
          console.error('Error syncing rep metrics:', error);
          throw error;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error syncing rep metrics:', error);
      errorHandler.handle('Failed to sync rep metrics');
      return false;
    }
  }
  
  /**
   * Sync all metrics data
   */
  static async syncAllMetrics() {
    if (this.syncInProgress) {
      console.log('Metrics sync already in progress, skipping');
      return false;
    }
    
    this.syncInProgress = true;
    
    try {
      console.log('Starting full metrics sync...');
      await this.initializeDbSchema();
      
      const callMetricsResult = await this.syncCallMetrics();
      const repMetricsResult = await this.syncRepMetrics();
      
      console.log('Full metrics sync completed:', { 
        callMetricsSuccess: callMetricsResult, 
        repMetricsSuccess: repMetricsResult 
      });
      
      // Show a success toast only if at least one metrics sync was successful
      if (callMetricsResult || repMetricsResult) {
        toast.success('Metrics updated', {
          description: 'All metrics have been refreshed with the latest data.'
        });
      }
      
      this.syncInProgress = false;
      return callMetricsResult && repMetricsResult;
    } catch (error) {
      console.error('Error in syncAllMetrics:', error);
      toast.error('Error updating metrics', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
      
      this.syncInProgress = false;
      return false;
    }
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