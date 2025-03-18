
import { debounce, throttle } from "lodash";

/**
 * Optimized animation utilities to reduce UI twitching and improve performance
 */
export const animationUtils = {
  /**
   * Creates a debounced function with proper TypeScript typing
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T, 
    wait: number = 200
  ): ((...args: Parameters<T>) => void) => {
    return debounce(func, wait);
  },
  
  /**
   * Creates a throttled function with proper TypeScript typing
   */
  throttle: <T extends (...args: any[]) => any>(
    func: T, 
    wait: number = 200
  ): ((...args: Parameters<T>) => void) => {
    return throttle(func, wait);
  },
  
  /**
   * Returns a stable percentage value with optimized performance
   */
  stablePercentage: (value: number, total: number, precision: number = 0): number => {
    if (total === 0 || isNaN(value) || isNaN(total)) return 0;
    
    // Prevent division by very small numbers
    if (Math.abs(total) < 0.0001) return 0;
    
    const percentage = (value / total) * 100;
    
    // Clamp values to valid range
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    
    const factor = Math.pow(10, precision);
    return Math.round(clampedPercentage * factor) / factor;
  },
  
  /**
   * Smooths transitions between values with optimized algorithm
   */
  smoothTransition: (newValue: number, oldValue: number, maxStep: number = 5): number => {
    // Handle edge cases
    if (isNaN(newValue) || isNaN(oldValue)) return oldValue;
    
    const diff = newValue - oldValue;
    
    // If the difference is small enough, return the new value directly
    if (Math.abs(diff) <= maxStep) {
      return newValue;
    }
    
    // Apply easing for smoother visual transitions
    const step = Math.sign(diff) * (Math.min(Math.abs(diff) * 0.2, maxStep));
    return oldValue + step;
  },
  
  /**
   * Prevents content jump with optimized height calculation
   */
  getStableHeight: (element: HTMLElement | null, defaultHeight: number = 300): number => {
    if (!element) return defaultHeight;
    
    // Cache offsetHeight to prevent layout thrashing
    const height = element.offsetHeight;
    
    // Use 8px grid to prevent micro adjustments
    const gridSize = 8;
    return Math.ceil(height / gridSize) * gridSize;
  },
  
  /**
   * Stabilizes dimensions for better performance
   */
  stabilizeDimension: (value: number, gridSize: number = 8): number => {
    if (isNaN(value) || value <= 0) return gridSize;
    return Math.ceil(value / gridSize) * gridSize;
  },
  
  /**
   * Creates a stable callback that doesn't trigger re-renders
   */
  stableCallback: <T extends (...args: any[]) => any>(callback: T): T => {
    // This is just a pass-through for now, but could be enhanced with memoization
    return callback;
  }
};

export default animationUtils;
