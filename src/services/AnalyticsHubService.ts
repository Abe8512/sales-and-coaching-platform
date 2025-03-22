import { supabase } from "@/integrations/supabase/client";
import { StoredTranscription, TranscriptSegment } from "./WhisperService";
import { DataFilters, TeamMetricsData, RepMetricsData, KeywordData, SentimentData } from "./SharedDataService";
import { errorHandler } from "./ErrorHandlingService";
import { toast } from "sonner";
import { useState, useEffect, useCallback } from "react";
import { metricsCache } from "./CacheService";

// Constants
const METRICS_CACHE_TTL = 60000; // 60 seconds for metrics data
const REFRESH_INTERVAL = 300000; // 5 minutes

// Helper functions
const getCacheKey = (filters?: DataFilters): string => {
  return JSON.stringify(filters || {});
};

// Main class that handles all analytics data
export class AnalyticsHubService {
  private static instance: AnalyticsHubService;
  
  // Data stores with TTL-based caching
  private teamMetricsCache: Map<string, { data: TeamMetricsData, timestamp: number }> = new Map();
  private repMetricsCache: Map<string, { data: RepMetricsData[], timestamp: number }> = new Map();
  private keywordDataCache: Map<string, { data: KeywordData[], timestamp: number }> = new Map();
  private sentimentDataCache: Map<string, { data: SentimentData[], timestamp: number }> = new Map();
  private transcriptsCache: Map<string, { data: StoredTranscription[], timestamp: number }> = new Map();
  
  // Status tracking
  private refreshInProgress: boolean = false;
  private lastRefreshTimestamp: number = 0;
  private refreshInterval: number | null = null;

  // Event callbacks
  private eventListeners: Map<string, Set<Function>> = new Map();
  
  // Singleton pattern
  public static getInstance(): AnalyticsHubService {
    if (!AnalyticsHubService.instance) {
      AnalyticsHubService.instance = new AnalyticsHubService();
    }
    return AnalyticsHubService.instance;
  }
  
  private constructor() {
    this.initializeRealTimeSubscriptions();
    this.startPeriodicRefresh();
  }
  
  // Initialize real-time subscriptions to Supabase
  private initializeRealTimeSubscriptions() {
    try {
      // Subscribe to call_transcripts table changes
      const transcriptSubscription = supabase
        .channel('analytics-hub-transcripts')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'call_transcripts' 
        }, (payload) => {
          console.log('Transcript data changed:', payload);
          this.emit('transcript-changed', payload);
          this.refreshData('transcripts');
        })
        .subscribe();

      // Subscribe to call_metrics_summary table changes
      const metricsSubscription = supabase
        .channel('analytics-hub-metrics')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'call_metrics_summary' 
        }, (payload) => {
          console.log('Metrics data changed:', payload);
          this.emit('metrics-changed', payload);
          this.refreshData('metrics');
        })
        .subscribe();

      console.log('AnalyticsHubService: Real-time subscriptions initialized');
    } catch (error) {
      console.error('AnalyticsHubService: Failed to initialize real-time subscriptions', error);
      errorHandler.logError('AnalyticsHubService.initializeRealTimeSubscriptions', error);
    }
  }
  
  // Start periodic refresh
  private startPeriodicRefresh() {
    if (this.refreshInterval !== null) {
      clearInterval(this.refreshInterval);
    }
    
    this.refreshInterval = window.setInterval(() => {
      this.refreshAllData();
    }, REFRESH_INTERVAL);
    
    console.log(`AnalyticsHubService: Periodic refresh started (every ${REFRESH_INTERVAL / 60000} minutes)`);
  }
  
  // Stop periodic refresh
  public stopPeriodicRefresh() {
    if (this.refreshInterval !== null) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log('AnalyticsHubService: Periodic refresh stopped');
    }
  }
  
  // Emit events to listeners
  private emit(eventName: string, data: any) {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`AnalyticsHubService: Error in event listener for "${eventName}"`, error);
        }
      });
    }
  }
  
  // Subscribe to events
  public subscribe(eventName: string, callback: Function): () => void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    
    const listeners = this.eventListeners.get(eventName)!;
    listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(eventName);
      }
    };
  }
  
  // Check if cache is valid
  private isCacheValid<T>(cache: Map<string, { data: T, timestamp: number }>, key: string): boolean {
    const cached = cache.get(key);
    if (!cached) return false;
    
    const now = Date.now();
    return now - cached.timestamp < METRICS_CACHE_TTL;
  }
  
  // Get team metrics with caching
  public async getTeamMetrics(filters: DataFilters = {}): Promise<TeamMetricsData> {
    const cacheKey = getCacheKey(filters);
    
    // Check cache first
    if (this.isCacheValid(this.teamMetricsCache, cacheKey)) {
      const cached = this.teamMetricsCache.get(cacheKey);
      return cached!.data;
    }
    
    try {
      // Define default return value in case of error
      const defaultMetrics: TeamMetricsData = {
        totalCalls: 0,
        avgSentiment: 0,
        avgTalkRatio: { agent: 0, customer: 0 },
        topKeywords: [],
        performanceScore: 0,
        conversionRate: 0,
        avgCallDuration: 0,
        callOutcomes: { successful: 0, unsuccessful: 0 }
      };
      
      // Build query filters
      let query = supabase.from('call_metrics_summary');
      
      // Apply filters
      if (filters.dateRange?.from && filters.dateRange?.to) {
        query = query.gte('time_period', filters.dateRange.from.toISOString())
                     .lte('time_period', filters.dateRange.to.toISOString());
      }
      
      // Execute query
      const { data, error } = await query.select('*').single();
      
      if (error) {
        console.error('AnalyticsHubService: Error fetching team metrics', error);
        errorHandler.logError('AnalyticsHubService.getTeamMetrics', error);
        return defaultMetrics;
      }
      
      // Transform database data to our TeamMetricsData format
      const metrics: TeamMetricsData = {
        totalCalls: data?.total_calls || 0,
        avgSentiment: data?.avg_sentiment || 0,
        avgTalkRatio: {
          agent: data?.agent_talk_ratio || 0,
          customer: data?.customer_talk_ratio || 0
        },
        topKeywords: data?.top_keywords || [],
        performanceScore: data?.performance_score || 0,
        conversionRate: data?.conversion_rate || 0,
        avgCallDuration: data?.avg_call_duration || 0,
        callOutcomes: {
          successful: data?.successful_calls || 0,
          unsuccessful: data?.unsuccessful_calls || 0
        }
      };
      
      // Save to cache
      this.teamMetricsCache.set(cacheKey, {
        data: metrics,
        timestamp: Date.now()
      });
      
      return metrics;
    } catch (error) {
      console.error('AnalyticsHubService: Error fetching team metrics', error);
      errorHandler.logError('AnalyticsHubService.getTeamMetrics', error);
      
      // Return default metrics on error
      return {
        totalCalls: 0,
        avgSentiment: 0,
        avgTalkRatio: { agent: 0, customer: 0 },
        topKeywords: [],
        performanceScore: 0,
        conversionRate: 0,
        avgCallDuration: 0,
        callOutcomes: { successful: 0, unsuccessful: 0 }
      };
    }
  }
  
  // Get rep metrics with caching
  public async getRepMetrics(filters: DataFilters = {}): Promise<RepMetricsData[]> {
    const cacheKey = getCacheKey(filters);
    
    // Check cache first
    if (this.isCacheValid(this.repMetricsCache, cacheKey)) {
      const cached = this.repMetricsCache.get(cacheKey);
      return cached!.data;
    }
    
    try {
      // Build query filters
      let query = supabase.from('rep_metrics_summary');
      
      // Apply filters
      if (filters.dateRange?.from && filters.dateRange?.to) {
        query = query.gte('time_period', filters.dateRange.from.toISOString())
                     .lte('time_period', filters.dateRange.to.toISOString());
      }
      
      if (filters.repIds && filters.repIds.length > 0) {
        query = query.in('rep_id', filters.repIds);
      }
      
      // Execute query
      const { data, error } = await query.select('*');
      
      if (error) {
        console.error('AnalyticsHubService: Error fetching rep metrics', error);
        errorHandler.logError('AnalyticsHubService.getRepMetrics', error);
        return [];
      }
      
      // Transform database data to our RepMetricsData format
      const metrics: RepMetricsData[] = data.map(rep => ({
        id: rep.rep_id,
        name: rep.rep_name,
        callVolume: rep.call_volume || 0,
        successRate: rep.success_rate || 0,
        sentiment: rep.sentiment_score || 0,
        topKeywords: rep.top_keywords || [],
        insights: rep.insights || []
      }));
      
      // Save to cache
      this.repMetricsCache.set(cacheKey, {
        data: metrics,
        timestamp: Date.now()
      });
      
      return metrics;
    } catch (error) {
      console.error('AnalyticsHubService: Error fetching rep metrics', error);
      errorHandler.logError('AnalyticsHubService.getRepMetrics', error);
      return [];
    }
  }
  
  // Get keyword data with caching
  public async getKeywordData(filters: DataFilters = {}): Promise<KeywordData[]> {
    const cacheKey = getCacheKey(filters);
    
    // Check cache first
    if (this.isCacheValid(this.keywordDataCache, cacheKey)) {
      const cached = this.keywordDataCache.get(cacheKey);
      return cached!.data;
    }
    
    try {
      // Build query
      const { data, error } = await supabase.rpc('get_keyword_analytics', {
        start_date: filters.dateRange?.from?.toISOString(),
        end_date: filters.dateRange?.to?.toISOString(),
        rep_ids: filters.repIds
      });
      
      if (error) {
        console.error('AnalyticsHubService: Error fetching keyword data', error);
        errorHandler.logError('AnalyticsHubService.getKeywordData', error);
        return [];
      }
      
      // Transform to KeywordData format
      const keywordData: KeywordData[] = data.map(item => ({
        keyword: item.keyword,
        count: item.count,
        category: item.category || 'uncategorized'
      }));
      
      // Save to cache
      this.keywordDataCache.set(cacheKey, {
        data: keywordData,
        timestamp: Date.now()
      });
      
      return keywordData;
    } catch (error) {
      console.error('AnalyticsHubService: Error fetching keyword data', error);
      errorHandler.logError('AnalyticsHubService.getKeywordData', error);
      return [];
    }
  }
  
  // Get sentiment data with caching
  public async getSentimentData(filters: DataFilters = {}): Promise<SentimentData[]> {
    const cacheKey = getCacheKey(filters);
    
    // Check cache first
    if (this.isCacheValid(this.sentimentDataCache, cacheKey)) {
      const cached = this.sentimentDataCache.get(cacheKey);
      return cached!.data;
    }
    
    try {
      // Build query
      const { data, error } = await supabase.rpc('get_sentiment_trends', {
        start_date: filters.dateRange?.from?.toISOString(),
        end_date: filters.dateRange?.to?.toISOString(),
        rep_ids: filters.repIds
      });
      
      if (error) {
        console.error('AnalyticsHubService: Error fetching sentiment data', error);
        errorHandler.logError('AnalyticsHubService.getSentimentData', error);
        return [];
      }
      
      // Transform to SentimentData format
      const sentimentData: SentimentData[] = data.map(item => ({
        label: item.sentiment,
        value: item.count,
        date: item.date
      }));
      
      // Save to cache
      this.sentimentDataCache.set(cacheKey, {
        data: sentimentData,
        timestamp: Date.now()
      });
      
      return sentimentData;
    } catch (error) {
      console.error('AnalyticsHubService: Error fetching sentiment data', error);
      errorHandler.logError('AnalyticsHubService.getSentimentData', error);
      return [];
    }
  }
  
  // Get transcripts with caching
  public async getTranscripts(filters: DataFilters = {}): Promise<StoredTranscription[]> {
    const cacheKey = getCacheKey(filters);
    
    // Check cache first
    if (this.isCacheValid(this.transcriptsCache, cacheKey)) {
      const cached = this.transcriptsCache.get(cacheKey);
      return cached!.data;
    }
    
    try {
      // Build query
      let query = supabase.from('call_transcripts').select('*');
      
      // Apply filters
      if (filters.dateRange?.from && filters.dateRange?.to) {
        query = query.gte('created_at', filters.dateRange.from.toISOString())
                     .lte('created_at', filters.dateRange.to.toISOString());
      }
      
      if (filters.repIds && filters.repIds.length > 0) {
        query = query.in('user_id', filters.repIds);
      }
      
      // Order by most recent
      query = query.order('created_at', { ascending: false });
      
      // Execute query
      const { data, error } = await query;
      
      if (error) {
        console.error('AnalyticsHubService: Error fetching transcripts', error);
        errorHandler.logError('AnalyticsHubService.getTranscripts', error);
        return [];
      }
      
      // Transform to StoredTranscription format
      const transcripts: StoredTranscription[] = data.map(transcript => ({
        id: transcript.id,
        text: transcript.text,
        date: transcript.created_at,
        duration: transcript.duration,
        speakerName: transcript.user_name || "Unknown",
        callScore: transcript.call_score,
        sentiment: transcript.sentiment,
        keywords: transcript.keywords,
        transcript_segments: transcript.transcript_segments as TranscriptSegment[],
        filename: transcript.filename,
        customerName: transcript.customer_name
      }));
      
      // Save to cache
      this.transcriptsCache.set(cacheKey, {
        data: transcripts,
        timestamp: Date.now()
      });
      
      return transcripts;
    } catch (error) {
      console.error('AnalyticsHubService: Error fetching transcripts', error);
      errorHandler.logError('AnalyticsHubService.getTranscripts', error);
      return [];
    }
  }
  
  // Process new transcript data from Whisper
  public async processWhisperTranscript(transcript: StoredTranscription): Promise<void> {
    try {
      console.log('AnalyticsHubService: Processing new Whisper transcript', transcript.id);
      
      // Invalidate caches to ensure fresh data
      this.invalidateAllCaches();
      
      // Emit event for real-time updates
      this.emit('new-transcript', transcript);
      
      // Notify components of data change
      this.emit('data-updated', {
        type: 'transcript',
        id: transcript.id
      });
    } catch (error) {
      console.error('AnalyticsHubService: Error processing Whisper transcript', error);
      errorHandler.logError('AnalyticsHubService.processWhisperTranscript', error);
    }
  }
  
  // Invalidate specific cache
  private invalidateCache<T>(cache: Map<string, { data: T, timestamp: number }>) {
    cache.clear();
  }
  
  // Invalidate all caches
  private invalidateAllCaches() {
    this.invalidateCache(this.teamMetricsCache);
    this.invalidateCache(this.repMetricsCache);
    this.invalidateCache(this.keywordDataCache);
    this.invalidateCache(this.sentimentDataCache);
    this.invalidateCache(this.transcriptsCache);
  }
  
  // Refresh specific data type
  private async refreshData(type: 'metrics' | 'transcripts' | 'keywords' | 'sentiment'): Promise<void> {
    switch (type) {
      case 'metrics':
        this.invalidateCache(this.teamMetricsCache);
        this.invalidateCache(this.repMetricsCache);
        break;
      case 'transcripts':
        this.invalidateCache(this.transcriptsCache);
        break;
      case 'keywords':
        this.invalidateCache(this.keywordDataCache);
        break;
      case 'sentiment':
        this.invalidateCache(this.sentimentDataCache);
        break;
    }
    
    // Emit data refresh event
    this.emit('data-refreshed', { type });
  }
  
  // Force refresh all data
  public async refreshAllData(): Promise<void> {
    if (this.refreshInProgress) {
      console.log('AnalyticsHubService: Refresh already in progress');
      return;
    }
    
    try {
      this.refreshInProgress = true;
      this.lastRefreshTimestamp = Date.now();
      
      console.log('AnalyticsHubService: Refreshing all data');
      
      // Invalidate all caches
      this.invalidateAllCaches();
      
      // Emit refresh event
      this.emit('refresh-started', { timestamp: this.lastRefreshTimestamp });
      
      // Emit data refresh completed event
      this.emit('data-refreshed', { type: 'all', timestamp: Date.now() });
      
      console.log('AnalyticsHubService: All data refreshed');
    } catch (error) {
      console.error('AnalyticsHubService: Error refreshing data', error);
      errorHandler.logError('AnalyticsHubService.refreshAllData', error);
    } finally {
      this.refreshInProgress = false;
    }
  }
  
  // Get refresh status
  public getRefreshStatus() {
    return {
      refreshInProgress: this.refreshInProgress,
      lastRefreshTimestamp: this.lastRefreshTimestamp
    };
  }
}

// React hooks for components to use
export const useAnalyticsTeamMetrics = (filters: DataFilters = {}) => {
  const [metrics, setMetrics] = useState<TeamMetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      const analyticsHub = AnalyticsHubService.getInstance();
      const data = await analyticsHub.getTeamMetrics(filters);
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching team metrics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);
  
  const refreshMetrics = useCallback(async () => {
    const analyticsHub = AnalyticsHubService.getInstance();
    await analyticsHub.refreshAllData();
    fetchMetrics();
  }, [fetchMetrics]);
  
  useEffect(() => {
    fetchMetrics();
    
    // Subscribe to data-refreshed event
    const analyticsHub = AnalyticsHubService.getInstance();
    const unsubscribe = analyticsHub.subscribe('data-refreshed', () => {
      fetchMetrics();
    });
    
    return () => {
      unsubscribe();
    };
  }, [fetchMetrics]);
  
  return { metrics, isLoading, error, refreshMetrics };
};

export const useAnalyticsRepMetrics = (filters: DataFilters = {}) => {
  const [metrics, setMetrics] = useState<RepMetricsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      const analyticsHub = AnalyticsHubService.getInstance();
      const data = await analyticsHub.getRepMetrics(filters);
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching rep metrics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);
  
  const refreshMetrics = useCallback(async () => {
    const analyticsHub = AnalyticsHubService.getInstance();
    await analyticsHub.refreshAllData();
    fetchMetrics();
  }, [fetchMetrics]);
  
  useEffect(() => {
    fetchMetrics();
    
    // Subscribe to data-refreshed event
    const analyticsHub = AnalyticsHubService.getInstance();
    const unsubscribe = analyticsHub.subscribe('data-refreshed', () => {
      fetchMetrics();
    });
    
    return () => {
      unsubscribe();
    };
  }, [fetchMetrics]);
  
  return { metrics, isLoading, error, refreshMetrics };
};

export const useAnalyticsKeywordData = (filters: DataFilters = {}) => {
  const [keywordData, setKeywordData] = useState<KeywordData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchKeywordData = useCallback(async () => {
    try {
      setIsLoading(true);
      const analyticsHub = AnalyticsHubService.getInstance();
      const data = await analyticsHub.getKeywordData(filters);
      setKeywordData(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching keyword data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);
  
  const refreshKeywordData = useCallback(async () => {
    const analyticsHub = AnalyticsHubService.getInstance();
    await analyticsHub.refreshAllData();
    fetchKeywordData();
  }, [fetchKeywordData]);
  
  useEffect(() => {
    fetchKeywordData();
    
    // Subscribe to data-refreshed event
    const analyticsHub = AnalyticsHubService.getInstance();
    const unsubscribe = analyticsHub.subscribe('data-refreshed', () => {
      fetchKeywordData();
    });
    
    return () => {
      unsubscribe();
    };
  }, [fetchKeywordData]);
  
  return { keywordData, isLoading, error, refreshKeywordData };
};

export const useAnalyticsSentimentData = (filters: DataFilters = {}) => {
  const [sentimentData, setsentimentData] = useState<SentimentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchSentimentData = useCallback(async () => {
    try {
      setIsLoading(true);
      const analyticsHub = AnalyticsHubService.getInstance();
      const data = await analyticsHub.getSentimentData(filters);
      setsentimentData(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching sentiment data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);
  
  const refreshSentimentData = useCallback(async () => {
    const analyticsHub = AnalyticsHubService.getInstance();
    await analyticsHub.refreshAllData();
    fetchSentimentData();
  }, [fetchSentimentData]);
  
  useEffect(() => {
    fetchSentimentData();
    
    // Subscribe to data-refreshed event
    const analyticsHub = AnalyticsHubService.getInstance();
    const unsubscribe = analyticsHub.subscribe('data-refreshed', () => {
      fetchSentimentData();
    });
    
    return () => {
      unsubscribe();
    };
  }, [fetchSentimentData]);
  
  return { sentimentData, isLoading, error, refreshSentimentData };
};

export const useAnalyticsTranscripts = (filters: DataFilters = {}) => {
  const [transcripts, setTranscripts] = useState<StoredTranscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchTranscripts = useCallback(async () => {
    try {
      setIsLoading(true);
      const analyticsHub = AnalyticsHubService.getInstance();
      const data = await analyticsHub.getTranscripts(filters);
      setTranscripts(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching transcripts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);
  
  const refreshTranscripts = useCallback(async () => {
    const analyticsHub = AnalyticsHubService.getInstance();
    await analyticsHub.refreshAllData();
    fetchTranscripts();
  }, [fetchTranscripts]);
  
  useEffect(() => {
    fetchTranscripts();
    
    // Subscribe to data-refreshed event
    const analyticsHub = AnalyticsHubService.getInstance();
    const unsubscribe = analyticsHub.subscribe('data-refreshed', () => {
      fetchTranscripts();
    });
    
    return () => {
      unsubscribe();
    };
  }, [fetchTranscripts]);
  
  return { transcripts, isLoading, error, refreshTranscripts };
}; 