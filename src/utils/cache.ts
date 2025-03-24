/**
 * Cache utility for API responses
 */

interface CacheOptions {
  ttl: number;  // Time to live in milliseconds
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class Cache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes default TTL

  set<T>(key: string, value: T, options: Partial<CacheOptions> = {}): void {
    const ttl = options.ttl || this.defaultTTL;
    this.cache.set(key, {
      data: value,
      timestamp: Date.now() + ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.timestamp) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  async getOrSet<T>(
    key: string,
    getter: () => Promise<T>,
    options: Partial<CacheOptions> = {}
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await getter();
    this.set(key, value, options);
    return value;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp) {
        this.cache.delete(key);
      }
    }
  }
}