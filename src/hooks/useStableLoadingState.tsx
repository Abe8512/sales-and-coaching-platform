
import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Creates a stable loading state to prevent UI flickering and improve perceived performance
 * 
 * @param isLoading Current loading state
 * @param minLoadingTime Minimum time to show loading state in ms
 * @returns Stabilized loading state
 */
export const useStableLoadingState = (isLoading: boolean, minLoadingTime: number = 500): boolean => {
  const [stableLoading, setStableLoading] = useState(isLoading);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  
  // Clear timeout on unmount
  const clearLoadingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);
  
  useEffect(() => {
    // If moving to loading state
    if (isLoading && !stableLoading) {
      setStableLoading(true);
      startTimeRef.current = Date.now();
      clearLoadingTimeout();
    } 
    // If leaving loading state
    else if (!isLoading && stableLoading) {
      const elapsedTime = Date.now() - startTimeRef.current;
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
      
      // Only show loading state for minimum time to prevent flickers
      clearLoadingTimeout();
      timeoutRef.current = setTimeout(() => {
        setStableLoading(false);
      }, remainingTime);
    }
    
    return clearLoadingTimeout;
  }, [isLoading, stableLoading, minLoadingTime, clearLoadingTimeout]);
  
  return stableLoading;
};

export default useStableLoadingState;
