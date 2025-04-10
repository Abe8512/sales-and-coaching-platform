/**
 * Centralized types for metrics system
 * This file provides standardized interfaces for all metrics-related data
 */

/**
 * Word-level timestamp data from Whisper API
 */
export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: string;
}

/**
 * Transcript segment with speaker information
 */
export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker: string;
  confidence?: number;
}

/**
 * Interface for a metric with confidence score
 */
export interface MetricWithConfidence {
  value: number;
  confidence: number;
}

/**
 * Core metrics calculated from call transcripts
 */
export interface CallMetrics {
  // Basic metrics
  duration: number;
  words: number;
  
  // Talk ratio metrics
  talkRatio: {
    agent: number;
    customer: number;
  };
  
  // Speaking speed metrics
  speakingSpeed: {
    overall: number;
    agent: number;
    customer: number;
  };
  
  // Filler word analysis
  fillerWords: {
    count: number;
    perMinute: number;
    breakdown: Record<string, number>;
  };
  
  // Objection detection
  objections: {
    count: number;
    instances: Array<{
      text: string;
      start: number;
      end: number;
    }>;
  };
  
  // General sentiment
  sentiment: 'positive' | 'neutral' | 'negative';
  
  // Customer engagement score (0-100)
  customerEngagement: number;
  
  // Confidence score for the metrics (0-1)
  confidence: number;
  
  // Enhanced metrics (optional)
  interruptions?: {
    count: number;
    instances: Array<{
      start: number;
      end: number;
      interrupter: string;
      interrupted: string;
    }>;
  };
  
  pauses?: {
    count: number;
    avgDuration: number;
    longPauses: Array<{
      start: number;
      end: number;
      duration: number;
      prevWord: string;
      nextWord: string;
      speaker: string;
    }>;
  };
  
  emphasis?: {
    words: string[];
    count: number;
  };
  
  // Summary metrics (only present for aggregated data)
  totalCalls?: number;
  successfulCalls?: number;
  unsuccessfulCalls?: number;
  conversionRate?: number;
  performanceScore?: number;
  topKeywords?: string[];
}

/**
 * Rep-specific metrics
 */
export interface RepMetrics {
  repId: string;
  repName: string;
  callVolume: number;
  successRate: number;
  sentimentScore: number;
  topKeywords: string[];
  insights: string[];
  timePeriod: string;
  updatedAt: string;
}

/**
 * Time-series metrics for charts and trends
 */
export interface MetricsTimeSeries {
  date: string;
  value: number;
  label?: string;
}

/**
 * Filters for metrics queries
 */
export interface MetricsFilter {
  dateRange?: {
    start: string;
    end: string;
  };
  repIds?: string[];
  teamIds?: string[];
  timePeriod?: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all';
}

/**
 * Dashboard metrics for high-level overview
 */
export interface DashboardMetrics {
  performanceScore: number;
  totalCalls: number;
  avgDuration: number;
  conversionRate: number;
  avgSentiment: number;
  talkRatio: {
    agent: number;
    customer: number;
  };
  trendsData: {
    performance: MetricsTimeSeries[];
    callVolume: MetricsTimeSeries[];
    conversion: MetricsTimeSeries[];
  };
}

/**
 * Standard response format for metrics API calls
 */
export interface MetricsResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  timestamp: string;
}

/**
 * Configuration for metrics visualization components
 */
export interface MetricsDisplayConfig {
  showConfidence: boolean;
  showTrends: boolean;
  comparisonMode: boolean;
  comparisonBaseline?: CallMetrics | RepMetrics;
  visualizationType: 'bar' | 'line' | 'radar' | 'pie' | 'card';
} 