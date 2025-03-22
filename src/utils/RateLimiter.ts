/**
 * RateLimiter utility for consistent API rate limiting
 * 
 * This utility helps prevent API rate limiting by managing request frequency.
 * It supports both:
 * 1. Token bucket algorithm for burst requests with smooth recovery
 * 2. Debounce/throttle for simple use cases
 */

/**
 * Configuration options for RateLimiter
 */
export interface RateLimiterOptions {
  /**
   * Maximum number of tokens/requests allowed in the bucket
   */
  bucketSize?: number;
  
  /**
   * Number of tokens/requests refilled per second
   */
  refillRate?: number;
  
  /**
   * Time in milliseconds for debouncing (delay before executing)
   */
  debounceMs?: number;
  
  /**
   * Time in milliseconds for throttling (minimum time between executions)
   */
  throttleMs?: number;
  
  /**
   * Allow the first call to execute immediately
   */
  leading?: boolean;
  
  /**
   * Name for this rate limiter (for logging/debugging)
   */
  name?: string;
}

/**
 * Default configuration for rate limiters
 */
const DEFAULT_OPTIONS: Required<RateLimiterOptions> = {
  bucketSize: 10,
  refillRate: 2,  // 2 tokens per second
  debounceMs: 300,
  throttleMs: 500,
  leading: true,
  name: 'default',
};

/**
 * Token bucket implementation for rate limiting
 */
class TokenBucket {
  private tokens: number;
  private lastRefillTime: number;
  private readonly bucketSize: number;
  private readonly refillRate: number;
  private readonly name: string;
  
  constructor(options: Partial<RateLimiterOptions> = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    this.bucketSize = opts.bucketSize;
    this.refillRate = opts.refillRate;
    this.name = opts.name;
    this.tokens = this.bucketSize;
    this.lastRefillTime = Date.now();
  }
  
  /**
   * Take a token from the bucket if available
   * @returns True if a token was available and consumed
   */
  public take(): boolean {
    this.refill();
    
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    
    console.debug(`Rate limit exceeded for ${this.name}`);
    return false;
  }
  
  /**
   * Check if a token is available without consuming it
   */
  public canTake(): boolean {
    this.refill();
    return this.tokens >= 1;
  }
  
  /**
   * Get the time in milliseconds until the next token is available
   */
  public getWaitTime(): number {
    this.refill();
    
    if (this.tokens >= 1) return 0;
    
    // Calculate time until next token based on refill rate
    const tokenDeficit = 1 - this.tokens;
    return Math.ceil((tokenDeficit / this.refillRate) * 1000);
  }
  
  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTime) / 1000;
    
    if (elapsedSeconds > 0) {
      // Add tokens based on elapsed time and refill rate
      this.tokens = Math.min(
        this.bucketSize,
        this.tokens + elapsedSeconds * this.refillRate
      );
      this.lastRefillTime = now;
    }
  }
}

/**
 * A registry of rate limiters to allow reuse
 */
const limiters = new Map<string, TokenBucket>();

/**
 * Rate limiting utilities for consistent API rate limiting
 */
export const rateLimiter = {
  /**
   * Get or create a token bucket rate limiter
   * @param name Identifier for the rate limiter
   * @param options Configuration options
   */
  getBucket(name: string, options?: Partial<RateLimiterOptions>): TokenBucket {
    if (!limiters.has(name)) {
      limiters.set(name, new TokenBucket({ ...options, name }));
    }
    return limiters.get(name)!;
  },
  
  /**
   * Wait for rate limit, then execute the given function
   * Returns a promise that resolves with the function result
   */
  async executeWithRateLimit<T>(
    name: string,
    fn: () => Promise<T>,
    options?: Partial<RateLimiterOptions>
  ): Promise<T> {
    const bucket = this.getBucket(name, options);
    
    if (bucket.canTake()) {
      // Token available, execute immediately
      bucket.take();
      return fn();
    }
    
    // Wait for a token to become available
    const waitTime = bucket.getWaitTime();
    console.debug(`Rate limiting: waiting ${waitTime}ms for ${name}`);
    
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          // Take a token and execute
          bucket.take();
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, waitTime);
    });
  },
  
  /**
   * Create a debounced version of a function
   * The function will only execute after the specified delay
   */
  debounce<T extends (...args: any[]) => any>(
    fn: T,
    options?: Partial<RateLimiterOptions>
  ): (...args: Parameters<T>) => void {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    return function(this: any, ...args: Parameters<T>) {
      // Clear any existing timeout
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      
      // Handle immediate execution for leading calls
      const shouldCallImmediately = opts.leading && !timeoutId;
      if (shouldCallImmediately) {
        fn.apply(this, args);
      }
      
      // Set up the new timeout
      timeoutId = setTimeout(() => {
        if (!opts.leading || !shouldCallImmediately) {
          fn.apply(this, args);
        }
        timeoutId = null;
      }, opts.debounceMs);
    };
  },
  
  /**
   * Create a throttled version of a function
   * The function will execute at most once per specified time period
   */
  throttle<T extends (...args: any[]) => any>(
    fn: T,
    options?: Partial<RateLimiterOptions>
  ): (...args: Parameters<T>) => void {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastCallTime = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastArgs: Parameters<T> | null = null;
    
    return function(this: any, ...args: Parameters<T>) {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTime;
      
      // Save the latest arguments
      lastArgs = args;
      
      // If it's the first call or enough time has passed
      if (lastCallTime === 0 || timeSinceLastCall >= opts.throttleMs) {
        lastCallTime = now;
        fn.apply(this, args);
      } else if (!timeoutId) {
        // Schedule a call for when the throttle period ends
        const remainingTime = opts.throttleMs - timeSinceLastCall;
        
        timeoutId = setTimeout(() => {
          if (lastArgs) {
            lastCallTime = Date.now();
            fn.apply(this, lastArgs);
          }
          timeoutId = null;
          lastArgs = null;
        }, remainingTime);
      }
    };
  },
}; 