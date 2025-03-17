
import { useState, useEffect, useCallback } from 'react';

// Generic data provider hook for charts
export function useChartData<T>(
  initialData: T,
  fetchFunction?: () => Promise<T>,
  autoRefreshInterval?: number
) {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Function to update the last updated timestamp
  const updateTimestamp = useCallback(() => {
    const now = new Date();
    setLastUpdated(now.toLocaleTimeString());
  }, []);

  // Function to fetch data
  const fetchData = useCallback(async () => {
    if (!fetchFunction) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const newData = await fetchFunction();
      setData(newData);
      updateTimestamp();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      console.error('Error fetching chart data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFunction, updateTimestamp]);

  // Refresh data manually
  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Set up auto-refresh interval if specified
  useEffect(() => {
    if (autoRefreshInterval && fetchFunction) {
      // Initial fetch
      fetchData();
      
      // Set up interval for subsequent fetches
      const intervalId = setInterval(fetchData, autoRefreshInterval);
      
      // Clean up interval on unmount
      return () => clearInterval(intervalId);
    }
  }, [autoRefreshInterval, fetchData, fetchFunction]);

  // Simulate real-time data updates for development (random data)
  const simulateDataUpdate = useCallback(() => {
    setIsLoading(true);
    
    // Wait for a short time to simulate network request
    setTimeout(() => {
      // Shallow copy data for modification
      if (Array.isArray(data)) {
        const newData = [...data] as any;
        // Update with slight variations
        newData.forEach((item: any) => {
          if (typeof item === 'object') {
            Object.keys(item).forEach(key => {
              if (typeof item[key] === 'number' && key !== 'id') {
                // Add small random variation
                item[key] = Math.max(0, item[key] + (Math.random() * 10 - 5));
              }
            });
          }
        });
        setData(newData as T);
      }
      
      updateTimestamp();
      setIsLoading(false);
    }, 800);
  }, [data, updateTimestamp]);

  return {
    data,
    setData,
    isLoading,
    error,
    lastUpdated,
    refresh,
    simulateDataUpdate
  };
}
