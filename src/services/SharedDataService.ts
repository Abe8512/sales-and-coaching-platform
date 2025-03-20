import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";
import React from "react";
import { getStoredTranscriptions, StoredTranscription } from '@/services/WhisperService';

// Debounce utility function to prevent rapid duplicate requests
const debounce = <T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      timeout = null;
      func(...args);
    }, wait);
  };
};

// Cache to store recent requests by their stringified filters
const requestCache = new Map<string, {
  timestamp: number;
  data: unknown;
}>();

// Cache timeout in milliseconds (5 seconds)
const CACHE_TIMEOUT = 5000;

// Function to get cache key from filters
const getCacheKey = (filters?: DataFilters): string => {
  return JSON.stringify(filters || {});
};

// Function to check if we have a valid cache entry
const getValidCacheEntry = <T>(key: string): T | null => {
  const entry = requestCache.get(key);
  if (!entry) return null;
  
  const now = Date.now();
  if (now - entry.timestamp > CACHE_TIMEOUT) {
    requestCache.delete(key);
    return null;
  }
  
  return entry.data as T;
};

// Function to set cache entry
const setCacheEntry = <T>(key: string, data: T): void => {
  requestCache.set(key, {
    timestamp: Date.now(),
    data
  });
};

// Define common filter types
export interface DataFilters {
  dateRange?: DateRange;
  repIds?: string[];
  callTypes?: string[];
  productLines?: string[];
}

// Define shared data types
export interface TeamMetricsData {
  totalCalls: number;
  avgSentiment: number;
  avgTalkRatio: {
    agent: number;
    customer: number;
  };
  topKeywords: string[];
  performanceScore: number;
  conversionRate: number;
}

export interface RepMetricsData {
  id: string;
  name: string;
  callVolume: number;
  successRate: number;
  sentiment: number;
  insights: string[];
}

export interface KeywordData {
  keyword: string;
  count: number;
  category: string;
}

export interface SentimentData {
  label: string;
  value: number;
  date: string;
}

// Default metrics data
const DEFAULT_TEAM_METRICS: TeamMetricsData = {
  totalCalls: 0,
  avgSentiment: 0,
  avgTalkRatio: { agent: 50, customer: 50 },
  topKeywords: [],
  performanceScore: 0,
  conversionRate: 0
};

// Debug validation helper
export const validateDataConsistency = (
  dataSource: string,
  metrics: Partial<TeamMetricsData>,
  filters?: DataFilters
) => {
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`Data validation [${dataSource}]`, {
      metrics,
      filters,
      timestamp: new Date().toISOString()
    });
    
    // Add validation rules here
    if (metrics.totalCalls !== undefined && metrics.totalCalls < 0) {
      console.warn('Data consistency warning: totalCalls is negative');
    }
    
    if (metrics.avgSentiment !== undefined && (metrics.avgSentiment < 0 || metrics.avgSentiment > 1)) {
      console.warn('Data consistency warning: avgSentiment out of range [0-1]');
    }
    
    if (metrics.performanceScore !== undefined && (metrics.performanceScore < 0 || metrics.performanceScore > 100)) {
      console.warn('Data consistency warning: performanceScore out of range [0-100]');
    }
  }
};

// Shared utility functions for metrics calculations
export const calculatePerformanceScore = (
  sentimentScore: number,
  talkRatio: { agent: number; customer: number },
  callDuration: number
): number => {
  // Base score from sentiment (0-100)
  const sentimentComponent = sentimentScore * 100;
  
  // Talk ratio component (penalize if agent talks too much or too little)
  const idealAgentRatio = 50;
  const talkRatioDeviation = Math.abs(talkRatio.agent - idealAgentRatio);
  const talkRatioComponent = 100 - talkRatioDeviation;
  
  // Duration component (calls between 3-10 minutes are ideal)
  const durationMinutes = callDuration / 60;
  let durationComponent = 100;
  if (durationMinutes < 3) {
    durationComponent = durationMinutes * 33.3; // Scale up to 100 at 3 minutes
  } else if (durationMinutes > 10) {
    durationComponent = Math.max(0, 100 - ((durationMinutes - 10) * 10));
  }
  
  // Weighted average (sentiment 50%, talk ratio 30%, duration 20%)
  const score = (sentimentComponent * 0.5) + (talkRatioComponent * 0.3) + (durationComponent * 0.2);
  
  return Math.round(score);
};

export const calculateConversionRate = (
  positiveCalls: number,
  totalCalls: number
): number => {
  if (totalCalls === 0) return 0;
  return parseFloat(((positiveCalls / totalCalls) * 100).toFixed(1));
};

// Promise helper with timeout to prevent UI hanging
const fetchWithTimeout = async <T>(promise: Promise<T>, fallbackValue: T, timeoutMs = 5000): Promise<T> => {
  const timeoutPromise = new Promise<T>((resolve) => {
    setTimeout(() => resolve(fallbackValue), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
};

// Hook for shared team metrics data
export const useSharedTeamMetrics = (filters?: DataFilters) => {
  const [metrics, setMetrics] = useState<TeamMetricsData>(DEFAULT_TEAM_METRICS);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);
  const isInitialRender = useRef(true);
  const pendingRequest = useRef<boolean>(false);
  const requestId = useRef<string>(Math.random().toString(36).substring(2, 9));
  const activeFetch = useRef<AbortController | null>(null);
  const cacheKey = useMemo(() => getCacheKey(filters), [filters]);

  // Clean fetch function that uses AbortController for cancellation
  const fetchTeamMetrics = useCallback(() => {
    // Use a unique request ID to track this specific request instance
    const currentRequestId = requestId.current;
    
    // Check if a request is already in progress
    if (pendingRequest.current) {
      console.log('Skipping duplicate team metrics request - one already in progress');
      return;
    }
    
    // Check if we have a recent cache entry for this exact filter combination
    const cachedData = getValidCacheEntry<TeamMetricsData>(cacheKey);
    if (cachedData) {
      console.log('Using cached team metrics data');
      if (isMounted.current) {
        setMetrics(cachedData);
        setIsLoading(false);
      }
      return;
    }
    
    // Create an AbortController for this fetch
    const controller = new AbortController();
    activeFetch.current = controller;
    
    // Mark that a request is in progress
    pendingRequest.current = true;
    
    if (isMounted.current) {
      setIsLoading(true);
    }
    
    // Define the asynchronous fetch operation
    const doFetch = async () => {
      try {
        // Skip if already aborted or component unmounted
        if (controller.signal.aborted || !isMounted.current || requestId.current !== currentRequestId) {
          return;
        }
        
        // Instead of fetching from Supabase directly, use our real data fetcher
        const teamMetricsData = await fetchRealTeamMetrics(filters);
        
        // Check if component is unmounted or request was cancelled during await
        if (controller.signal.aborted || !isMounted.current || requestId.current !== currentRequestId) {
          console.log('Request cancelled during processing');
          return;
        }
        
        // Check one last time before updating state
        if (isMounted.current && !controller.signal.aborted && requestId.current === currentRequestId) {
          // Cache the result
          setCacheEntry(cacheKey, teamMetricsData);
          
          // Update state
          setMetrics(teamMetricsData);
          validateDataConsistency('useSharedTeamMetrics', teamMetricsData, filters);
          setLastUpdated(new Date().toISOString());
          setError(null);
        }
      } catch (err) {
        // Only set error if component is still mounted and this request is still relevant
        if (isMounted.current && !controller.signal.aborted && requestId.current === currentRequestId) {
          // Check if the error is due to a duplicate request cancellation
          if (err && typeof err === 'object' && 'message' in err && 
              (err.message as string).includes('Duplicate request cancelled')) {
            // Log as warning instead of error for duplicate requests
            console.warn('Duplicate request for shared team metrics cancelled:', err);
          } else {
            // Log actual errors
            console.error('Error fetching shared team metrics:', err);
            setError(err instanceof Error ? err : new Error(String(err)));
          }
        }
      } finally {
        // Only update state if this specific request is still relevant
        if (isMounted.current && !controller.signal.aborted && requestId.current === currentRequestId) {
          pendingRequest.current = false;
          setIsLoading(false);
          activeFetch.current = null;
        } else {
          // Still clean up the pending flag to allow new requests
          pendingRequest.current = false;
        }
      }
    };
    
    // Start the fetch process
    doFetch();
    
    // Return a function that can be used to abort this specific fetch
    return () => {
      if (activeFetch.current === controller) {
        controller.abort();
        activeFetch.current = null;
        pendingRequest.current = false;
      }
    };
  }, [cacheKey, filters]);

  // Create a debounced version of fetchTeamMetrics
  const debouncedFetchTeamMetrics = useCallback(() => {
    // Generate a new request ID for each debounced call to track it uniquely
    requestId.current = Math.random().toString(36).substring(2, 9);
    
    // Abort any in-progress fetch
    if (activeFetch.current) {
      activeFetch.current.abort();
      activeFetch.current = null;
    }
    
    // Clear pending flag
    pendingRequest.current = false;
    
    // Use a simple timeout instead of debounce utility
    const timeoutId = setTimeout(() => {
      if (isMounted.current) {
        fetchTeamMetrics();
      }
    }, 500);
    
    // Return cleanup function
    return () => {
      clearTimeout(timeoutId);
    };
  }, [fetchTeamMetrics]);
  
  useEffect(() => {
    // Cleanup function to collect all the things we need to clean up
    const cleanupFunctions: Array<() => void> = [];
    
    // Skip initial render effect for immediate data
    if (isInitialRender.current) {
      isInitialRender.current = false;
      // Call non-debounced version for initial load
      const cancelInitialFetch = fetchTeamMetrics();
      if (cancelInitialFetch) {
        cleanupFunctions.push(cancelInitialFetch);
      }
    } else {
      // For subsequent loads, use debounced version
      const cancelDebouncedFetch = debouncedFetchTeamMetrics();
      if (cancelDebouncedFetch) {
        cleanupFunctions.push(cancelDebouncedFetch);
      }
    }
    
    // Set up real-time subscription
    const channel = supabase
      .channel('shared-team-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'calls' },
        (payload) => {
          console.log('Real-time team update received:', payload);
          // Generate new request ID to ensure it's tracked separately
          requestId.current = Math.random().toString(36).substring(2, 9);
          const cancelRealTimeFetch = debouncedFetchTeamMetrics();
          if (cancelRealTimeFetch) {
            // We don't add this to cleanupFunctions because we want it to complete
            // It will be cleaned up by the next fetch or unmount
          }
        }
      )
      .subscribe();
      
    // Add channel removal to cleanup
    cleanupFunctions.push(() => {
      supabase.removeChannel(channel);
    });

    return () => {
      // Execute all cleanup functions
      cleanupFunctions.forEach(cleanup => cleanup());
      
      // Mark component as unmounted
      isMounted.current = false;
      
      // Abort any pending fetch
      if (activeFetch.current) {
        activeFetch.current.abort();
        activeFetch.current = null;
      }
    };
  }, [fetchTeamMetrics, debouncedFetchTeamMetrics]);

  return {
    metrics,
    isLoading,
    lastUpdated,
    error,
    refreshMetrics: debouncedFetchTeamMetrics
  };
};

// Generate mock representative data for demo purposes
const getMockRepData = (): RepMetricsData[] => {
  return [
        {
          id: "1",
          name: "Alex Johnson",
      callVolume: 42,
      successRate: 78,
          sentiment: 0.85,
      insights: [
        "Consistently addresses customer objections",
        "Excellent at building rapport",
        "Could improve on call duration management"
      ]
        },
        {
          id: "2",
      name: "Sam Rodriguez",
      callVolume: 37,
      successRate: 65,
          sentiment: 0.72,
      insights: [
        "Strong product knowledge",
        "Needs to improve closing techniques",
        "Good listening skills"
      ]
    },
    {
      id: "3", 
      name: "Jamie Taylor",
      callVolume: 45,
      successRate: 82,
      sentiment: 0.91,
      insights: [
        "Top performer in conversion rate",
        "Excellent at identifying customer needs",
        "Provides clear value propositions"
      ]
    }
  ];
};

// Function to fetch real representative metrics from Whisper transcriptions
const fetchRealRepMetrics = async (filters?: DataFilters): Promise<RepMetricsData[]> => {
  try {
    // Fetch real transcriptions from WhisperService
    const transcriptions = await getStoredTranscriptions();
    
    if (!transcriptions || transcriptions.length === 0) {
      return []; // Return empty array if no transcriptions
    }
    
    // Filter transcriptions based on date range if provided
    let filteredTranscriptions = [...transcriptions];
    if (filters?.dateRange?.from) {
      filteredTranscriptions = filteredTranscriptions.filter(t => 
        new Date(t.date) >= new Date(filters.dateRange.from)
      );
    }
    
    if (filters?.dateRange?.to) {
      filteredTranscriptions = filteredTranscriptions.filter(t => 
        new Date(t.date) <= new Date(filters.dateRange.to)
      );
    }
    
    // Group transcriptions by rep (speakerName)
    const repTranscriptionsMap = new Map<string, StoredTranscription[]>();
    
    // First, identify all unique rep IDs/names
    const repIds = new Set<string>();
    filteredTranscriptions.forEach(t => {
      const repId = t.speakerName || 'Unknown';
      repIds.add(repId);
    });
    
    // If specific rep IDs are requested, filter to just those
    const targetRepIds = filters?.repIds && filters.repIds.length > 0 
      ? filters.repIds 
      : Array.from(repIds);
    
    // Group transcriptions by rep ID
    filteredTranscriptions.forEach(t => {
      const repId = t.speakerName || 'Unknown';
      
      // Skip if not in our target rep IDs
      if (!targetRepIds.includes(repId)) {
        return;
      }
      
      if (!repTranscriptionsMap.has(repId)) {
        repTranscriptionsMap.set(repId, []);
      }
      
      repTranscriptionsMap.get(repId)?.push(t);
    });
    
    // Calculate metrics for each rep
    const repMetrics: RepMetricsData[] = [];
    
    repTranscriptionsMap.forEach((repTranscriptions, repId) => {
      // Calculate call volume
      const callVolume = repTranscriptions.length;
      
      // Calculate success rate
      const successfulCalls = repTranscriptions.filter(t => 
        t.sentiment === 'positive' || 
        (t.callScore !== undefined && t.callScore > 70)
      ).length;
      
      const successRate = callVolume > 0 ? (successfulCalls / callVolume) * 100 : 0;
      
      // Calculate average sentiment
      const totalSentiment = repTranscriptions.reduce((sum, t) => {
        // Determine sentiment score (convert text sentiment to numeric)
        const sentimentScore = 
          t.sentiment === 'positive' ? 0.8 :
          t.sentiment === 'negative' ? 0.3 : 0.6; // neutral or undefined
        return sum + sentimentScore;
      }, 0);
      
      const avgSentiment = callVolume > 0 ? totalSentiment / callVolume : 0;
      
      // Generate insights for this rep
      const insights: string[] = [];
      
      // Add sentiment-based insight
      if (avgSentiment > 0.7) {
        insights.push("Consistently achieves positive customer sentiment");
      } else if (avgSentiment < 0.5) {
        insights.push("Opportunity to improve customer sentiment");
      }
      
      // Add success rate insight
      if (successRate > 75) {
        insights.push("High conversion rate on calls");
      } else if (successRate < 50) {
        insights.push("Could improve call outcomes");
      }
      
      // Add volume-based insight
      if (callVolume > 10) {
        insights.push("Handles high call volume effectively");
      }
      
      // Add keyword-based insights if available
      const keywordMap: Record<string, number> = {};
      repTranscriptions.forEach(t => {
        if (t.keywords && Array.isArray(t.keywords)) {
          t.keywords.forEach(keyword => {
            if (typeof keyword === 'string') {
              keywordMap[keyword] = (keywordMap[keyword] || 0) + 1;
            }
          });
        }
      });
      
      // Get top keywords for this rep
      const topKeywords = Object.entries(keywordMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([keyword]) => keyword);
        
      if (topKeywords.length > 0) {
        insights.push(`Frequently discusses: ${topKeywords.join(', ')}`);
      }
      
      // Ensure we have at least 3 insights
      while (insights.length < 3) {
        insights.push("Continue applying successful call techniques");
      }
      
      // Limit to top 3 insights
      const limitedInsights = insights.slice(0, 3);
      
      // Add this rep's metrics to the results
      repMetrics.push({
        id: repId,
        name: repId, // Use the repId as name since that's what we have
        callVolume,
        successRate,
        sentiment: avgSentiment,
        insights: limitedInsights
      });
    });
    
    // Sort by call volume (highest first)
    repMetrics.sort((a, b) => b.callVolume - a.callVolume);
    
    return repMetrics;
    } catch (error) {
    console.error('Error fetching real rep metrics:', error);
    return []; // Return empty array on error
  }
};

// Hook for shared rep metrics data
export const useSharedRepMetrics = (filters?: DataFilters) => {
  const [metrics, setMetrics] = useState<RepMetricsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);
  const isInitialRender = useRef(true);
  const pendingRequest = useRef<boolean>(false);
  const requestId = useRef<string>(Math.random().toString(36).substring(2, 9));
  const activeFetch = useRef<AbortController | null>(null);
  const cacheKey = useMemo(() => getCacheKey(filters), [filters]);

  const fetchRepMetrics = useCallback(() => {
    // Use a unique request ID to track this specific request instance
    const currentRequestId = requestId.current;
    
    // Check if a request is already in progress
    if (pendingRequest.current) {
      console.log('Skipping duplicate rep metrics request - one already in progress');
      return;
    }
    
    // Check if we have a recent cache entry for this exact filter combination
    const cachedData = getValidCacheEntry<RepMetricsData[]>(cacheKey);
    if (cachedData) {
      console.log('Using cached rep metrics data');
      if (isMounted.current) {
        setMetrics(cachedData);
        setIsLoading(false);
      }
      return;
    }
    
    // Create an AbortController for this fetch
    const controller = new AbortController();
    activeFetch.current = controller;
    
    // Mark that a request is in progress
    pendingRequest.current = true;
    
    if (isMounted.current) {
      setIsLoading(true);
    }
    
    // Define the asynchronous fetch operation
    const doFetch = async () => {
      try {
        // Skip if already aborted or component unmounted
        if (controller.signal.aborted || !isMounted.current || requestId.current !== currentRequestId) {
          return;
        }
        
        // Use real data from Whisper instead of mock data
        const repMetricsData = await fetchRealRepMetrics(filters);
        
        // Check if component is unmounted or request was cancelled during await
        if (controller.signal.aborted || !isMounted.current || requestId.current !== currentRequestId) {
          console.log('Request cancelled during processing');
          return;
        }
        
        // Check one last time before updating state
        if (isMounted.current && !controller.signal.aborted && requestId.current === currentRequestId) {
          // Cache the result
          setCacheEntry(cacheKey, repMetricsData);
          
          // Update state
          setMetrics(repMetricsData);
          setLastUpdated(new Date().toISOString());
          setError(null);
        }
      } catch (err) {
        // Only set error if component is still mounted and this request is still relevant
        if (isMounted.current && !controller.signal.aborted && requestId.current === currentRequestId) {
          // Check if the error is due to a duplicate request cancellation
          if (err && typeof err === 'object' && 'message' in err && 
              (err.message as string).includes('Duplicate request cancelled')) {
            // Log as warning instead of error for duplicate requests
            console.warn('Duplicate request for shared rep metrics cancelled:', err);
          } else {
            // Log actual errors
            console.error('Error fetching shared rep metrics:', err);
            setError(err instanceof Error ? err : new Error(String(err)));
          }
        }
    } finally {
        // Only update state if this specific request is still relevant
        if (isMounted.current && !controller.signal.aborted && requestId.current === currentRequestId) {
          pendingRequest.current = false;
      setIsLoading(false);
          activeFetch.current = null;
        } else {
          // Still clean up the pending flag to allow new requests
          pendingRequest.current = false;
        }
      }
    };
    
    // Start the fetch process
    doFetch();
    
    // Return a function that can be used to abort this specific fetch
    return () => {
      if (activeFetch.current === controller) {
        controller.abort();
        activeFetch.current = null;
        pendingRequest.current = false;
      }
    };
  }, [cacheKey, filters]);

  // Create a debounced version of fetchRepMetrics
  const debouncedFetchRepMetrics = useCallback(
    debounce(fetchRepMetrics, 500),
    [fetchRepMetrics]
  );

  useEffect(() => {
    // Skip initial render effect for immediate data
    if (isInitialRender.current) {
      isInitialRender.current = false;
      fetchRepMetrics(); // Call non-debounced version for initial load
    } else {
      debouncedFetchRepMetrics();
    }
    
    // Setup cleanup
    return () => {
      isMounted.current = false;
    };
  }, [fetchRepMetrics, debouncedFetchRepMetrics]);

  return {
    metrics,
    isLoading,
    lastUpdated,
    error,
    refreshMetrics: debouncedFetchRepMetrics
  };
};

// Hook for shared keyword data
export const useSharedKeywordData = (filters?: DataFilters) => {
  const [keywords, setKeywords] = useState<KeywordData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  
  // Cached keywords for use across components
  const [cachedKeywords, setCachedKeywords] = useState<Record<string, string[]>>({
    positive: [],
    neutral: [],
    negative: []
  });

  const fetchKeywordData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all keywords with counts
      let query = supabase
        .from('keyword_trends')
        .select('*')
        .order('count', { ascending: false });
        
      // Apply date filtering if available
      if (filters?.dateRange?.from) {
        const fromDate = filters.dateRange.from.toISOString();
        query = query.gte('last_used', fromDate);
      }
      
      if (filters?.dateRange?.to) {
        const toDate = filters.dateRange.to.toISOString();
        query = query.lte('last_used', toDate);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (data) {
        setKeywords(data);
        
        // Update cached keywords by category
        const keywordsByCategory: Record<string, string[]> = {
          positive: [],
          neutral: [],
          negative: []
        };
        
        data.forEach(keyword => {
          if (keyword.category && keywordsByCategory[keyword.category]) {
            keywordsByCategory[keyword.category].push(keyword.keyword);
          }
        });
        
        setCachedKeywords(keywordsByCategory);
        setLastUpdated(new Date().toISOString());
      }
    } catch (error) {
      console.error('Error fetching keyword data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchKeywordData();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('shared-keywords-data')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'keyword_trends' },
        (payload) => {
          console.log('Real-time keyword update received:', payload);
          fetchKeywordData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchKeywordData]);

  return {
    keywords,
    keywordsByCategory: cachedKeywords,
    isLoading,
    lastUpdated,
    refreshKeywords: fetchKeywordData
  };
};

// Hook for shared sentiment data
export const useSharedSentimentData = (filters?: DataFilters) => {
  const [sentiments, setSentiments] = useState<SentimentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchSentimentData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Build query with filters
      let query = supabase
        .from('sentiment_trends')
        .select('*')
        .order('recorded_at', { ascending: true });
        
      // Apply date range filter if provided
      if (filters?.dateRange?.from) {
        const fromDate = filters.dateRange.from.toISOString();
        query = query.gte('recorded_at', fromDate);
      }
      
      if (filters?.dateRange?.to) {
        const toDate = filters.dateRange.to.toISOString();
        query = query.lte('recorded_at', toDate);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (data) {
        const formattedData: SentimentData[] = data.map(item => ({
          label: item.sentiment_label,
          value: item.confidence,
          date: item.recorded_at
        }));
        
        setSentiments(formattedData);
        setLastUpdated(new Date().toISOString());
      }
    } catch (error) {
      console.error('Error fetching sentiment data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSentimentData();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('shared-sentiment-data')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'sentiment_trends' },
        (payload) => {
          console.log('Real-time sentiment trend update received:', payload);
          fetchSentimentData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSentimentData]);

  return {
    sentiments,
    isLoading,
    lastUpdated,
    refreshSentiments: fetchSentimentData
  };
};

// Shared central filter state
export const useSharedFilters = () => {
  const [filters, setFilters] = useState<DataFilters>({
    dateRange: undefined,
    repIds: [],
    callTypes: [],
    productLines: []
  });

  const updateFilters = useCallback((newFilters: Partial<DataFilters>) => {
    setFilters(current => ({
      ...current,
      ...newFilters
    }));
  }, []);

  return {
    filters,
    updateFilters
  };
};

// Hook for accessing transcript data
interface MockTranscript {
  id: string;
  created_at: string;
  duration: number;
  filename: string;
  user_id: string;
  sentiment: string;
  keywords: string[];
}

export const useTranscripts = (filters?: DataFilters) => {
  const [transcripts, setTranscripts] = useState<MockTranscript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);
  const isInitialRender = useRef(true);
  const pendingRequest = useRef<boolean>(false);
  const cacheKey = useMemo(() => getCacheKey(filters), [filters]);

  const fetchTranscripts = useCallback(async () => {
    // Check if a request is already in progress
    if (pendingRequest.current) {
      console.log('Skipping duplicate transcripts request - one already in progress');
      return;
    }
    
    // Check if we have a recent cache entry for this exact filter combination
    const cachedData = getValidCacheEntry<MockTranscript[]>(cacheKey);
    if (cachedData) {
      console.log('Using cached transcripts data');
      if (isMounted.current) {
        setTranscripts(cachedData);
        setIsLoading(false);
      }
      return;
    }
    
    // Mark that a request is in progress
    pendingRequest.current = true;
    if (isMounted.current) {
      setIsLoading(true);
    }
    
    try {
      // Generate mock transcript data instead of fetching from database
      const mockTranscripts = [
        {
          id: "transcript1",
          created_at: new Date().toISOString(),
          duration: 320,
          filename: "call_acme_corp.mp3",
          user_id: "1",
          sentiment: "positive",
          keywords: ["product", "features", "pricing", "demo"]
        },
        {
          id: "transcript2",
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          duration: 450,
          filename: "call_globex_inc.mp3",
          user_id: "1",
          sentiment: "neutral",
          keywords: ["technical", "support", "installation"]
        },
        {
          id: "transcript3",
          created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          duration: 280,
          filename: "call_stark_industries.mp3",
          user_id: "2",
          sentiment: "positive",
          keywords: ["features", "integration", "pricing"]
        },
        {
          id: "transcript4",
          created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
          duration: 350,
          filename: "call_wayne_enterprises.mp3",
          user_id: "2",
          sentiment: "negative",
          keywords: ["technical", "issue", "bugs"]
        },
        {
          id: "transcript5",
          created_at: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
          duration: 400,
          filename: "call_umbrella_corp.mp3",
          user_id: "3",
          sentiment: "positive",
          keywords: ["pricing", "demo", "contract"]
        }
      ];
      
      // Apply filters if provided
      let filteredTranscripts = [...mockTranscripts];
      
      if (filters?.dateRange?.from) {
        const fromDate = new Date(filters.dateRange.from);
        filteredTranscripts = filteredTranscripts.filter(t => 
          new Date(t.created_at) >= fromDate
        );
      }
      
      if (filters?.dateRange?.to) {
        const toDate = new Date(filters.dateRange.to);
        filteredTranscripts = filteredTranscripts.filter(t => 
          new Date(t.created_at) <= toDate
        );
      }
      
      if (filters?.repIds && filters.repIds.length > 0) {
        filteredTranscripts = filteredTranscripts.filter(t => 
          filters.repIds.includes(t.user_id)
        );
      }
      
      if (isMounted.current) {
        setCacheEntry(cacheKey, filteredTranscripts);
        setTranscripts(filteredTranscripts);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching transcripts:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      pendingRequest.current = false;
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [cacheKey, filters]);
  
  // Create a debounced version of fetchTranscripts
  const debouncedFetchTranscripts = useCallback(
    debounce(fetchTranscripts, 500),
    [fetchTranscripts]
  );
  
  useEffect(() => {
    // Skip initial render effect for immediate data
    if (isInitialRender.current) {
      isInitialRender.current = false;
      fetchTranscripts(); // Call non-debounced version for initial load
    } else {
      debouncedFetchTranscripts();
    }
    
    // Cleanup
    return () => {
      isMounted.current = false;
    };
  }, [fetchTranscripts, debouncedFetchTranscripts]);
  
  return {
    transcripts,
    isLoading,
    error,
    fetchTranscripts: debouncedFetchTranscripts
  };
};

// Replace mock data functions with real data fetchers
const fetchRealTeamMetrics = async (filters?: DataFilters): Promise<TeamMetricsData> => {
  try {
    // Fetch real transcriptions from WhisperService
    const transcriptions = await getStoredTranscriptions();
    
    if (!transcriptions || transcriptions.length === 0) {
      return DEFAULT_TEAM_METRICS;
    }
    
    // Filter transcriptions based on date range if provided
    let filteredTranscriptions = [...transcriptions];
    if (filters?.dateRange?.from) {
      filteredTranscriptions = filteredTranscriptions.filter(t => 
        new Date(t.date) >= new Date(filters.dateRange.from)
      );
    }
    
    if (filters?.dateRange?.to) {
      filteredTranscriptions = filteredTranscriptions.filter(t => 
        new Date(t.date) <= new Date(filters.dateRange.to)
      );
    }
    
    // Filter by rep IDs if provided (we'll need to check this field exists or find an alternative)
    if (filters?.repIds && filters.repIds.length > 0) {
      filteredTranscriptions = filteredTranscriptions.filter(t => {
        // Try to match rep ID from speakerName or other identifiers
        const repId = t.speakerName || '';
        return filters.repIds.includes(repId);
      });
    }
    
    // Calculate real metrics from transcription data
    const totalCalls = filteredTranscriptions.length;
    
    // Calculate average sentiment
    const totalSentiment = filteredTranscriptions.reduce((sum, t) => {
      // Determine sentiment score (convert text sentiment to numeric)
      const sentimentScore = 
        t.sentiment === 'positive' ? 0.8 :
        t.sentiment === 'negative' ? 0.3 : 0.6; // neutral or undefined
      return sum + sentimentScore;
    }, 0);
    
    const avgSentiment = totalCalls > 0 ? totalSentiment / totalCalls : 0;
    
    // Extract talk ratio from transcription data - use transcript_segments to calculate
    const talkRatios = filteredTranscriptions.map(t => {
      // Estimate from segments if available
      if (t.transcript_segments && Array.isArray(t.transcript_segments)) {
        let agentTime = 0;
        let customerTime = 0;
        
        t.transcript_segments.forEach(segment => {
          if (segment.speaker === 'agent') {
            agentTime += segment.end - segment.start;
          } else if (segment.speaker === 'customer') {
            customerTime += segment.end - segment.start;
          }
        });
        
        const totalTime = agentTime + customerTime;
        if (totalTime > 0) {
          return {
            agent: Math.round((agentTime / totalTime) * 100),
            customer: Math.round((customerTime / totalTime) * 100)
          };
        }
      }
      
      // Default if we can't determine
      return { agent: 50, customer: 50 };
    });
    
    // Calculate average talk ratio across all calls
    const avgTalkRatio = {
      agent: totalCalls > 0 ? 
        talkRatios.reduce((sum, ratio) => sum + ratio.agent, 0) / totalCalls : 50,
      customer: totalCalls > 0 ? 
        talkRatios.reduce((sum, ratio) => sum + ratio.customer, 0) / totalCalls : 50
    };
    
    // Instead of extracting keywords from transcriptions directly,
    // fetch the latest keywords from the shared keyword data system
    let topKeywords: string[] = [];
    
    try {
      const { data } = await supabase
        .from('keyword_trends')
        .select('keyword, count, category')
        .order('count', { ascending: false })
        .limit(10);
      
      if (data && data.length > 0) {
        topKeywords = data.map(k => k.keyword);
      }
    } catch (keywordError) {
      console.error('Error fetching shared keywords:', keywordError);
      
      // Fallback to extracting from transcriptions
      const keywordCounts: Record<string, number> = {};
      filteredTranscriptions.forEach(t => {
        if (t.keywords && Array.isArray(t.keywords)) {
          t.keywords.forEach(keyword => {
            if (typeof keyword === 'string') {
              keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
            }
          });
        }
      });
      
      topKeywords = Object.entries(keywordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([keyword]) => keyword);
    }
    
    // Calculate performance score based on sentiment, talk ratio, and duration
    const avgDuration = filteredTranscriptions.reduce((sum, t) => sum + (t.duration || 0), 0) / Math.max(1, totalCalls);
    
    const performanceScore = calculatePerformanceScore(
      avgSentiment,
      avgTalkRatio,
      avgDuration
    );
    
    // Calculate conversion rate (success rate)
    const successfulCalls = filteredTranscriptions.filter(t => 
      t.sentiment === 'positive' || 
      (t.callScore !== undefined && t.callScore > 70)
    ).length;
    
    const conversionRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;
    
    return {
      totalCalls,
      avgSentiment,
      avgTalkRatio,
      topKeywords,
      performanceScore,
      conversionRate
    };
  } catch (error) {
    console.error('Error fetching real team metrics:', error);
    return DEFAULT_TEAM_METRICS;
  }
};
