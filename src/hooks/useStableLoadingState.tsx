import { useState, useEffect, useRef } from "react";

/**
 * Creates a stable loading state to prevent quick flashes of loading indicators
 * @param isLoading Current loading state
 * @param minLoadingTime Minimum time to show loading state in ms
 * @returns Stabilized loading state
 */
export const useStableLoadingState = (isLoading: boolean, minLoadingTime: number = 500): boolean => {
  const [stableLoading, setStableLoading] = useState(isLoading);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (isLoading) {
      setStableLoading(true);
    } else if (stableLoading) {
      // Keep showing loading state for minimum time
      timeoutRef.current = setTimeout(() => {
        setStableLoading(false);
      }, minLoadingTime);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading, stableLoading, minLoadingTime]);
  
  return stableLoading;
};

export default useStableLoadingState;
