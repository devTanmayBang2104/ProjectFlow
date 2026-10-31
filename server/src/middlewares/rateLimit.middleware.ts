import rateLimit, { MemoryStore } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

/**
 * DualModeRateLimitStore:
 * Provides zero-latency in-memory rate limiting by default, and seamlessly
 * switches to distributed Redis rate limiting when a live Redis instance is connected.
 * Never blocks or delays requests if Redis is offline or unreachable.
 */
class DualModeRateLimitStore {
  private memoryStore = new MemoryStore();
  private redisStore: RedisStore | null = null;
  private isRedisActive = false;

  constructor(prefix: string = 'rl:') {
    if (process.env.REDIS_URL) {
      try {
        const client = new Redis(process.env.REDIS_URL, {
          lazyConnect: true,
          connectTimeout: 400,
          maxRetriesPerRequest: 0,
          retryStrategy: () => null,
        });

        client.on('error', () => {
          this.isRedisActive = false;
        });

        client.connect().then(() => {
          this.redisStore = new RedisStore({
            // @ts-expect-error - ioredis sendCommand compatibility
            sendCommand: (...args: string[]) => client.call(...args),
            prefix,
          });
          this.isRedisActive = true;
          console.log(`[RateLimiter] Distributed Redis rate-limiting active (${prefix}).`);
        }).catch(() => {
          this.isRedisActive = false;
        });
      } catch {
        this.isRedisActive = false;
      }
    }
  }

  init(options: any) {
    this.memoryStore.init(options);
    if (this.redisStore && typeof (this.redisStore as any).init === 'function') {
      (this.redisStore as any).init(options);
    }
  }

  async increment(key: string) {
    if (this.isRedisActive && this.redisStore) {
      try {
        return await this.redisStore.increment(key);
      } catch {
        this.isRedisActive = false;
      }
    }
    return this.memoryStore.increment(key);
  }

  async decrement(key: string) {
    if (this.isRedisActive && this.redisStore) {
      try {
        return await this.redisStore.decrement(key);
      } catch {
        this.isRedisActive = false;
      }
    }
    return this.memoryStore.decrement(key);
  }

  async resetKey(key: string) {
    if (this.isRedisActive && this.redisStore) {
      try {
        return await this.redisStore.resetKey(key);
      } catch {
        this.isRedisActive = false;
      }
    }
    return this.memoryStore.resetKey(key);
  }

  async resetAll() {
    if (this.isRedisActive && this.redisStore && typeof (this.redisStore as any).resetAll === 'function') {
      try {
        return await (this.redisStore as any).resetAll();
      } catch {
        this.isRedisActive = false;
      }
    }
    if (typeof (this.memoryStore as any).resetAll === 'function') {
      return (this.memoryStore as any).resetAll();
    }
  }
}

// General API rate limiter (15 minutes, max 150 requests per IP)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150,
  store: new DualModeRateLimitStore('rl:api:'),
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again after 15 minutes.',
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter limiter for sensitive auth routes (15 minutes, max 15 requests per IP)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  store: new DualModeRateLimitStore('rl:auth:'),
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
