import { useState, useEffect, useMemo, useCallback } from 'react';
import { metricsService } from '@/services/MetricsService';
import { metricsRepository } from '@/repositories/MetricsRepository';
import { 
  CallMetrics, 
  RepMetrics, 
  MetricsFilter, 
  DashboardMetrics,
  MetricsResponse
} from '@/types/metrics';
import { errorHandler } from '@/services/ErrorHandlingService';
import { useSharedFilters } from '@/contexts/SharedFilterContext';

// Debounce function for performance optimization
const debounce = <F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
) => {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<F>): Promise<ReturnType<F>> => {
    return new Promise(resolve => {
      if (timeout) {
        clearTimeout(timeout);
      }
      
      timeout = setTimeout(() => {
        resolve(func(...args));
      }, waitFor);
    });
  };
};

/**
 * Hook for accessing global call metrics
 * @param filter Optional filters to apply
 * @returns Global call metrics with loading state
 */
export function useGlobalMetrics(
  filter?: MetricsFilter
): MetricsResponse<CallMetrics> {
  const [data, setData] = useState<CallMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<string>(new Date().toISOString());
  const { filters: contextFilters } = useSharedFilters();
  
  // Merge context filters with provided filters
  const mergedFilters = useMemo(() => {
    return { ...contextFilters, ...filter };
  }, [contextFilters, filter]);
  
  // Load data
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        setLoading(true);
        const metrics = await metricsService.getGlobalCallMetrics();
        
        if (isMounted) {
          setData(metrics);
          setError(null);
          setTimestamp(new Date().toISOString());
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load metrics');
          errorHandler.handleError({
            message: 'Failed to load global metrics',
            technical: err,
            severity: 'error',
            code: 'METRICS_HOOK_ERROR'
          }, 'useGlobalMetrics');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [JSON.stringify(mergedFilters)]);
  
  // Return data with loading state
  return { data, loading, error, timestamp };
}

/**
 * Hook for accessing rep metrics
 * @param repId ID of the rep
 * @returns Rep metrics with loading state
 */
export function useRepMetrics(
  repId: string
): MetricsResponse<RepMetrics> {
  const [data, setData] = useState<RepMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<string>(new Date().toISOString());
  
  // Load data
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        setLoading(true);
        const metrics = await metricsService.getRepMetrics(repId);
        
        if (isMounted) {
          setData(metrics);
          setError(null);
          setTimestamp(new Date().toISOString());
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load rep metrics');
          errorHandler.handleError({
            message: `Failed to load metrics for rep: ${repId}`,
            technical: err,
            severity: 'error',
            code: 'REP_METRICS_HOOK_ERROR'
          }, 'useRepMetrics');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    if (repId) {
      loadData();
    } else {
      setData(null);
      setLoading(false);
      setError('No rep ID provided');
    }
    
    return () => {
      isMounted = false;
    };
  }, [repId]);
  
  // Return data with loading state
  return { data, loading, error, timestamp };
}

/**
 * Hook for accessing dashboard metrics
 * @param filter Optional filters to apply
 * @returns Dashboard metrics with loading state
 */
export function useDashboardMetrics(
  filter?: MetricsFilter
): MetricsResponse<DashboardMetrics> {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<string>(new Date().toISOString());
  const { filters: contextFilters } = useSharedFilters();
  
  // Merge context filters with provided filters
  const mergedFilters = useMemo(() => {
    return { ...contextFilters, ...filter };
  }, [contextFilters, filter]);
  
  // Debounced fetch function
  const debouncedFetch = useCallback(
    debounce(async (filters: MetricsFilter) => {
      try {
        return await metricsRepository.getDashboardMetrics(filters);
      } catch (err) {
        errorHandler.handleError({
          message: 'Failed to load dashboard metrics',
          technical: err,
          severity: 'error',
          code: 'DASHBOARD_METRICS_HOOK_ERROR'
        }, 'useDashboardMetrics');
        throw err;
      }
    }, 300),
    []
  );
  
  // Load data
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        setLoading(true);
        const metrics = await debouncedFetch(mergedFilters);
        
        if (isMounted) {
          setData(metrics);
          setError(null);
          setTimestamp(new Date().toISOString());
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [JSON.stringify(mergedFilters), debouncedFetch]);
  
  // Return data with loading state
  return { data, loading, error, timestamp };
}

/**
 * Hook for accessing call metrics for a specific call
 * @param callId ID of the call
 * @returns Call metrics with loading state
 */
export function useCallMetrics(
  callId: string
): MetricsResponse<CallMetrics> {
  const [data, setData] = useState<CallMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<string>(new Date().toISOString());
  
  // Load data
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Fetch call metrics from database
        const callData = await metricsRepository.getCallMetrics(callId);
        
        if (!callData) {
          throw new Error('Call metrics not found');
        }
        
        // Transform database format to application format
        const metrics: CallMetrics = {
          duration: callData.duration || 0,
          words: 0, // Not stored in calls table
          talkRatio: {
            agent: callData.talk_ratio_agent || 50,
            customer: callData.talk_ratio_customer || 50
          },
          speakingSpeed: {
            overall: callData.speaking_speed || 150,
            agent: 150, // Not stored directly
            customer: 150 // Not stored directly
          },
          fillerWords: {
            count: callData.filler_word_count || 0,
            perMinute: callData.filler_word_count 
              ? (callData.filler_word_count / Math.max(callData.duration / 60, 1))
              : 0,
            breakdown: {} // Not stored in calls table
          },
          objections: {
            count: callData.objection_count || 0,
            instances: [] // Not stored in calls table
          },
          sentiment: callData.sentiment_agent > 0.6 ? "positive" : 
                   callData.sentiment_agent < 0.4 ? "negative" : "neutral",
          customerEngagement: callData.customer_engagement || 50,
          confidence: callData.metrics_confidence || 0.7
        };
        
        if (isMounted) {
          setData(metrics);
          setError(null);
          setTimestamp(new Date().toISOString());
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load call metrics');
          errorHandler.handleError({
            message: `Failed to load metrics for call: ${callId}`,
            technical: err,
            severity: 'error',
            code: 'CALL_METRICS_HOOK_ERROR'
          }, 'useCallMetrics');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    if (callId) {
      loadData();
    } else {
      setData(null);
      setLoading(false);
      setError('No call ID provided');
    }
    
    return () => {
      isMounted = false;
    };
  }, [callId]);
  
  // Return data with loading state
  return { data, loading, error, timestamp };
}

/**
 * Hook for refreshing metrics
 * @returns Function to trigger metrics refresh
 */
export function useRefreshMetrics() {
  const refresh = useCallback(async (transcriptId?: string) => {
    try {
      if (transcriptId) {
        // Refresh metrics for a specific transcript
        await metricsService.updateMetrics(transcriptId);
      } else {
        // Trigger summary tables update
        await metricsRepository.triggerMetricsSummaryUpdate();
      }
      
      return true;
    } catch (err) {
      errorHandler.handleError({
        message: 'Failed to refresh metrics',
        technical: err,
        severity: 'error',
        code: 'REFRESH_METRICS_ERROR'
      }, 'useRefreshMetrics');
      
      return false;
    }
  }, []);
  
  return refresh;
} 