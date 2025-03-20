import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Creates a stable loading state to prevent UI flickering and improve perceived performance
 * 
 * @param isLoading Current loading state
 * @param minLoadingTime Minimum time to show loading state in ms
 * @returns Stabilized loading state
 */
export const useStableLoadingState = (isLoading: boolean, minLoadingTime: number = 1200): boolean => {
  const [stableLoading, setStableLoading] = useState(isLoading);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const previousLoadingRef = useRef(isLoading);
  const initialRenderRef = useRef(true);
  
  // Clear timeout on unmount
  const clearLoadingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);
  
  useEffect(() => {
    // On first render, just set the state without transitions
    if (initialRenderRef.current) {
      setStableLoading(isLoading);
      initialRenderRef.current = false;
      if (isLoading) {
        startTimeRef.current = Date.now();
      }
      return;
    }
    
    // If loading state changed
    if (isLoading !== previousLoadingRef.current) {
      // If moving to loading state
      if (isLoading) {
        // When starting to load, set loading state immediately
        setStableLoading(true);
        startTimeRef.current = Date.now();
        clearLoadingTimeout();
      } 
      // If leaving loading state
      else {
        const elapsedTime = Date.now() - startTimeRef.current;
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
        
        // Ensure minimum loading time to prevent flickers
        // Add a small buffer (200ms) to ensure smooth transition
        clearLoadingTimeout();
        
        // If we've been in loading state for a significant amount of time,
        // maintain loading state for the minimum duration 
        if (elapsedTime > 300) {
          console.log(`Maintaining loading state for ${remainingTime + 200}ms to prevent flicker`);
          timeoutRef.current = setTimeout(() => {
            setStableLoading(false);
          }, remainingTime + 200);
        } else if (previousLoadingRef.current) {
          // If loading state was very brief but we were previously loading,
          // add a short delay before removing loading state
          timeoutRef.current = setTimeout(() => {
            setStableLoading(false);
          }, 300);
        } else {
          // If loading was very brief and we weren't previously loading, 
          // don't show loading state at all
          setStableLoading(false);
        }
      }
      
      // Update previous state
      previousLoadingRef.current = isLoading;
    }
    
    return clearLoadingTimeout;
  }, [isLoading, minLoadingTime, clearLoadingTimeout]);
  
  return stableLoading;
};

export default useStableLoadingState;
