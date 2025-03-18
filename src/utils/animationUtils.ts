
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
    
    const throttled = function(this: any, ...args: any[]) {
      const now = Date.now();
      const timeSinceLastCall = now - lastCall;
      
      if (timeSinceLastCall >= delay) {
        lastCall = now;
        return fn.apply(this, args);
      } else {
        // Schedule a call at the end of the throttle period
        if (timeoutId === null) {
          timeoutId = window.setTimeout(() => {
            lastCall = Date.now();
            timeoutId = null;
            fn.apply(this, args);
          }, delay - timeSinceLastCall);
        }
      }
    } as T & { cancel: () => void };
    
    // Add cancel method
    throttled.cancel = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
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
    
    const debounced = function(this: any, ...args: any[]) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = window.setTimeout(() => {
        fn.apply(this, args);
        timeoutId = null;
      }, delay);
    } as T & { cancel: () => void };
    
    // Add cancel method
    debounced.cancel = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };
    
    return debounced;
  }
};
