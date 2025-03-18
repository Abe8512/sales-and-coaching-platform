
import { debounce, throttle } from "lodash";

/**
 * Utilities to reduce UI twitching when dealing with animations and transitions
 */
export const animationUtils = {
  /**
   * Creates a debounced function that delays invoking func until after wait milliseconds
   * have elapsed since the last time the debounced function was invoked.
   */
  debounce: (func: Function, wait: number = 200) => {
    return debounce(func, wait);
  },
  
  /**
   * Creates a throttled function that only invokes func at most once per every wait milliseconds.
   */
  throttle: (func: Function, wait: number = 200) => {
    return throttle(func, wait);
  },
  
  /**
   * Returns a stable percentage value to prevent small fluctuations causing UI twitching
   * @param value Current value
   * @param total Total value
   * @param precision Number of decimal places (default 0)
   */
  stablePercentage: (value: number, total: number, precision: number = 0) => {
    if (total === 0) return 0;
    const percentage = (value / total) * 100;
    const factor = Math.pow(10, precision);
    return Math.round(percentage * factor) / factor;
  },
  
  /**
   * Smooths transitions between values to prevent jittery UI
   * @param newValue New value to transition to
   * @param oldValue Previous value
   * @param maxStep Maximum change allowed in one update
   */
  smoothTransition: (newValue: number, oldValue: number, maxStep: number = 5) => {
    const diff = newValue - oldValue;
    if (Math.abs(diff) <= maxStep) {
      return newValue;
    }
    return oldValue + (Math.sign(diff) * maxStep);
  },
  
  /**
   * Prevents content jump by maintaining consistent height during loading states
   * @param element DOM element to measure
   * @param defaultHeight Default height to use if element is not available
   */
  getStableHeight: (element: HTMLElement | null, defaultHeight: number = 300): number => {
    if (!element) return defaultHeight;
    
    // Round to nearest multiple of 8 to prevent micro adjustments
    return Math.ceil(element.offsetHeight / 8) * 8;
  },
  
  /**
   * Prevents layout shift by rounding dimensions to a fixed grid
   * @param value The dimension value to stabilize
   * @param gridSize The grid size to round to (default 8px)
   */
  stabilizeDimension: (value: number, gridSize: number = 8): number => {
    return Math.ceil(value / gridSize) * gridSize;
  }
};
