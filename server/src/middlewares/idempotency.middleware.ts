import { Request, Response, NextFunction } from 'express';
import cacheService from '../services/cache.service';

export interface IdempotentResponse {
  status: number;
  body: any;
  cachedAt: string;
}

/**
 * Idempotency Middleware (System Design Pattern):
 * Guarantees that mutating operations (POST, PUT, PATCH, DELETE) can be safely retried
 * without creating duplicate records or side-effects.
 *
 * Header: `Idempotency-Key: <unique-uuid-or-token>`
 */
export const idempotencyMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Only state-mutating requests need idempotency protection
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!mutatingMethods.includes(req.method)) {
    return next();
  }

  const idempotencyKey = (req.headers['idempotency-key'] || req.headers['x-idempotency-key']) as string | undefined;

  // If client did not specify an Idempotency-Key, pass through normally
  if (!idempotencyKey) {
    return next();
  }

  const userIdentifier = req.user?.id || req.ip || 'anonymous';
  const cacheKey = `idempotency:${userIdentifier}:${idempotencyKey}`;

  try {
    const cachedRecord = await cacheService.get<any>(cacheKey);

    if (cachedRecord) {
      // 1. In-flight collision: An identical request is currently executing
      if (cachedRecord.status === 'IN_PROGRESS') {
        res.status(409).json({
          success: false,
          error: {
            message: 'A request with this Idempotency-Key is currently in progress. Please wait for completion.',
          },
        });
        return;
      }

      // 2. Idempotent Replay: Return previously computed response instantly without hitting DB/controllers
      res.setHeader('X-Idempotent-Replay', 'true');
      res.status(cachedRecord.status).json(cachedRecord.body);
      return;
    }

    // 3. First time: Lock this idempotency key as IN_PROGRESS for 60 seconds
    await cacheService.set(cacheKey, { status: 'IN_PROGRESS', startedAt: new Date().toISOString() }, 60);

    // Intercept response to capture and cache final result
    const originalJson = res.json.bind(res);
    res.json = (body: any): Response => {
      // Only cache successful or client-safe responses
      if (res.statusCode >= 200 && res.statusCode < 400) {
        const payload: IdempotentResponse = {
          status: res.statusCode,
          body,
          cachedAt: new Date().toISOString(),
        };
        // Cache the successful idempotent response for 24 hours (86,400 seconds)
        cacheService.set(cacheKey, payload, 86400).catch((err) => {
          console.warn('[Idempotency] Failed to cache idempotent response:', err?.message || err);
        });
      } else {
        // If operation failed with 4xx or 5xx, release the lock so the client can retry
        cacheService.del(cacheKey).catch(() => {});
      }

      return originalJson(body);
    };

    next();
  } catch (err) {
    // If cache lookup fails, log and continue without blocking user operation
    console.warn('[Idempotency] Error reading idempotency cache, continuing without cache:', err);
    next();
  }
};
