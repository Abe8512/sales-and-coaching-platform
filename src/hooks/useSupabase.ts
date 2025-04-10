import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '../integrations/supabase/customClient';
import { errorBridgeService, ErrorCategory } from '../services/ErrorBridgeService';

/**
 * Generic hook for Supabase data fetching with loading and error states.
 * The query function MUST return a Promise resolving to { data, error }.
 */
export function useSupabaseQuery<T>(
  query: (supabase: ReturnType<typeof getSupabaseClient>) => Promise<{ data: T | null; error: any } | { data: T[] | null; error: any }>,
  dependencies: any[] = [],
  errorCategory: ErrorCategory = ErrorCategory.DATABASE
) {
  const [data, setData] = useState<T | T[] | null>(null); // Allow data to be single or array
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    let resultData: T | T[] | null = null;
    let resultError: any = null;
    try {
      setLoading(true);
      const supabase = getSupabaseClient();
      // Await the result of the query function passed in
      const { data: fetchedData, error: fetchedError } = await query(supabase);
      resultData = fetchedData;
      resultError = fetchedError;

      if (resultError) {
        throw resultError;
      }
      setData(resultData);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      // Use the specific error returned by Supabase if available in context
      errorBridgeService.reportError(error, errorCategory, { supabaseError: resultError, context: dependencies }); 
      console.error('Error in useSupabaseQuery:', error, resultError);
    } finally {
      setLoading(false);
    }
  }, dependencies); // Include query function itself? Might cause loops if unstable.

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, error, loading, refetch: fetchData };
}

/**
 * Hook for fetching dashboard metrics (now directly from summary table).
 */
export function useDashboardMetrics(timeFrame: string = '30days') {
  // Construct the ID based on the timeframe (or use a fixed ID like 'global_all')
  // This needs to match how DataSyncService creates the summary ID.
  // Assuming 'global_all' for now, ignoring timeFrame parameter.
  const summaryId = 'global_all'; 

  return useSupabaseQuery(
    async (supabase) => 
      await supabase
        .from('call_metrics_summary') // Query the base table
        .select('*')
        .eq('id', summaryId) // Filter by the specific summary ID
        .maybeSingle(), 
    [summaryId], // Depend on the ID used
    ErrorCategory.DATABASE
  );
}

/**
 * Hook for refreshing the materialized view
 */
export function useRefreshMetrics() {
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const refreshMetrics = useCallback(async (fullRefresh: boolean = false) => {
    try {
      setRefreshing(true);
      const supabase = getSupabaseClient();
      
      const { error } = await supabase.rpc('refresh_dashboard_metrics', {
        perform_full_refresh: fullRefresh
      });

      if (error) {
        throw error;
      }

      setLastRefreshed(new Date());
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      errorBridgeService.reportError(
        error,
        ErrorCategory.DATABASE,
        { operation: 'refresh_metrics', fullRefresh }
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  return { refreshMetrics, refreshing, lastRefreshed, error };
}

/**
 * Hook for fetching the metrics health dashboard
 */
export function useMetricsHealth() {
  return useSupabaseQuery(
    // Ensure the function is async and awaits the query result
    async (supabase) => 
      await supabase
        .from('metrics_health_dashboard')
        .select('*')
        .maybeSingle(), // Use maybeSingle as the view might return 0 or 1 row
    [],
    ErrorCategory.DATABASE
  );
}

/**
 * Hook for fetching the metrics consistency log
 */
export function useMetricsConsistencyLog() {
  return useSupabaseQuery(
    // Ensure the function is async and awaits the query result
    async (supabase) => 
      await supabase
        .from('metrics_consistency_log')
        .select('*')
        .order('check_time', { ascending: false }), // Returns Promise<{ data: T[] | null, error: PostgrestError | null }>
    [],
    ErrorCategory.DATABASE
  );
}

/**
 * Hook for fetching the metrics anomaly log
 */
export function useMetricsAnomalyLog() {
  return useSupabaseQuery(
    // Ensure the function is async and awaits the query result
    async (supabase) => 
      await supabase
        .from('metrics_anomaly_log')
        .select('*')
        .order('detection_time', { ascending: false }), // Returns Promise<{ data: T[] | null, error: PostgrestError | null }>
    [],
    ErrorCategory.DATABASE
  );
}

/**
 * Hook for running the metrics health checks
 */
export function useRunMetricsHealthChecks() {
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const runHealthChecks = useCallback(async () => {
    try {
      setRunning(true);
      const supabase = getSupabaseClient();
      
      const { error } = await supabase.rpc('run_metrics_health_checks');

      if (error) {
        throw error;
      }

      setLastRun(new Date());
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      errorBridgeService.reportError(
        error,
        ErrorCategory.DATABASE,
        { operation: 'run_metrics_health_checks' }
      );
    } finally {
      setRunning(false);
    }
  }, []);

  return { runHealthChecks, running, lastRun, error };
}
