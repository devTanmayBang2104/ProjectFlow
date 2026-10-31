import { Queue as BullQueue, Worker as BullWorker } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Dead Letter Queue Record
 */
export interface DeadLetterRecord {
  jobId: string;
  queueName: string;
  jobName: string;
  data: any;
  error: string;
  failedAt: string;
  attemptsMade: number;
}

export interface EnqueueOptions {
  maxAttempts?: number;
  backoffDelayMs?: number;
}

export type JobHandler<T = any> = (data: T, jobId: string) => Promise<any>;

interface InMemoryJob<T = any> {
  id: string;
  queueName: string;
  name: string;
  data: T;
  attemptsMade: number;
  maxAttempts: number;
  backoffDelayMs: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  nextRunAt: number;
}

/**
 * Resilient Asynchronous Job Queue with Dead Letter Queue (BullMQ / In-Memory Dual Mode)
 * 
 * In production / distributed environments with Redis:
 * - Operates backed by BullMQ & Redis streams.
 * 
 * In zero-redis / local / test environments:
 * - Operates backed by an asynchronous in-memory event-driven worker engine
 *   with full concurrency, exponential backoff retries, and dead-letter queue (DLQ) support.
 */
export class QueueService {
  private static instance: QueueService;
  private isRedisActive = false;
  private redisClient: Redis | null = null;
  private bullQueues = new Map<string, BullQueue>();
  private inMemoryQueues = new Map<string, InMemoryJob[]>();
  private handlers = new Map<string, JobHandler>();
  private dlq: DeadLetterRecord[] = [];
  private isProcessingInMemory = false;

  private constructor() {
    this.initRedis();
  }

  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  private initRedis() {
    if (!process.env.REDIS_URL) {
      this.isRedisActive = false;
      return;
    }

    try {
      const client = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        connectTimeout: 500,
        maxRetriesPerRequest: 0,
        retryStrategy: () => null,
      });

      client.on('error', () => {
        this.isRedisActive = false;
      });

      client.connect().then(() => {
        this.redisClient = client;
        this.isRedisActive = true;
        console.log('[QueueService] BullMQ Redis connection initialized.');
      }).catch(() => {
        this.isRedisActive = false;
      });
    } catch {
      this.isRedisActive = false;
    }
  }

  /**
   * Registers a worker handler for a specific queue.
   */
  public registerWorker<T = any>(
    queueName: string,
    handler: JobHandler<T>,
    options?: { concurrency?: number }
  ): void {
    this.handlers.set(queueName, handler);

    if (this.isRedisActive && this.redisClient) {
      try {
        new BullWorker(
          queueName,
          async (job) => {
            return handler(job.data, job.id as string);
          },
          {
            connection: this.redisClient as any,
            concurrency: options?.concurrency || 5,
          }
        ).on('failed', (job, err) => {
          if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
            this.recordDeadLetter({
              jobId: job.id || `bull_${Date.now()}`,
              queueName,
              jobName: job.name,
              data: job.data,
              error: err.message,
              failedAt: new Date().toISOString(),
              attemptsMade: job.attemptsMade,
            });
          }
        });
      } catch (err: any) {
        console.warn(`[QueueService] BullMQ worker init failed, fallback to in-memory: ${err.message}`);
      }
    }
  }

  /**
   * Enqueues a job asynchronously (producer).
   * Returns immediately in ~1ms without blocking the HTTP lifecycle.
   */
  public async enqueue<T = any>(
    queueName: string,
    jobName: string,
    data: T,
    options?: EnqueueOptions
  ): Promise<{ jobId: string; status: string }> {
    const maxAttempts = options?.maxAttempts ?? 3;
    const backoffDelayMs = options?.backoffDelayMs ?? 1000;
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    if (this.isRedisActive && this.redisClient) {
      try {
        let queue = this.bullQueues.get(queueName);
        if (!queue) {
          queue = new BullQueue(queueName, { connection: this.redisClient as any });
          this.bullQueues.set(queueName, queue);
        }

        const job = await queue.add(jobName, data, {
          attempts: maxAttempts,
          backoff: {
            type: 'exponential',
            delay: backoffDelayMs,
          },
          removeOnComplete: true,
        });

        return { jobId: job.id as string, status: 'queued-bullmq' };
      } catch {
        // Fall back seamlessly to in-memory queue
      }
    }

    // In-Memory Asynchronous Queue
    if (!this.inMemoryQueues.has(queueName)) {
      this.inMemoryQueues.set(queueName, []);
    }

    const job: InMemoryJob<T> = {
      id: jobId,
      queueName,
      name: jobName,
      data,
      attemptsMade: 0,
      maxAttempts,
      backoffDelayMs,
      status: 'pending',
      nextRunAt: Date.now(),
    };

    this.inMemoryQueues.get(queueName)!.push(job);

    // Schedule background queue processing on next tick
    setImmediate(() => this.processInMemoryQueue());

    return { jobId, status: 'queued-in-memory' };
  }

  /**
   * Processes in-memory jobs with exponential backoff and DLQ routing.
   */
  private async processInMemoryQueue(): Promise<void> {
    if (this.isProcessingInMemory) return;
    this.isProcessingInMemory = true;

    try {
      const now = Date.now();

      for (const [queueName, jobs] of this.inMemoryQueues.entries()) {
        const handler = this.handlers.get(queueName);
        if (!handler) continue;

        // Find jobs ready for execution
        const readyJobs = jobs.filter((j) => j.status === 'pending' && j.nextRunAt <= now);

        for (const job of readyJobs) {
          job.status = 'processing';
          job.attemptsMade++;

          try {
            await handler(job.data, job.id);
            job.status = 'completed';
          } catch (err: any) {
            if (job.attemptsMade < job.maxAttempts) {
              // Exponential backoff: delay * 2^(attempt - 1)
              const delay = job.backoffDelayMs * Math.pow(2, job.attemptsMade - 1);
              job.status = 'pending';
              job.nextRunAt = Date.now() + delay;
              console.warn(`[QueueService] Job "${job.name}" (${job.id}) failed attempt ${job.attemptsMade}/${job.maxAttempts}. Retrying in ${delay}ms... Error: ${err.message}`);
            } else {
              // Move to Dead Letter Queue (DLQ)
              job.status = 'failed';
              this.recordDeadLetter({
                jobId: job.id,
                queueName: job.queueName,
                jobName: job.name,
                data: job.data,
                error: err.message || 'Unknown execution error',
                failedAt: new Date().toISOString(),
                attemptsMade: job.attemptsMade,
              });
              console.error(`[QueueService] Job "${job.name}" (${job.id}) exhausted all ${job.maxAttempts} attempts. Moved to Dead Letter Queue.`);
            }
          }
        }

        // Clean up completed or permanently failed jobs from memory
        this.inMemoryQueues.set(
          queueName,
          jobs.filter((j) => j.status === 'pending')
        );
      }
    } finally {
      this.isProcessingInMemory = false;

      // If pending jobs remain, schedule next poll
      const hasPending = Array.from(this.inMemoryQueues.values()).some((jobs) =>
        jobs.some((j) => j.status === 'pending')
      );
      if (hasPending) {
        setTimeout(() => this.processInMemoryQueue(), 100);
      }
    }
  }

  private recordDeadLetter(record: DeadLetterRecord): void {
    this.dlq.push(record);
    // Keep DLQ bounded to the last 1000 failed jobs to prevent memory leaks
    if (this.dlq.length > 1000) {
      this.dlq.shift();
    }
  }

  public getDeadLetterQueue(queueName?: string): DeadLetterRecord[] {
    if (queueName) {
      return this.dlq.filter((r) => r.queueName === queueName);
    }
    return [...this.dlq];
  }

  public async retryDeadLetterJob(jobId: string): Promise<boolean> {
    const index = this.dlq.findIndex((r) => r.jobId === jobId);
    if (index === -1) return false;

    const [record] = this.dlq.splice(index, 1);
    await this.enqueue(record.queueName, record.jobName, record.data);
    return true;
  }

  public getStats() {
    const queueCounts: Record<string, { pending: number }> = {};
    for (const [name, jobs] of this.inMemoryQueues.entries()) {
      queueCounts[name] = { pending: jobs.filter((j) => j.status === 'pending').length };
    }

    return {
      engine: this.isRedisActive ? 'BullMQ (Redis)' : 'In-Memory Resilient Worker Queue',
      isRedisActive: this.isRedisActive,
      queues: queueCounts,
      deadLetterQueueCount: this.dlq.length,
    };
  }
}

export default QueueService.getInstance();
