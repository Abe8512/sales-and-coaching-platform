import { supabase } from "@/integrations/supabase/client";
import { errorHandler } from "./ErrorHandlingService";
import { logger } from "./LoggingService";
import { userService } from "./UserService";
import { metricsCache } from "./CacheService";
import { TranscriptAnalysisService } from "./TranscriptAnalysisService";
import { Database } from "@/integrations/supabase/types";

// Import types from a centralized location
import { 
  CallMetrics, 
  RepMetrics, 
  WordTimestamp,
  MetricWithConfidence,
  TranscriptSegment 
} from "@/types/metrics";

// Constants
const METRICS_CACHE_TTL = 300000; // 5 minutes in milliseconds
const BATCH_SIZE = 10; // Number of items to process in a batch

/**
 * Centralized service for all metrics calculations and updates.
 * This service consolidates functionality previously spread across multiple services.
 */
export class MetricsService {
  private static instance: MetricsService;
  private transcriptAnalysisService: TranscriptAnalysisService;
  private syncInProgress = false;
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.transcriptAnalysisService = new TranscriptAnalysisService();
    logger.info("MetricsService initialized");
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }
  
  /**
   * Calculate comprehensive metrics from transcript data
   * @param text Full transcript text
   * @param segments Transcript segments with speaker information
   * @param words Word-level timestamps (optional)
   * @param duration Call duration in seconds
   * @returns Calculated metrics
   */
  public calculateCallMetrics(
    text: string, 
    segments: TranscriptSegment[], 
    words: WordTimestamp[] = [], 
    duration: number
  ): CallMetrics {
    try {
      // Use the transcript analysis service for the actual calculations
      const metrics = this.transcriptAnalysisService.calculateCallMetrics(
        text, segments, words, duration
      );
      
      // Add confidence scores
      const enhancedMetrics: CallMetrics = {
        ...metrics,
        // Add confidence based on data quality
        confidence: this.calculateMetricsConfidence(text, segments, words)
      };
      
      return enhancedMetrics;
    } catch (error) {
      errorHandler.handleError({
        message: "Error calculating call metrics",
        technical: error,
        severity: "error",
        code: "METRICS_CALCULATION_ERROR"
      }, "MetricsService");
      
      // Return default metrics on error
      return this.getDefaultMetrics(duration);
    }
  }
  
  /**
   * Calculate confidence score for metrics based on data quality
   */
  private calculateMetricsConfidence(
    text: string, 
    segments: TranscriptSegment[], 
    words: WordTimestamp[]
  ): number {
    // Base confidence starts at 0.7 (70%)
    let confidence = 0.7;
    
    // Adjust based on data quality indicators
    if (!text || text.length < 10) confidence -= 0.3;
    if (!segments || segments.length === 0) confidence -= 0.2;
    
    // Word-level data increases confidence
    if (words && words.length > 0) confidence += 0.2;
    
    // Speaker information increases confidence
    const hasSpeakerInfo = segments.some(s => s.speaker && s.speaker.length > 0);
    if (hasSpeakerInfo) confidence += 0.1;
    
    // Cap confidence between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }
  
  /**
   * Get default metrics when calculation fails
   */
  private getDefaultMetrics(duration: number): CallMetrics {
    return {
      duration: duration || 60,
      words: 0,
      talkRatio: {
        agent: 50,
        customer: 50
      },
      speakingSpeed: {
        overall: 150,
        agent: 150,
        customer: 150
      },
      fillerWords: {
        count: 0,
        perMinute: 0,
        breakdown: {}
      },
      objections: {
        count: 0,
        instances: []
      },
      sentiment: "neutral",
      customerEngagement: 50,
      confidence: 0.3 // Low confidence for default values
    };
  }
  
  /**
   * Update metrics for a specific transcript
   * @param transcriptId ID of the transcript
   */
  public async updateMetrics(transcriptId: string): Promise<void> {
    try {
      logger.info(`Updating metrics for transcript: ${transcriptId}`);
      
      // Fetch transcript data
      const { data: transcript, error } = await supabase
        .from("call_transcripts")
        .select("*")
        .eq("id", transcriptId)
        .single();
      
      if (error || !transcript) {
        throw new Error(`Failed to fetch transcript: ${error?.message}`);
      }
      
      // Calculate metrics
      const metrics = this.calculateCallMetrics(
        transcript.text,
        transcript.transcript_segments || [],
        transcript.word_timestamps || [],
        transcript.duration || 0
      );
      
      // Update calls table with metrics
      await this.updateCallsTable(transcriptId, metrics);
      
      // Trigger summary tables update
      await this.updateMetricsSummaries();
      
      // Clear relevant caches
      this.clearMetricsCaches();
      
      logger.info(`Successfully updated metrics for transcript: ${transcriptId}`);
    } catch (error) {
      errorHandler.handleError({
        message: `Failed to update metrics for transcript: ${transcriptId}`,
        technical: error,
        severity: "error",
        code: "METRICS_UPDATE_ERROR"
      }, "MetricsService");
    }
  }
  
  /**
   * Batch update metrics for multiple transcripts
   * @param transcriptIds Array of transcript IDs
   */
  public async batchUpdateMetrics(transcriptIds: string[]): Promise<void> {
    if (!transcriptIds.length) return;
    
    try {
      logger.info(`Batch updating metrics for ${transcriptIds.length} transcripts`);
      
      // Process in batches to avoid overloading the database
      for (let i = 0; i < transcriptIds.length; i += BATCH_SIZE) {
        const batch = transcriptIds.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(id => this.updateMetrics(id)));
      }
      
      // Update summary tables once after all individual updates
      await this.updateMetricsSummaries();
      
      // Clear relevant caches
      this.clearMetricsCaches();
      
      logger.info(`Successfully batch updated metrics for ${transcriptIds.length} transcripts`);
    } catch (error) {
      errorHandler.handleError({
        message: `Failed to batch update metrics for ${transcriptIds.length} transcripts`,
        technical: error,
        severity: "error",
        code: "METRICS_BATCH_UPDATE_ERROR"
      }, "MetricsService");
    }
  }
  
  /**
   * Update the calls table with metrics data
   */
  private async updateCallsTable(transcriptId: string, metrics: CallMetrics): Promise<void> {
    try {
      const callData = {
        id: transcriptId,
        duration: metrics.duration,
        sentiment_agent: metrics.sentiment === 'positive' ? 0.8 : 
                          metrics.sentiment === 'negative' ? 0.3 : 0.5,
        sentiment_customer: metrics.sentiment === 'positive' ? 0.7 : 
                            metrics.sentiment === 'negative' ? 0.2 : 0.5,
        talk_ratio_agent: metrics.talkRatio.agent,
        talk_ratio_customer: metrics.talkRatio.customer,
        speaking_speed: metrics.speakingSpeed.overall,
        filler_word_count: metrics.fillerWords.count,
        objection_count: metrics.objections.count,
        customer_engagement: metrics.customerEngagement,
        metrics_confidence: metrics.confidence
      };
      
      const { error } = await supabase
        .from("calls")
        .upsert(callData, { onConflict: "id" });
      
      if (error) {
        throw new Error(`Failed to update calls table: ${error.message}`);
      }
    } catch (error) {
      errorHandler.handleError({
        message: `Failed to update calls table for transcript: ${transcriptId}`,
        technical: error,
        severity: "error",
        code: "CALLS_TABLE_UPDATE_ERROR"
      }, "MetricsService");
    }
  }
  
  /**
   * Update metrics summary tables (call_metrics_summary and rep_metrics_summary)
   */
  private async updateMetricsSummaries(): Promise<void> {
    // Avoid concurrent updates
    if (this.syncInProgress) {
      logger.info("Metrics sync already in progress, skipping");
      return;
    }
    
    this.syncInProgress = true;
    
    try {
      // Use database functions for efficient aggregation
      await supabase.rpc("update_call_metrics_summary");
      await supabase.rpc("update_rep_metrics_on_change");
      await supabase.rpc("update_keyword_trends");
      await supabase.rpc("update_sentiment_trends");
      
      logger.info("Successfully updated metrics summary tables");
    } catch (error) {
      errorHandler.handleError({
        message: "Failed to update metrics summary tables",
        technical: error,
        severity: "error",
        code: "METRICS_SUMMARY_UPDATE_ERROR"
      }, "MetricsService");
    } finally {
      this.syncInProgress = false;
    }
  }
  
  /**
   * Clear metrics-related caches
   */
  private clearMetricsCaches(): void {
    metricsCache.clear();
  }
  
  /**
   * Get global call metrics (from call_metrics_summary table)
   */
  public async getGlobalCallMetrics(): Promise<CallMetrics | null> {
    try {
      // Try to get from cache first
      const cacheKey = "global_call_metrics";
      const cachedMetrics = metricsCache.get<CallMetrics>(cacheKey, METRICS_CACHE_TTL);
      
      if (cachedMetrics) {
        return cachedMetrics;
      }
      
      // Fetch from database
      const { data, error } = await supabase
        .from("call_metrics_summary")
        .select("*")
        .eq("id", "global")
        .single();
      
      if (error || !data) {
        throw new Error(`Failed to fetch global call metrics: ${error?.message}`);
      }
      
      // Transform database format to application format
      const metrics: CallMetrics = {
        duration: data.avg_call_duration || 0,
        words: 0, // Not stored in summary
        talkRatio: {
          agent: data.agent_talk_ratio || 50,
          customer: data.customer_talk_ratio || 50
        },
        speakingSpeed: {
          overall: 150, // Default values since not stored in summary
          agent: 150,
          customer: 150
        },
        fillerWords: {
          count: 0, // Not stored in summary
          perMinute: 0,
          breakdown: {}
        },
        objections: {
          count: 0, // Not stored in summary
          instances: []
        },
        sentiment: data.avg_sentiment > 0.6 ? "positive" : 
                 data.avg_sentiment < 0.4 ? "negative" : "neutral",
        customerEngagement: 70, // Not stored in summary
        confidence: 0.9, // High confidence for aggregated data
        // Additional summary-specific fields
        totalCalls: data.total_calls || 0,
        successfulCalls: data.successful_calls || 0,
        unsuccessfulCalls: data.unsuccessful_calls || 0,
        conversionRate: data.conversion_rate || 0,
        performanceScore: data.performance_score || 0,
        topKeywords: data.top_keywords || []
      };
      
      // Cache the result
      metricsCache.set(cacheKey, metrics, METRICS_CACHE_TTL);
      
      return metrics;
    } catch (error) {
      errorHandler.handleError({
        message: "Failed to get global call metrics",
        technical: error,
        severity: "error",
        code: "GLOBAL_METRICS_FETCH_ERROR"
      }, "MetricsService");
      
      return null;
    }
  }
  
  /**
   * Get rep metrics by rep ID
   */
  public async getRepMetrics(repId: string): Promise<RepMetrics | null> {
    try {
      // Try to get from cache first
      const cacheKey = `rep_metrics_${repId}`;
      const cachedMetrics = metricsCache.get<RepMetrics>(cacheKey, METRICS_CACHE_TTL);
      
      if (cachedMetrics) {
        return cachedMetrics;
      }
      
      // Fetch from database
      const { data, error } = await supabase
        .from("rep_metrics_summary")
        .select("*")
        .eq("rep_id", repId)
        .single();
      
      if (error || !data) {
        throw new Error(`Failed to fetch rep metrics: ${error?.message}`);
      }
      
      // Transform database format to application format
      const metrics: RepMetrics = {
        repId: data.rep_id,
        repName: data.rep_name || "Unknown",
        callVolume: data.call_volume || 0,
        successRate: data.success_rate || 0,
        sentimentScore: data.sentiment_score || 0.5,
        topKeywords: data.top_keywords || [],
        insights: data.insights || [],
        timePeriod: data.time_period || "all_time",
        updatedAt: data.updated_at || new Date().toISOString()
      };
      
      // Cache the result
      metricsCache.set(cacheKey, metrics, METRICS_CACHE_TTL);
      
      return metrics;
    } catch (error) {
      errorHandler.handleError({
        message: `Failed to get rep metrics for rep: ${repId}`,
        technical: error,
        severity: "error",
        code: "REP_METRICS_FETCH_ERROR"
      }, "MetricsService");
      
      return null;
    }
  }
}

// Export singleton instance
export const metricsService = MetricsService.getInstance(); 