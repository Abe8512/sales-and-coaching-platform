import { v4 as uuidv4 } from 'uuid';

export interface CacheEntry<T> {
  timestamp: number;
  data: T;
  id: string;
  inProgress?: boolean;
}

export type CacheKey = string;

export interface CacheOptions {
  ttl?: number;
  namespace?: string;
}

const DEFAULT_TTL = 10000; // 10 seconds default TTL
const CLEAN_INTERVAL = 30000; // Clean every 30 seconds

/**
 * Centralized cache service for the application
 * Manages caching for data and API requests with features like:
 * - Request deduplication
 * - TTL-based expiration
 * - Namespaced cache entries
 * - In-progress request tracking
 */
export class CacheService {
  private caches: Map<string, Map<CacheKey, CacheEntry<unknown>>> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval>;
  
  constructor() {
    // Setup periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, CLEAN_INTERVAL);
  }
  
  /**
   * Get a cache entry
   * @param key Cache key
   * @param options Cache options
   * @returns The cached data or null if not found or expired
   */
  public get<T>(key: CacheKey, options: CacheOptions = {}): T | null {
    const { namespace = 'default' } = options;
    
    // Get the namespace cache
    const cache = this.getNamespaceCache(namespace);
    const entry = cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) return null;
    
    // Check if the entry is expired
    const now = Date.now();
    const ttl = options.ttl || DEFAULT_TTL;
    if (now - entry.timestamp > ttl) {
      cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  /**
   * Set a cache entry
   * @param key Cache key
   * @param data Data to cache
   * @param options Cache options
   * @returns The cache entry ID
   */
  public set<T>(key: CacheKey, data: T, options: CacheOptions = {}): string {
    const { namespace = 'default' } = options;
    
    // Get the namespace cache
    const cache = this.getNamespaceCache(namespace);
    
    // Generate a unique ID for this entry
    const id = uuidv4();
    
    // Create entry
    const entry: CacheEntry<T> = {
      timestamp: Date.now(),
      data,
      id
    };
    
    // Set the entry
    cache.set(key, entry as CacheEntry<unknown>);
    
    return id;
  }
  
  /**
   * Mark a request as in progress for deduplication
   * @param key Cache key
   * @param options Cache options
   * @returns The cache entry ID
   */
  public markInProgress(key: CacheKey, options: CacheOptions = {}): string {
    const { namespace = 'default' } = options;
    
    // Get the namespace cache
    const cache = this.getNamespaceCache(namespace);
    
    // Generate a unique ID for this entry
    const id = uuidv4();
    
    // Create entry
    const entry: CacheEntry<null> = {
      timestamp: Date.now(),
      data: null,
      id,
      inProgress: true
    };
    
    // Set the entry
    cache.set(key, entry as CacheEntry<unknown>);
    
    return id;
  }
  
  /**
   * Check if a request is in progress
   * @param key Cache key
   * @param options Cache options
   * @returns True if the request is in progress
   */
  public isInProgress(key: CacheKey, options: CacheOptions = {}): boolean {
    const { namespace = 'default' } = options;
    
    // Get the namespace cache
    const cache = this.getNamespaceCache(namespace);
    const entry = cache.get(key);
    
    return !!(entry && entry.inProgress);
  }
  
  /**
   * Delete a cache entry
   * @param key Cache key
   * @param options Cache options
   */
  public delete(key: CacheKey, options: CacheOptions = {}): void {
    const { namespace = 'default' } = options;
    
    // Get the namespace cache
    const cache = this.getNamespaceCache(namespace);
    cache.delete(key);
  }
  
  /**
   * Clear all cache entries in a namespace
   * @param namespace Namespace to clear
   */
  public clearNamespace(namespace: string = 'default'): void {
    this.caches.set(namespace, new Map());
  }
  
  /**
   * Clear all cache entries
   */
  public clearAll(): void {
    this.caches = new Map();
  }
  
  /**
   * Execute a function with caching
   * @param key Cache key
   * @param fn Function to execute if cache miss
   * @param options Cache options
   * @returns The cached or newly fetched data
   */
  public async executeWithCache<T>(
    key: CacheKey, 
    fn: () => Promise<T>, 
    options: CacheOptions = {}
  ): Promise<T> {
    const { namespace = 'default', ttl = DEFAULT_TTL } = options;
    
    // Check cache first
    const cachedData = this.get<T>(key, { namespace, ttl });
    if (cachedData !== null) {
      return cachedData;
    }
    
    // Check if a request is already in progress
    if (this.isInProgress(key, { namespace })) {
      // Wait for the in-progress request to complete
      return new Promise<T>((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (!this.isInProgress(key, { namespace })) {
            clearInterval(checkInterval);
            
            // Get the data from cache
            const data = this.get<T>(key, { namespace, ttl });
            if (data !== null) {
              resolve(data);
            } else {
              reject(new Error(`Cache entry missing after in-progress request: ${key}`));
            }
          }
        }, 100);
        
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error(`Timeout waiting for in-progress request: ${key}`));
        }, 10000);
      });
    }
    
    // Mark this request as in progress
    this.markInProgress(key, { namespace });
    
    try {
      // Execute the function
      const result = await fn();
      
      // Cache the result
      this.set<T>(key, result, { namespace, ttl });
      
      return result;
    } catch (error) {
      // Delete the in-progress marker on error
      this.delete(key, { namespace });
      throw error;
    }
  }
  
  /**
   * Get or create a namespace cache
   * @param namespace Namespace name
   * @returns The namespace cache
   */
  private getNamespaceCache(namespace: string): Map<CacheKey, CacheEntry<unknown>> {
    let cache = this.caches.get(namespace);
    if (!cache) {
      cache = new Map();
      this.caches.set(namespace, cache);
    }
    return cache;
  }
  
  /**
   * Clean up expired cache entries
   */
  private cleanup(): void {
    const now = Date.now();
    
    // Iterate through all namespaces
    for (const [namespace, cache] of this.caches.entries()) {
      // Iterate through all entries in the namespace
      for (const [key, entry] of cache.entries()) {
        // Delete if expired (using default TTL)
        if (now - entry.timestamp > DEFAULT_TTL) {
          cache.delete(key);
        }
      }
      
      // Remove empty namespaces
      if (cache.size === 0) {
        this.caches.delete(namespace);
      }
    }
  }
  
  /**
   * Clean up resources when the service is no longer needed
   */
  public dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clearAll();
  }
}

// Export a singleton instance
export const cacheService = new CacheService();

// Export helpers for specific cache use cases
export const apiCache = {
  /**
   * Execute an API request with caching
   * @param key Cache key (usually API endpoint + parameters)
   * @param fn Function to execute the API request
   * @param ttl Cache TTL in milliseconds
   * @returns API response
   */
  async execute<T>(key: string, fn: () => Promise<T>, ttl: number = DEFAULT_TTL): Promise<T> {
    return cacheService.executeWithCache<T>(key, fn, { namespace: 'api', ttl });
  },

  /**
   * Clear all API cache entries
   */
  clear(): void {
    cacheService.clearNamespace('api');
  }
};

// Cache for metrics data with separate namespace
export const metricsCache = {
  /**
   * Get metrics data from cache
   * @param key Cache key
   * @param ttl Cache TTL in milliseconds
   * @returns Cached metrics data or null
   */
  get<T>(key: string, ttl: number = DEFAULT_TTL): T | null {
    return cacheService.get<T>(key, { namespace: 'metrics', ttl });
  },
  
  /**
   * Set metrics data in cache
   * @param key Cache key
   * @param data Metrics data
   * @param ttl Cache TTL in milliseconds
   */
  set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
    cacheService.set<T>(key, data, { namespace: 'metrics', ttl });
  },
  
  /**
   * Clear all metrics cache entries
   */
  clear(): void {
    cacheService.clearNamespace('metrics');
  }
}; 