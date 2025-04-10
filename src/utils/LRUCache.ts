/**
 * Simple Least Recently Used (LRU) Cache implementation.
 */
export class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;
  private ttl: number | null;
  private timestamps: Map<K, number>;

  constructor(capacity: number, ttl?: number) {
    if (capacity <= 0) {
      throw new Error('Cache capacity must be greater than 0.');
    }
    this.capacity = capacity;
    this.cache = new Map<K, V>();
    this.ttl = ttl && ttl > 0 ? ttl : null; // Time-to-live in milliseconds
    this.timestamps = new Map<K, number>();
  }

  /**
   * Retrieves an item from the cache.
   * Updates its position to most recently used.
   * Returns null if the item is not found or expired.
   */
  get(key: K): V | null {
    if (!this.cache.has(key)) {
      return null;
    }

    const now = Date.now();
    // Check TTL if enabled
    if (this.ttl && this.timestamps.has(key)) {
        const timestamp = this.timestamps.get(key)!;
        if (now - timestamp > this.ttl) {
            // Item expired
            this.delete(key);
            return null;
        }
    }

    // Item found and not expired (or TTL not enabled)
    const value = this.cache.get(key)!;
    
    // Refresh usage (move to end of map iteration order)
    this.cache.delete(key);
    this.cache.set(key, value);
    
    // Update timestamp if TTL is enabled
    if (this.ttl) {
        this.timestamps.delete(key);
        this.timestamps.set(key, now);
    }

    return value;
  }

  /**
   * Adds or updates an item in the cache.
   * Evicts the least recently used item if capacity is exceeded.
   */
  set(key: K, value: V): void {
    // If key already exists, refresh usage first
    if (this.cache.has(key)) {
      this.cache.delete(key);
       if (this.ttl) {
           this.timestamps.delete(key);
       }
    } 
    // Check capacity before adding new item
    else if (this.cache.size >= this.capacity) {
      // Evict least recently used item (first item in map iteration order)
      const lruKey = this.cache.keys().next().value;
      this.delete(lruKey); // Use delete to handle both cache and timestamp maps
    }

    // Add the new item
    this.cache.set(key, value);
    if (this.ttl) {
        this.timestamps.set(key, Date.now());
    }
  }

  /**
   * Deletes an item from the cache.
   */
  delete(key: K): boolean {
    const deleted = this.cache.delete(key);
    if (this.ttl) {
        this.timestamps.delete(key);
    }
    return deleted;
  }

  /**
   * Clears the entire cache.
   */
  clear(): void {
    this.cache.clear();
     if (this.ttl) {
        this.timestamps.clear();
    }
  }

  /**
   * Returns the current size of the cache.
   */
  get size(): number {
    return this.cache.size;
  }
} 