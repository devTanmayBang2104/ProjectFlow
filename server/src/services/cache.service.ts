import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

class CacheService {
  private client: Redis | null = null;
  private isConnected: boolean = false;
  private memoryFallback: Map<string, { value: string; expiry: number }> = new Map();

  constructor() {
    const redisUrl = process.env.REDIS_URL;

    if (redisUrl) {
      try {
        this.client = new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          retryStrategy: (times) => {
            if (times > 3) {
              console.warn('[Cache] Redis unreachable after 3 retries. Using in-memory fallback.');
              return null; // Stop retrying
            }
            return Math.min(times * 100, 1000);
          },
        });

        this.client.connect().then(() => {
          this.isConnected = true;
          console.log('[Cache] Successfully connected to Redis instance.');
        }).catch(() => {
          this.isConnected = false;
          console.log('[Cache] Redis unavailable. Operating with high-performance In-Memory cache.');
        });

        this.client.on('error', () => {
          this.isConnected = false;
        });
      } catch (err) {
        console.warn('[Cache] Could not initialize Redis client, falling back to in-memory store.');
        this.isConnected = false;
      }
    } else {
      console.log('[Cache] No REDIS_URL provided. Operating with high-performance In-Memory cache.');
    }
  }

  /**
   * Retrieve cached value by key.
   */
  public async get<T>(key: string): Promise<T | null> {
    try {
      if (this.isConnected && this.client) {
        const data = await this.client.get(key);
        return data ? JSON.parse(data) : null;
      }
    } catch {
      // Fallback on read error
    }

    // Memory Fallback
    const cached = this.memoryFallback.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.memoryFallback.delete(key);
      return null;
    }

    try {
      return JSON.parse(cached.value);
    } catch {
      return null;
    }
  }

  /**
   * Set cached key with Time-To-Live (seconds).
   */
  public async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    const serialized = JSON.stringify(value);

    try {
      if (this.isConnected && this.client) {
        await this.client.set(key, serialized, 'EX', ttlSeconds);
        return;
      }
    } catch {
      // Fallback on write error
    }

    // Memory Fallback
    this.memoryFallback.set(key, {
      value: serialized,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Invalidate a single key or pattern.
   */
  public async del(key: string): Promise<void> {
    try {
      if (this.isConnected && this.client) {
        await this.client.del(key);
      }
    } catch {}

    this.memoryFallback.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix or pattern.
   */
  public async invalidatePattern(pattern: string): Promise<void> {
    try {
      if (this.isConnected && this.client) {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      }
    } catch {}

    // Memory Fallback matching
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.memoryFallback.keys()) {
      if (regex.test(key)) {
        this.memoryFallback.delete(key);
      }
    }
  }
}

export const cacheService = new CacheService();
export default cacheService;
