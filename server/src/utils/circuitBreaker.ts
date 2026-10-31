/**
 * Circuit Breaker Pattern Implementation (Fault Isolation)
 * 
 * Provides automated failure isolation for external third-party dependencies
 * (Cloudinary, SMTP Mailers, payment gateways, etc.).
 * 
 * 3 States:
 * - CLOSED: Normal operations; requests pass through. Failures are tracked.
 * - OPEN: After failureThreshold consecutive failures, the circuit trips to OPEN.
 *         All calls fail-fast immediately in ~1ms without waiting for socket timeouts.
 * - HALF_OPEN: After cooldown period, allows a trial request.
 *              Success resets to CLOSED; failure trips back to OPEN.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number; // e.g. 5 consecutive failures
  cooldownPeriodMs?: number; // e.g. 30,000ms cooldown before trial
  timeoutMs?: number;        // e.g. 10,000ms call timeout
}

export class CircuitBreakerOpenError extends Error {
  public readonly isCircuitBreaker = true;
  public readonly serviceName: string;
  public readonly retryAfterMs: number;

  constructor(serviceName: string, retryAfterMs: number) {
    super(`[CircuitBreaker] Service "${serviceName}" is temporarily unavailable (Circuit OPEN). Try again in ${Math.ceil(retryAfterMs / 1000)}s.`);
    this.name = 'CircuitBreakerOpenError';
    this.serviceName = serviceName;
    this.retryAfterMs = retryAfterMs;
  }
}

export class CircuitBreaker {
  private name: string;
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private successCount: number = 0;
  private failureThreshold: number;
  private cooldownPeriodMs: number;
  private timeoutMs: number;
  private nextTrialTime: number = 0;
  private lastFailureTime: number = 0;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.cooldownPeriodMs = options.cooldownPeriodMs ?? 30000;
    this.timeoutMs = options.timeoutMs ?? 10000;
  }

  public getState(): CircuitState {
    if (this.state === 'OPEN' && Date.now() >= this.nextTrialTime) {
      this.state = 'HALF_OPEN';
    }
    return this.state;
  }

  public getMetrics() {
    return {
      name: this.name,
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      failureThreshold: this.failureThreshold,
      cooldownPeriodMs: this.cooldownPeriodMs,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
      nextTrialTime: this.nextTrialTime ? new Date(this.nextTrialTime).toISOString() : null,
    };
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextTrialTime = 0;
  }

  public trip(): void {
    this.state = 'OPEN';
    this.lastFailureTime = Date.now();
    this.nextTrialTime = Date.now() + this.cooldownPeriodMs;
  }

  /**
   * Executes an asynchronous action wrapped inside the circuit breaker.
   * If the circuit is OPEN, immediately executes fallbackFn (if provided) or throws CircuitBreakerOpenError.
   */
  public async execute<T>(
    action: () => Promise<T>,
    fallbackFn?: (err: Error) => Promise<T> | T
  ): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      const retryAfterMs = Math.max(0, this.nextTrialTime - Date.now());
      const error = new CircuitBreakerOpenError(this.name, retryAfterMs);

      if (fallbackFn) {
        return fallbackFn(error);
      }
      throw error;
    }

    try {
      // Execute with timeout safeguard
      const result = await Promise.race([
        action(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`[CircuitBreaker] "${this.name}" operation timed out after ${this.timeoutMs}ms`)), this.timeoutMs)
        )
      ]);

      this.onSuccess();
      return result;
    } catch (err: any) {
      this.onFailure(err);

      if (fallbackFn) {
        return fallbackFn(err);
      }
      throw err;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.successCount++;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      console.log(`[CircuitBreaker] "${this.name}" trial succeeded. Circuit returned to CLOSED.`);
    }
  }

  private onFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.trip();
      console.warn(`[CircuitBreaker] "${this.name}" trial failed. Circuit re-tripped to OPEN.`);
    } else if (this.failureCount >= this.failureThreshold) {
      this.trip();
      console.error(`[CircuitBreaker] "${this.name}" exceeded failure threshold (${this.failureCount}/${this.failureThreshold}). Circuit tripped to OPEN for ${this.cooldownPeriodMs / 1000}s. Error: ${error.message}`);
    }
  }
}

// Global registry of circuit breakers
export class CircuitBreakerRegistry {
  private static breakers = new Map<string, CircuitBreaker>();

  public static getOrCreate(options: CircuitBreakerOptions): CircuitBreaker {
    let breaker = this.breakers.get(options.name);
    if (!breaker) {
      breaker = new CircuitBreaker(options);
      this.breakers.set(options.name, breaker);
    }
    return breaker;
  }

  public static getAllMetrics() {
    const metrics: Record<string, any> = {};
    for (const [name, breaker] of this.breakers.entries()) {
      metrics[name] = breaker.getMetrics();
    }
    return metrics;
  }
}
