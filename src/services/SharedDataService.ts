import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";
import React from "react";
import { getStoredTranscriptions, StoredTranscription as WhisperStoredTranscription } from '@/services/WhisperService';
import { differenceInDays } from 'date-fns';
import { metricsCache, apiCache } from './CacheService';
import { errorHandler } from './ErrorHandlingService';

// Constants
const METRICS_CACHE_TTL = 60000; // 60 seconds for metrics data
const SHARED_DATA_CACHE_TTL = 5000; // 5 seconds for shared data

// Function to get cache key from filters
const getCacheKey = (filters?: DataFilters): string => {
  return JSON.stringify(filters || {});
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
  avgCallDuration?: number;
  callOutcomes?: {
    successful: number;
    unsuccessful: number;
  };
}

export interface RepMetricsData {
  id: string;
  name?: string;
  callVolume: number;
  successRate: number;
  sentiment: number;
  topKeywords: string[];
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
  avgTalkRatio: { agent: 0, customer: 0 },
  topKeywords: [],
  performanceScore: 0,
  conversionRate: 0,
  avgCallDuration: 0,
  callOutcomes: { successful: 0, unsuccessful: 0 }
};

const DEFAULT_REP_METRICS: RepMetricsData[] = [];

// Debug validation helper
export const validateDataConsistency = (
  dataSource: string,
  metrics: Partial<TeamMetricsData> | RepMetricsData[],
  filters?: DataFilters
) => {
  console.debug(`Data validation [${dataSource}]`, {
    metrics,
    filters,
    timestamp: new Date().toISOString()
  });
  
  // Check if metrics is an array (RepMetricsData[])
  if (Array.isArray(metrics)) {
    // Validation for RepMetricsData array
    if (metrics.length > 0) {
      const firstRep = metrics[0];
      if (firstRep.successRate < 0 || firstRep.successRate > 1) {
        console.warn('Data consistency warning: successRate out of range [0-1]');
      }
    }
    return;
  }
  
  // Validation rules for TeamMetricsData
  if (metrics.totalCalls !== undefined && metrics.totalCalls < 0) {
    console.warn('Data consistency warning: totalCalls is negative');
  }
  
  if (metrics.avgSentiment !== undefined && (metrics.avgSentiment < 0 || metrics.avgSentiment > 1)) {
    console.warn('Data consistency warning: avgSentiment out of range [0-1]');
  }
  
  if (metrics.performanceScore !== undefined && (metrics.performanceScore < 0 || metrics.performanceScore > 100)) {
    console.warn('Data consistency warning: performanceScore out of range [0-100]');
  }
};

// Utility metrics calculation functions
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

// Mock API call for team metrics data
const simulateTeamMetricsApiCall = async (filters?: DataFilters) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  console.warn('WARNING: Using default zero metrics. Data should be coming from Supabase. Please ensure tables are created and data is synced.');
  
  // Return zero metrics instead of simulated data
  const zeroMetrics: TeamMetricsData = {
    totalCalls: 0,
    avgSentiment: 0,
    avgTalkRatio: { agent: 0, customer: 0 },
    topKeywords: [],
    performanceScore: 0,
    conversionRate: 0,
    avgCallDuration: 0,
    callOutcomes: {
      successful: 0,
      unsuccessful: 0
    }
  };
  
  return zeroMetrics;
};

// Mock API call for rep metrics data
const simulateRepMetricsApiCall = async (filters?: DataFilters) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  console.warn('WARNING: Using empty rep metrics data. Data should be coming from Supabase. Please ensure tables are created and data is synced.');
  
  // Return empty array instead of simulated data
  return [];
};

// Hook for accessing team metrics data with caching
export const useSharedTeamMetrics = (filters?: DataFilters) => {
  const [metrics, setMetrics] = useState<TeamMetricsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchAttempts = useRef(0);

  // Generate consistent cache key
  const cacheKey = useMemo(() => `team-metrics-${getCacheKey(filters)}`, [filters]);
  
  const fetchTeamMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Check cache first
      const cachedData = metricsCache.get<TeamMetricsData>(cacheKey);
      if (cachedData) {
        setMetrics(cachedData);
        setIsLoading(false);
        return;
      }
      
      // Use simulation data for now
      const simulatedMetrics = await simulateTeamMetricsApiCall(filters);
      
      // Validate data consistency
      validateDataConsistency('simulated', simulatedMetrics, filters);
      
      // Cache the results
      metricsCache.set(cacheKey, simulatedMetrics, METRICS_CACHE_TTL);
      
      setMetrics(simulatedMetrics);
      setError(null);
      
      // For future: When database tables are ready, try to fetch from there
      /* 
      try {
        // Try to fetch from database table (when it exists)
        const { data, error: dbError } = await supabase
          .from('call_metrics_summary')
          .select('*')
          .limit(1)
          .maybeSingle();
          
        if (dbError) throw dbError;
        
        if (data) {
          // Process database data
          // ...
        } else {
          // Use simulation data
          const simulatedMetrics = await simulateTeamMetricsApiCall(filters);
          setMetrics(simulatedMetrics);
          metricsCache.set(cacheKey, simulatedMetrics, METRICS_CACHE_TTL);
        }
      } catch (dbError) {
        console.warn('Database not available, using simulated data');
        const simulatedMetrics = await simulateTeamMetricsApiCall(filters);
        setMetrics(simulatedMetrics);
        metricsCache.set(cacheKey, simulatedMetrics, METRICS_CACHE_TTL);
      }
      */
    } catch (err) {
      // Increase fetch attempts
      fetchAttempts.current += 1;
      
      console.error('Error fetching team metrics:', err);
      
      // Only log detailed errors for first few attempts to avoid error spam
      if (fetchAttempts.current < 5) {
        errorHandler.handle(`Error fetching team metrics: ${err}`);
      }
      
      // Set error state
      setError(err instanceof Error ? err : new Error('Unknown error fetching team metrics'));
      
      // Fallback to default metrics
      setMetrics(DEFAULT_TEAM_METRICS);
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, filters]);
  
  const refreshMetrics = useCallback(async () => {
    // Clear cache and refetch
    metricsCache.clear(); // Use clear() instead of delete()
    await fetchTeamMetrics();
  }, [fetchTeamMetrics]);
  
  // Effect to fetch metrics on mount and when filters change
  useEffect(() => {
    fetchTeamMetrics();
    
    // Reset fetch attempts on filter change
    fetchAttempts.current = 0;
  }, [fetchTeamMetrics]);
  
  return { 
    metrics: metrics || DEFAULT_TEAM_METRICS, 
    isLoading, 
    error,
    refreshMetrics 
  };
};

// Hook for accessing rep metrics data with caching
export const useSharedRepMetrics = (filters?: DataFilters) => {
  const [metrics, setMetrics] = useState<RepMetricsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchAttempts = useRef(0);

  // Generate consistent cache key
  const cacheKey = useMemo(() => `rep-metrics-${getCacheKey(filters)}`, [filters]);
  
  const fetchRepMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Check cache first
      const cachedData = metricsCache.get<RepMetricsData[]>(cacheKey);
      if (cachedData) {
        setMetrics(cachedData);
        setIsLoading(false);
        return;
      }
      
      // Use simulation data for now
      const simulatedMetrics = await simulateRepMetricsApiCall(filters);
      
      // Validate data consistency
      validateDataConsistency('simulated', simulatedMetrics, filters);
      
      // Cache the results
      metricsCache.set(cacheKey, simulatedMetrics, METRICS_CACHE_TTL);
      
      setMetrics(simulatedMetrics);
      setError(null);
      
      // For future: When database tables are ready, try to fetch from there
      /*
      try {
        // Try to fetch from database (when it exists)
        const { data, error: dbError } = await supabase
          .from('rep_metrics_summary')
          .select('*');
          
        if (dbError) throw dbError;
        
        if (data && data.length > 0) {
          // Process database data
          // ...
        } else {
          // Use simulation data
          const simulatedMetrics = await simulateRepMetricsApiCall(filters);
          setMetrics(simulatedMetrics);
          metricsCache.set(cacheKey, simulatedMetrics, METRICS_CACHE_TTL);
        }
      } catch (dbError) {
        console.warn('Database not available, using simulated data');
        const simulatedMetrics = await simulateRepMetricsApiCall(filters);
        setMetrics(simulatedMetrics);
        metricsCache.set(cacheKey, simulatedMetrics, METRICS_CACHE_TTL);
      }
      */
    } catch (err) {
      // Increase fetch attempts
      fetchAttempts.current += 1;
      
      console.error('Error fetching rep metrics:', err);
      
      // Only log detailed errors for first few attempts to avoid error spam
      if (fetchAttempts.current < 5) {
        errorHandler.handle(`Error fetching rep metrics: ${err}`);
      }
      
      // Set error state
      setError(err instanceof Error ? err : new Error('Unknown error fetching rep metrics'));
      
      // Fallback to default metrics
      setMetrics(DEFAULT_REP_METRICS);
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, filters]);
  
  const refreshMetrics = useCallback(async () => {
    // Clear cache and refetch
    metricsCache.clear(); // Use clear() instead of delete()
    await fetchRepMetrics();
  }, [fetchRepMetrics]);
  
  // Effect to fetch metrics on mount and when filters change
  useEffect(() => {
    fetchRepMetrics();
    
    // Reset fetch attempts on filter change
    fetchAttempts.current = 0;
  }, [fetchRepMetrics]);
  
  return { 
    metrics, 
    isLoading, 
    error,
    refreshMetrics 
  };
};

// Hook for keyword trends data with caching
export const useKeywordTrends = (filters?: DataFilters) => {
  const [keywordData, setKeywordData] = useState<KeywordData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Generate consistent cache key
  const cacheKey = useMemo(() => `keyword-trends-${getCacheKey(filters)}`, [filters]);
  
  const fetchKeywordTrends = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Check cache first
      const cachedData = metricsCache.get<KeywordData[]>(cacheKey);
      if (cachedData) {
        setKeywordData(cachedData);
        setIsLoading(false);
        return;
      }
      
      // Simulate API call
      const simulatedApiCall = async () => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Sample keywords
        const keywords = [
          'pricing', 'features', 'timeline', 'support', 
          'integration', 'customization', 'training', 'onboarding',
          'security', 'compliance', 'reliability', 'performance',
          'user interface', 'documentation', 'api', 'scalability'
        ];
        
        // Sample categories
        const categories = [
          'product', 'service', 'sales', 'technical', 'objection'
        ];
        
        // Generate random keyword data
        return keywords
          .sort(() => Math.random() - 0.5)
          .slice(0, 10)
          .map(keyword => ({
            keyword,
            count: Math.floor(Math.random() * 50) + 5,
            category: categories[Math.floor(Math.random() * categories.length)]
          }))
          .sort((a, b) => b.count - a.count); // Sort by count descending
      };
      
      const data = await simulatedApiCall();
      
      // Cache the results
      metricsCache.set(cacheKey, data, METRICS_CACHE_TTL);
      
      setKeywordData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching keyword trends:', err);
      setError(err instanceof Error ? err : new Error('Unknown error fetching keyword trends'));
      
      errorHandler.handle(`Error fetching keyword trends: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, filters]);
  
  useEffect(() => {
    fetchKeywordTrends();
    
    // Set up polling for real-time updates with reduced frequency
    const pollInterval = setInterval(fetchKeywordTrends, 60000); // Every minute
    
    return () => {
      clearInterval(pollInterval);
    };
  }, [fetchKeywordTrends]);
  
  return { keywordData, isLoading, error, refetch: fetchKeywordTrends };
};

// Hook for sentiment trends data with caching
export const useSentimentTrends = (filters?: DataFilters) => {
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Generate consistent cache key
  const cacheKey = useMemo(() => `sentiment-trends-${getCacheKey(filters)}`, [filters]);
  
  const fetchSentimentTrends = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Check cache first
      const cachedData = metricsCache.get<SentimentData[]>(cacheKey);
      if (cachedData) {
        setSentimentData(cachedData);
        setIsLoading(false);
        return;
      }
      
      // Simulate API call
      const simulatedApiCall = async () => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Generate dates for the last 7 days
        const dates = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date.toISOString().split('T')[0];
        }).reverse();
        
        // Generate sentiment data
        const sentiments = ['positive', 'neutral', 'negative'];
        const data: SentimentData[] = [];
        
        for (const date of dates) {
          for (const sentiment of sentiments) {
            data.push({
              label: sentiment,
              value: Math.floor(Math.random() * 
                (sentiment === 'positive' ? 60 : 
                  sentiment === 'neutral' ? 40 : 20)
              ) + (sentiment === 'positive' ? 30 : 
                sentiment === 'neutral' ? 20 : 5),
              date
            });
          }
        }
        
        return data;
      };
      
      const data = await simulatedApiCall();
      
      // Cache the results
      metricsCache.set(cacheKey, data, METRICS_CACHE_TTL);
      
      setSentimentData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching sentiment trends:', err);
      setError(err instanceof Error ? err : new Error('Unknown error fetching sentiment trends'));
      
      errorHandler.handle(`Error fetching sentiment trends: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, filters]);
  
  useEffect(() => {
    fetchSentimentTrends();
    
    // Set up polling for real-time updates with reduced frequency
    const pollInterval = setInterval(fetchSentimentTrends, 60000); // Every minute
    
    return () => {
      clearInterval(pollInterval);
    };
  }, [fetchSentimentTrends]);
  
  return { sentimentData, isLoading, error, refetch: fetchSentimentTrends };
};

// Function to clear all metrics caches
export const clearMetricsCaches = () => {
  metricsCache.clear();
  console.log('All metrics caches cleared');
};

// Export specific clear functions for testing
export const clearCache = {
  teamMetrics: () => {
    metricsCache.clear();
  },
  repMetrics: () => {
    metricsCache.clear();
  },
  all: clearMetricsCaches
};

// Hook for shared keyword data with organized categories (adapter for useKeywordTrends)
export const useSharedKeywordData = (filters?: DataFilters) => {
  const { keywordData, isLoading, error } = useKeywordTrends(filters);
  const [keywordsByCategory, setKeywordsByCategory] = useState<Record<string, string[]>>({
    positive: [],
    neutral: [],
    negative: []
  });
  const [keywords, setKeywords] = useState<string[]>([]);
  
  // Process keywordData into categories when it changes
  useEffect(() => {
    if (keywordData && keywordData.length > 0) {
      const categorized: Record<string, string[]> = {
        positive: [],
        neutral: [],
        negative: []
      };
      
      const allKeywords: string[] = [];
      
      // Process keywords and assign them to categories
      keywordData.forEach(item => {
        // Add to all keywords list
        allKeywords.push(item.keyword);
        
        // Map API categories to our UI categories
        let category = 'neutral';
        if (item.category === 'product' || item.category === 'service') {
          category = 'positive';
        } else if (item.category === 'objection') {
          category = 'negative';
        }
        
        // Add to the appropriate category
        if (!categorized[category]) {
          categorized[category] = [];
        }
        categorized[category].push(item.keyword);
      });
      
      setKeywordsByCategory(categorized);
      setKeywords(allKeywords);
    } else {
      // Reset to defaults if no data
      setKeywordsByCategory({
        positive: [],
        neutral: [],
        negative: []
      });
      setKeywords([]);
    }
  }, [keywordData]);
  
  return { 
    keywords,
    keywordsByCategory,
    isLoading,
    error,
  };
};

/**
 * Get metrics for a specific sales rep by ID
 * This is a direct function (not a hook) for use in non-component contexts
 */
export const getRepMetricsForId = async (repId: string): Promise<{
  callVolume: number;
  successRate: number;
  sentiment: number;
  topKeywords: string[];
  insights: string[];
} | null> => {
  try {
    // Check cache first
    const cacheKey = `rep-metrics-${repId}`;
    const cachedData = metricsCache.get<{
      callVolume: number;
      successRate: number;
      sentiment: number;
      topKeywords: string[];
      insights: string[];
    }>(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }
    
    // For demo/development, create simulated data
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Create rep data with random values but consistent for same ID
    const numFromId = repId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (min: number, max: number) => {
      const seed = numFromId % 1000 / 1000;
      return Math.floor((seed * (max - min) + min));
    };
    
    const repData = {
      callVolume: random(20, 100),
      successRate: random(50, 95),
      sentiment: random(60, 90) / 100,
      topKeywords: ['product', 'pricing', 'support', 'feature'].slice(0, random(2, 4)),
      insights: [
        'Frequently discusses pricing',
        'Good at handling objections',
        'Could improve product knowledge'
      ].slice(0, random(1, 3))
    };
    
    // Cache the results
    metricsCache.set(cacheKey, repData, METRICS_CACHE_TTL);
    
    return repData;
  } catch (error) {
    console.error('Error fetching rep metrics:', error);
    errorHandler.handle(`Error fetching sales rep metrics: ${error}`);
    return null;
  }
};

// Debug log to confirm file is loaded and exports are available
console.log('[DEBUG] SharedDataService loaded, exports:', {
  useSharedTeamMetrics: typeof useSharedTeamMetrics,
  useSharedRepMetrics: typeof useSharedRepMetrics,
  useSharedKeywordData: typeof useSharedKeywordData,
  useKeywordTrends: typeof useKeywordTrends,
  getRepMetricsForId: typeof getRepMetricsForId
});

// Use the exact interface from WhisperService, but enhance it with userId for our needs 
export interface StoredTranscription extends WhisperStoredTranscription {
  userId?: string;
  transcriptText?: string;
}

// Debounce utility function
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
