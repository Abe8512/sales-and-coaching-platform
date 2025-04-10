import { useState, useEffect, useCallback } from "react";
import { getDailyMetrics, getRepPerformance, getSentimentOverTime, DailyMetrics, RepPerformanceData, SentimentData } from "./repositories/AnalyticsRepository";
import { getTranscripts, Transcript } from "./repositories/TranscriptsRepository";
import { reportError, ErrorCategory } from "./ErrorBridgeService";
import { LRUCache } from "../utils/LRUCache";

// Create a cache with limited size for better memory management
const CACHE_SIZE = 100; // Maximum number of items in the cache
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL 

// Cache for different data types
const teamMetricsCache = new LRUCache<string, DailyMetrics>(CACHE_SIZE, CACHE_TTL);
const repMetricsCache = new LRUCache<string, RepPerformanceData[]>(CACHE_SIZE, CACHE_TTL);
const sentimentDataCache = new LRUCache<string, SentimentData[]>(CACHE_SIZE, CACHE_TTL);
const transcriptsCache = new LRUCache<string, Transcript[]>(CACHE_SIZE, CACHE_TTL);

// Define a filter type used by the hooks in this file
export interface SimpleAnalyticsFilter {
    dateRange?: { from?: string; to?: string };
    repIds?: string[]; // Add repIds to the filter type
    // Add other common filter properties if needed
}

// Helper function to generate mock data when real data cannot be fetched
const generateMockData = {
  dailyMetrics: (): DailyMetrics => ({
    date: new Date().toISOString().split('T')[0],
    total_calls: Math.floor(Math.random() * 20) + 5,
    avg_sentiment: 0.6 + (Math.random() * 0.3),
    avg_duration: Math.floor(Math.random() * 600) + 180 // 3-10 minutes
  }),
  
  transcripts: (): Transcript[] => {
    const userId = `mock-user-${Math.floor(Math.random() * 10)}`; // Generate mock user ID
    return Array.from({ length: 10 }).map((_, index) => ({
      id: `mock-transcript-${index}`,
      call_id: `mock-call-${index}`,
      created_at: new Date(Date.now() - index * 86400000).toISOString(),
      text: "This is a mock transcript for testing purposes.",
      speaker_label: index % 2 === 0 ? "AGENT" : "CUSTOMER",
      start_time: 0,
      end_time: Math.floor(Math.random() * 300) + 60,
      user_id: userId, // Add user_id
      // Add other optional fields from Transcript with null or default values
      filename: `mock_call_${index}.wav`,
      duration: Math.floor(Math.random() * 300) + 60,
      sentiment: Math.random() > 0.7 ? 'positive' : Math.random() < 0.3 ? 'negative' : 'neutral',
      sentiment_score: Math.random(),
      keywords: ['mock', 'test', 'data'],
      call_score: Math.floor(Math.random() * 50) + 50,
      talk_ratio_agent: null,
      talk_ratio_customer: null,
      transcript_segments: null,
      language: 'en',
      metadata: null
    }));
  },
  
  repPerformance: (): RepPerformanceData[] => {
    return Array.from({ length: 5 }).map((_, index) => ({
      rep_id: `rep-${index}`,
      rep_name: `Representative ${index + 1}`,
      avg_score: Math.floor(Math.random() * 40) + 60,
      total_calls: Math.floor(Math.random() * 30) + 10
    }));
  },
  
  sentimentData: (): SentimentData[] => {
    return Array.from({ length: 14 }).map((_, index) => ({
      date: new Date(Date.now() - (13 - index) * 86400000).toISOString().split('T')[0],
      sentiment_score: 0.4 + (Math.random() * 0.5)
    }));
  }
};

// Helper function to generate cache keys
function generateCacheKey(filter?: SimpleAnalyticsFilter): string {
  if (!filter) return 'default';
  return JSON.stringify(filter);
}

// Custom hook for daily metrics
export const useAnalyticsDailyMetrics = (filter?: SimpleAnalyticsFilter) => {
  const [metrics, setMetrics] = useState<DailyMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const cacheKey = generateCacheKey(filter);
    const cachedData = teamMetricsCache.get(cacheKey);
    if (cachedData) {
      setMetrics(cachedData);
      setIsLoading(false);
      return;
    }
    try {
      const data = await getDailyMetrics();
      if (data && data.length > 0) {
        const latestMetrics = data[0]; // Assuming the first record is the most recent
        teamMetricsCache.set(cacheKey, latestMetrics);
        setMetrics(latestMetrics);
      } else {
        setMetrics(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("Error fetching daily metrics:", error);
      setError(error);
      setMetrics(null);
      reportError(error, ErrorCategory.DATABASE, { action: 'useAnalyticsDailyMetrics', filter });
    } finally {
      setIsLoading(false);
    }
  }, [filter]);
  
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);
  
  return { metrics, isLoading, error, refreshMetrics: fetchMetrics };
};

// Custom hook for rep metrics
export const useAnalyticsRepMetrics = (filter?: SimpleAnalyticsFilter) => {
  const [metrics, setMetrics] = useState<RepPerformanceData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const cacheKey = generateCacheKey(filter); 
    const cachedData = repMetricsCache.get(cacheKey);
    if (cachedData) {
      setMetrics(cachedData);
      setIsLoading(false);
      return;
    }
    try {
      const data = await getRepPerformance(); 
      if (data && data.length > 0) {
        repMetricsCache.set(cacheKey, data);
        setMetrics(data);
      } else {
        setMetrics(null);
      }
    } catch (err) {
      let errorToReport: Error;
      let errorMessage: string = "An unknown error occurred fetching rep metrics.";
      if (err instanceof Error) {
          errorToReport = err;
          errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
          errorMessage = String(err.message);
          errorToReport = new Error(errorMessage);
          console.warn("Received non-Error object:", err); 
      } else {
          errorMessage = String(err);
          errorToReport = new Error(errorMessage);
      }
      
      console.error("Error fetching rep metrics:", errorMessage, err);
      setError(errorToReport);
      setMetrics(null);
      reportError(errorToReport, ErrorCategory.DATABASE, { action: 'useAnalyticsRepMetrics', filter }); 
    } finally {
      setIsLoading(false);
    }
  }, [filter]); 

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);
  
  return { metrics, isLoading, error, refreshMetrics: fetchMetrics };
};

// Custom hook for sentiment data
export const useAnalyticsSentimentTrends = (period: string = '7d', filter?: SimpleAnalyticsFilter) => {
  const [data, setData] = useState<SentimentData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    // Include the period in the cache key for sentiment data
    const cacheKey = `${period}-${generateCacheKey(filter)}`;
    const cachedData = sentimentDataCache.get(cacheKey);
    if (cachedData) {
      setData(cachedData);
      setIsLoading(false);
      return;
    }
    try {
      const sentimentData = await getSentimentOverTime(period);
      if (sentimentData && sentimentData.length > 0) {
        sentimentDataCache.set(cacheKey, sentimentData);
        setData(sentimentData);
      } else {
        setData(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("Error fetching sentiment data:", error);
      setError(error);
      setData(null);
      reportError(error, ErrorCategory.DATABASE, { action: 'useAnalyticsSentimentTrends', period, filter });
    } finally {
      setIsLoading(false);
    }
  }, [period, filter]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return { data, isLoading, error, refreshData: fetchData };
};

// Custom hook for transcripts
export const useAnalyticsTranscripts = (filter?: {
  startDate?: string;
  endDate?: string;
  userId?: string;
  sentiment?: string;
}) => {
  const [transcripts, setTranscripts] = useState<Transcript[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchTranscripts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const cacheKey = filter ? JSON.stringify(filter) : 'default';
    const cachedData = transcriptsCache.get(cacheKey);
    if (cachedData) {
      setTranscripts(cachedData);
      setIsLoading(false);
      return;
    }
    try {
      const data = await getTranscripts({
        callId: undefined,
        startDate: filter?.startDate,
        endDate: filter?.endDate,
        limit: 50 // reasonable limit
      });
      
      if (data && data.length > 0) {
        transcriptsCache.set(cacheKey, data);
        setTranscripts(data);
      } else {
        setTranscripts(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error("Error fetching transcripts:", error);
      setError(error);
      setTranscripts(null);
      reportError(error, ErrorCategory.DATABASE, { action: 'useAnalyticsTranscripts', filter });
    } finally {
      setIsLoading(false);
    }
  }, [filter]);
  
  useEffect(() => {
    fetchTranscripts();
  }, [fetchTranscripts]);
  
  return { transcripts, isLoading, error, refreshTranscripts: fetchTranscripts };
};

// Clear all caches (useful for logout/login)
export const clearAnalyticsCaches = () => {
  teamMetricsCache.clear();
  repMetricsCache.clear();
  sentimentDataCache.clear();
  transcriptsCache.clear();
};