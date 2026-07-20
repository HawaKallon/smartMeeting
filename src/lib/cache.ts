import { getRedis, isRedisConnected } from './redis';

export interface CacheOptions {
  ttl?: number; // seconds, default 300 (5 min)
}

class Cache {
  private static readonly DEFAULT_TTL = 300; // 5 minutes

  async get<T = unknown>(key: string): Promise<T | null> {
    if (!isRedisConnected()) return null;

    const redis = getRedis();
    if (!redis) return null;

    try {
      const value = await redis.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (err) {
      console.error(`Cache get error for key ${key}:`, err);
      return null;
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    if (!isRedisConnected()) return;

    const redis = getRedis();
    if (!redis) return;

    try {
      const ttl = options.ttl ?? Cache.DEFAULT_TTL;
      const serialized = JSON.stringify(value);
      await redis.setex(key, ttl, serialized);
    } catch (err) {
      console.error(`Cache set error for key ${key}:`, err);
    }
  }

  async delete(key: string): Promise<void> {
    if (!isRedisConnected()) return;

    const redis = getRedis();
    if (!redis) return;

    try {
      await redis.del(key);
    } catch (err) {
      console.error(`Cache delete error for key ${key}:`, err);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    if (!isRedisConnected()) return;

    const redis = getRedis();
    if (!redis) return;

    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (err) {
      console.error(`Cache deletePattern error for pattern ${pattern}:`, err);
    }
  }

  async invalidate(...keys: string[]): Promise<void> {
    if (!isRedisConnected()) return;

    const redis = getRedis();
    if (!redis) return;

    try {
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (err) {
      console.error(`Cache invalidate error:`, err);
    }
  }

  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fn();
    await this.set(key, value, options);
    return value;
  }
}

export const cache = new Cache();
