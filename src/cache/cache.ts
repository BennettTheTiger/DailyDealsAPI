import NodeCache from "node-cache";
import { Deal } from "../types/index.js";

export interface CacheOptions {
  stdTTL?: number; // Standard time-to-live in seconds (default: 600)
  checkperiod?: number; // Auto-delete period in seconds (default: 120)
}

export class CacheService {
  private cache: NodeCache;

  constructor(options: CacheOptions = {}) {
    this.cache = new NodeCache({
      stdTTL: options.stdTTL || 600, // 10 minutes default
      checkperiod: options.checkperiod || 120, // Check every 2 minutes
    });
  }

  /**
   * Get deals from cache
   */
  getDeals(key: string): Deal[] | undefined {
    return this.cache.get(key);
  }

  /**
   * Set deals in cache
   */
  setDeals(key: string, deals: Deal[], ttl?: number): void {
    this.cache.set(key, deals, ttl ?? 600); // Default TTL 10 minutes
  }

  /**
   * Check if deals are cached
   */
  hasDeals(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Clear specific cache
   */
  clearDeals(key: string): void {
    this.cache.del(key);
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.flushAll();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * Get all keys in cache
   */
  getKeys(): string[] {
    return this.cache.keys();
  }
}

// Singleton instance
export const cacheService = new CacheService({
  stdTTL: parseInt(process.env.CACHE_TTL || "600"),
  checkperiod: 120,
});
