/**
 * Animation utilities for smooth transitions
 */
export const animationUtils = {
  /**
   * Smoothly transition between two numeric values to prevent UI jitter
   * @param target Target value to transition to
   * @param current Current value
   * @param step Step size for each transition increment
   * @returns Updated value moving toward target
   */
  smoothTransition: (target: number, current: number, step: number): number => {
    if (Math.abs(target - current) < step) return target;
    return current + (target > current ? step : -step);
  },

  /**
   * Simple easing function for smooth animations
   * @param t Time parameter (0-1)
   * @returns Eased value
   */
  easeOutCubic: (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  },
  
  /**
   * Get stable height measurement to prevent layout shifts
   * @param element DOM element to measure
   * @returns Stabilized height value
   */
  getStableHeight: (element: HTMLElement | null): number => {
    if (!element) return 0;
    // Round to nearest multiple of 8 to prevent small adjustments
    return Math.ceil((element.offsetHeight || 0) / 8) * 8;
  },

  /**
   * Stabilize dimension measurements to prevent UI jitter
   * @param value Raw measurement value
   * @returns Stabilized measurement value
   */
  stabilizeDimension: (value: number): number => {
    // Round to nearest multiple of 8 to prevent small adjustments
    return Math.ceil(value / 8) * 8;
  },

  /**
   * Throttle a function to improve performance
   * @param fn Function to throttle
   * @param delay Delay in milliseconds
   * @returns Throttled function
   */
  throttle: <T extends (...args: any[]) => any>(fn: T, delay: number): (T & { cancel: () => void }) | null => {
    if (!fn) return null;
    
    let lastCall = 0;
    let timeoutId: number | null = null;
    let lastArgs: Parameters<T> | null = null;
    let lastThisContext: unknown = null;
    
    const throttled = function(this: unknown, ...args: Parameters<T>) {
      const now = Date.now();
      const timeSinceLastCall = now - lastCall;
      
      // Store the most recent context and arguments
      lastArgs = args;
      lastThisContext = this;
      
      if (timeSinceLastCall >= delay) {
        // Execute immediately if enough time has passed
        lastCall = now;
        fn.apply(this, args);
        lastArgs = null;
        lastThisContext = null;
      } else if (timeoutId === null) {
        // Schedule a trailing call with the most recent arguments
        timeoutId = window.setTimeout(() => {
          lastCall = Date.now();
          timeoutId = null;
          
          // Only call if we have stored arguments
          if (lastArgs !== null && lastThisContext !== null) {
            fn.apply(lastThisContext, lastArgs);
            lastArgs = null;
            lastThisContext = null;
          }
        }, delay - timeSinceLastCall);
      }
      // If a call is already scheduled, we'll use those arguments
    } as T & { cancel: () => void };
    
    // Add cancel method
    throttled.cancel = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastArgs = null;
      lastThisContext = null;
    };
    
    return throttled;
  },
  
  /**
   * Debounce a function to improve performance
   * @param fn Function to debounce
   * @param delay Delay in milliseconds
   * @returns Debounced function
   */
  debounce: <T extends (...args: any[]) => any>(fn: T, delay: number): T & { cancel: () => void } => {
    let timeoutId: number | null = null;
    let immediateTimeoutId: number | null = null;
    let lastCallTime = 0;
    
    const debounced = function(this: unknown, ...args: Parameters<T>) {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTime;
      
      // Clear any existing timeout
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      // Schedule the execution
      timeoutId = window.setTimeout(() => {
        // Record when this call happened to prevent rapid consecutive calls
        lastCallTime = Date.now();
        fn.apply(this, args);
        timeoutId = null;
      }, delay);
      
      // If this is the first call or it's been a long time since the last call,
      // consider executing immediately to improve perceived performance
      if (timeSinceLastCall > delay * 3 && immediateTimeoutId === null) {
        // Use a very short timeout to allow rapid consecutive calls to be combined
        immediateTimeoutId = window.setTimeout(() => {
          immediateTimeoutId = null;
        }, 50);
      }
    } as T & { cancel: () => void };
    
    // Add cancel method
    debounced.cancel = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (immediateTimeoutId !== null) {
        clearTimeout(immediateTimeoutId);
        immediateTimeoutId = null;
      }
    };
    
    return debounced;
  }
};
