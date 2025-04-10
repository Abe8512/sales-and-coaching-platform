import { supabase } from "@/integrations/supabase/client";
import { errorHandler } from "@/services/ErrorHandlingService";
import { logger } from "@/services/LoggingService";
import { Database } from "@/integrations/supabase/types";
import { 
  CallMetrics, 
  RepMetrics, 
  MetricsFilter, 
  MetricsTimeSeries,
  DashboardMetrics
} from "@/types/metrics";

// Types for database tables
type CallMetricsSummary = Database['public']['Tables']['call_metrics_summary']['Row'];
type RepMetricsSummary = Database['public']['Tables']['rep_metrics_summary']['Row'];
type Call = Database['public']['Tables']['calls']['Row'];

/**
 * Repository for accessing metrics data in the database
 * This provides a single access point for all metrics database operations
 */
export class MetricsRepository {
  private static instance: MetricsRepository;
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    logger.info("MetricsRepository initialized");
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MetricsRepository {
    if (!MetricsRepository.instance) {
      MetricsRepository.instance = new MetricsRepository();
    }
    return MetricsRepository.instance;
  }
  
  /**
   * Get global metrics from call_metrics_summary table
   */
  public async getGlobalMetrics(): Promise<CallMetricsSummary | null> {
    try {
      const { data, error } = await supabase
        .from("call_metrics_summary")
        .select("*")
        .eq("id", "global")
        .single();
      
      if (error) {
        throw new Error(`Failed to fetch global metrics: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      errorHandler.handleError({
        message: "Failed to get global metrics from database",
        technical: error,
        severity: "error",
        code: "DB_FETCH_GLOBAL_METRICS_ERROR"
      }, "MetricsRepository");
      
      return null;
    }
  }
  
  /**
   * Get metrics for a specific rep
   */
  public async getRepMetrics(repId: string): Promise<RepMetricsSummary | null> {
    try {
      const { data, error } = await supabase
        .from("rep_metrics_summary")
        .select("*")
        .eq("rep_id", repId)
        .single();
      
      if (error) {
        throw new Error(`Failed to fetch rep metrics: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      errorHandler.handleError({
        message: `Failed to get rep metrics for rep: ${repId}`,
        technical: error,
        severity: "error",
        code: "DB_FETCH_REP_METRICS_ERROR"
      }, "MetricsRepository");
      
      return null;
    }
  }
  
  /**
   * Get metrics for all reps
   */
  public async getAllRepMetrics(): Promise<RepMetricsSummary[]> {
    try {
      const { data, error } = await supabase
        .from("rep_metrics_summary")
        .select("*");
      
      if (error) {
        throw new Error(`Failed to fetch all rep metrics: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      errorHandler.handleError({
        message: "Failed to get all rep metrics",
        technical: error,
        severity: "error",
        code: "DB_FETCH_ALL_REP_METRICS_ERROR"
      }, "MetricsRepository");
      
      return [];
    }
  }
  
  /**
   * Get metrics for a specific call
   */
  public async getCallMetrics(callId: string): Promise<Call | null> {
    try {
      const { data, error } = await supabase
        .from("calls")
        .select("*")
        .eq("id", callId)
        .single();
      
      if (error) {
        throw new Error(`Failed to fetch call metrics: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      errorHandler.handleError({
        message: `Failed to get metrics for call: ${callId}`,
        technical: error,
        severity: "error",
        code: "DB_FETCH_CALL_METRICS_ERROR"
      }, "MetricsRepository");
      
      return null;
    }
  }
  
  /**
   * Update call metrics in the calls table
   */
  public async updateCallMetrics(callId: string, metrics: Partial<Call>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("calls")
        .update(metrics)
        .eq("id", callId);
      
      if (error) {
        throw new Error(`Failed to update call metrics: ${error.message}`);
      }
      
      return true;
    } catch (error) {
      errorHandler.handleError({
        message: `Failed to update metrics for call: ${callId}`,
        technical: error,
        severity: "error",
        code: "DB_UPDATE_CALL_METRICS_ERROR"
      }, "MetricsRepository");
      
      return false;
    }
  }
  
  /**
   * Batch update call metrics in the calls table
   */
  public async batchUpdateCallMetrics(updates: Array<{ id: string, metrics: Partial<Call> }>): Promise<boolean> {
    if (!updates.length) return true;
    
    try {
      // Prepare data for upsert operation
      const upsertData = updates.map(update => ({
        id: update.id,
        ...update.metrics
      }));
      
      const { error } = await supabase
        .from("calls")
        .upsert(upsertData, { onConflict: "id" });
      
      if (error) {
        throw new Error(`Failed to batch update call metrics: ${error.message}`);
      }
      
      return true;
    } catch (error) {
      errorHandler.handleError({
        message: `Failed to batch update metrics for ${updates.length} calls`,
        technical: error,
        severity: "error",
        code: "DB_BATCH_UPDATE_CALL_METRICS_ERROR"
      }, "MetricsRepository");
      
      return false;
    }
  }
  
  /**
   * Trigger database functions to update metrics summaries
   */
  public async triggerMetricsSummaryUpdate(): Promise<boolean> {
    try {
      // Call all summary update functions
      await supabase.rpc("update_call_metrics_summary");
      await supabase.rpc("update_rep_metrics_on_change");
      await supabase.rpc("update_keyword_trends");
      await supabase.rpc("update_sentiment_trends");
      
      return true;
    } catch (error) {
      errorHandler.handleError({
        message: "Failed to trigger metrics summary update",
        technical: error,
        severity: "error",
        code: "DB_TRIGGER_METRICS_SUMMARY_ERROR"
      }, "MetricsRepository");
      
      return false;
    }
  }
  
  /**
   * Get performance trend data for charts
   */
  public async getPerformanceTrends(
    filter: MetricsFilter = {}
  ): Promise<MetricsTimeSeries[]> {
    try {
      // Calculate date range
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30); // Default to 30 days
      
      const dateRange = filter.dateRange || {
        start: start.toISOString(),
        end: end.toISOString()
      };
      
      // Query analytics view for trend data
      const { data, error } = await supabase
        .from("analytics_metrics_summary")
        .select("date, avg_score")
        .gte("date", dateRange.start)
        .lte("date", dateRange.end)
        .order("date");
      
      if (error) {
        throw new Error(`Failed to fetch performance trends: ${error.message}`);
      }
      
      // Map to time series format
      return (data || []).map(item => ({
        date: new Date(item.date).toISOString().split('T')[0],
        value: item.avg_score || 0
      }));
    } catch (error) {
      errorHandler.handleError({
        message: "Failed to get performance trends data",
        technical: error,
        severity: "error",
        code: "DB_FETCH_PERFORMANCE_TRENDS_ERROR"
      }, "MetricsRepository");
      
      return [];
    }
  }
  
  /**
   * Get dashboard metrics for high-level overview
   */
  public async getDashboardMetrics(
    filter: MetricsFilter = {}
  ): Promise<DashboardMetrics | null> {
    try {
      // Get global metrics
      const globalMetrics = await this.getGlobalMetrics();
      
      // Get performance trends
      const performanceTrends = await this.getPerformanceTrends(filter);
      
      // Generate call volume trends
      const callVolumeTrends = await this.getCallVolumeTrends(filter);
      
      // Generate conversion trends
      const conversionTrends = await this.getConversionTrends(filter);
      
      if (!globalMetrics) {
        throw new Error("Failed to fetch global metrics");
      }
      
      return {
        performanceScore: globalMetrics.performance_score || 0,
        totalCalls: globalMetrics.total_calls || 0,
        avgDuration: globalMetrics.avg_call_duration || 0,
        conversionRate: globalMetrics.conversion_rate || 0,
        avgSentiment: globalMetrics.avg_sentiment || 0.5,
        talkRatio: {
          agent: globalMetrics.agent_talk_ratio || 50,
          customer: globalMetrics.customer_talk_ratio || 50
        },
        trendsData: {
          performance: performanceTrends,
          callVolume: callVolumeTrends,
          conversion: conversionTrends
        }
      };
    } catch (error) {
      errorHandler.handleError({
        message: "Failed to get dashboard metrics",
        technical: error,
        severity: "error",
        code: "DB_FETCH_DASHBOARD_METRICS_ERROR"
      }, "MetricsRepository");
      
      return null;
    }
  }
  
  /**
   * Get call volume trends
   */
  private async getCallVolumeTrends(
    filter: MetricsFilter = {}
  ): Promise<MetricsTimeSeries[]> {
    try {
      // Calculate date range
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30); // Default to 30 days
      
      const dateRange = filter.dateRange || {
        start: start.toISOString(),
        end: end.toISOString()
      };
      
      // Query analytics view for call volume data
      const { data, error } = await supabase
        .from("analytics_metrics_summary")
        .select("date, call_count")
        .gte("date", dateRange.start)
        .lte("date", dateRange.end)
        .order("date");
      
      if (error) {
        throw new Error(`Failed to fetch call volume trends: ${error.message}`);
      }
      
      // Map to time series format
      return (data || []).map(item => ({
        date: new Date(item.date).toISOString().split('T')[0],
        value: item.call_count || 0
      }));
    } catch (error) {
      errorHandler.handleError({
        message: "Failed to get call volume trends data",
        technical: error,
        severity: "error",
        code: "DB_FETCH_CALL_VOLUME_TRENDS_ERROR"
      }, "MetricsRepository");
      
      return [];
    }
  }
  
  /**
   * Get conversion trends
   */
  private async getConversionTrends(
    filter: MetricsFilter = {}
  ): Promise<MetricsTimeSeries[]> {
    try {
      // Calculate date range
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30); // Default to 30 days
      
      const dateRange = filter.dateRange || {
        start: start.toISOString(),
        end: end.toISOString()
      };
      
      // Query analytics view for conversion data
      const { data, error } = await supabase
        .rpc("get_conversion_rates_by_date", {
          start_date: dateRange.start,
          end_date: dateRange.end
        });
      
      if (error) {
        throw new Error(`Failed to fetch conversion trends: ${error.message}`);
      }
      
      // Map to time series format
      return (data || []).map(item => ({
        date: item.date,
        value: item.conversion_rate || 0
      }));
    } catch (error) {
      errorHandler.handleError({
        message: "Failed to get conversion trends data",
        technical: error,
        severity: "error",
        code: "DB_FETCH_CONVERSION_TRENDS_ERROR"
      }, "MetricsRepository");
      
      return [];
    }
  }
  
  /**
   * Validate metrics data consistency
   */
  public async validateMetricsConsistency(): Promise<{
    isConsistent: boolean;
    issues: string[];
  }> {
    try {
      const issues: string[] = [];
      
      // Check for missing data in calls table
      const { data: missingMetricsCalls, error: missingMetricsError } = await supabase
        .from("calls")
        .select("id")
        .or("talk_ratio_agent.is.null,sentiment_agent.is.null");
      
      if (missingMetricsError) {
        throw new Error(`Failed to check for missing metrics: ${missingMetricsError.message}`);
      }
      
      if (missingMetricsCalls && missingMetricsCalls.length > 0) {
        issues.push(`${missingMetricsCalls.length} calls have missing metrics`);
      }
      
      // Check for inconsistencies between call_transcripts and calls tables
      const { data: inconsistentCalls, error: inconsistentError } = await supabase
        .rpc("check_call_data_consistency");
      
      if (inconsistentError) {
        throw new Error(`Failed to check data consistency: ${inconsistentError.message}`);
      }
      
      if (inconsistentCalls && inconsistentCalls.length > 0) {
        issues.push(`${inconsistentCalls.length} calls have inconsistent data between tables`);
      }
      
      return {
        isConsistent: issues.length === 0,
        issues
      };
    } catch (error) {
      errorHandler.handleError({
        message: "Failed to validate metrics consistency",
        technical: error,
        severity: "error",
        code: "DB_VALIDATE_METRICS_ERROR"
      }, "MetricsRepository");
      
      return {
        isConsistent: false,
        issues: ["Failed to validate metrics consistency due to an error"]
      };
    }
  }
}

// Export singleton instance
export const metricsRepository = MetricsRepository.getInstance(); 