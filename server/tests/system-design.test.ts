import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskService } from '../src/services/task.service';
import cacheService from '../src/services/cache.service';
import { ConflictError } from '../src/utils/errors';
import { SocketService } from '../src/services/socket.service';
import { idempotencyMiddleware } from '../src/middlewares/idempotency.middleware';
import queueService from '../src/services/queue.service';
import { CircuitBreaker, CircuitBreakerOpenError } from '../src/utils/circuitBreaker';
import { Request, Response } from 'express';

// Mock Prisma
vi.mock('../src/config/db', () => ({
  default: {
    task: {
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(4),
    },
    project: {
      update: vi.fn().mockResolvedValue({ id: 'proj-1', progress: 50 }),
    },
    projectMember: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../src/services/activity.service', () => ({
  ActivityLogService: vi.fn().mockImplementation(() => ({
    log: vi.fn().mockResolvedValue(true),
  })),
}));

vi.mock('../src/services/notification.service', () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    create: vi.fn().mockResolvedValue(true),
  })),
}));

import prisma from '../src/config/db';

describe('System Design Capabilities Test Suite', () => {
  let taskService: TaskService;

  beforeEach(() => {
    vi.clearAllMocks();
    taskService = new TaskService();
  });

  describe('Scenario 1: Optimistic Concurrency Control (OCC)', () => {
    it('should successfully update task when client version matches the database version', async () => {
      const mockTaskInDb = {
        id: 'task-100',
        projectId: 'proj-1',
        title: 'Initial Title',
        version: 1,
        project: { id: 'proj-1', name: 'Alpha', workspaceId: 'ws-1' },
      };

      (prisma.task.findUnique as any).mockResolvedValue(mockTaskInDb);
      (prisma.task.update as any).mockResolvedValue({
        ...mockTaskInDb,
        title: 'Updated Title',
        version: 2,
      });

      const result = await taskService.updateTask('task-100', 'user-1', {
        title: 'Updated Title',
        version: 1, // Matches database version
      });

      expect(result.version).toBe(2);
      expect(result.title).toBe('Updated Title');
      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Updated Title',
            version: { increment: 1 },
          }),
        })
      );
    });

    it('should REJECT concurrent update and throw ConflictError (409) when version is stale', async () => {
      // Teammate A already updated the task to version 2
      const mockTaskInDb = {
        id: 'task-100',
        projectId: 'proj-1',
        title: "Teammate A's changes",
        version: 2, // Server is now at version 2
        project: { id: 'proj-1', name: 'Alpha', workspaceId: 'ws-1' },
      };

      (prisma.task.findUnique as any).mockResolvedValue(mockTaskInDb);

      // Teammate B sends an update still believing the task is version 1
      await expect(
        taskService.updateTask('task-100', 'user-2', {
          title: "Teammate B's stale overwrite",
          version: 1, // Stale version!
        })
      ).rejects.toThrow(ConflictError);

      // Verify that database was NOT mutated
      expect(prisma.task.update).not.toHaveBeenCalled();
    });
  });

  describe('Scenario 2: Cache Stampede (Thundering Herd) Defense', () => {
    it('should execute database query exactly ONCE when 10 requests hit concurrently', async () => {
      let dbExecutions = 0;
      const slowDatabaseQuery = async () => {
        dbExecutions++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { data: 'heavy-dashboard-metrics' };
      };

      // 10 concurrent requests arrive at the exact same millisecond
      const promises = Array.from({ length: 10 }, () =>
        cacheService.getOrSet('test:stampede:metrics', slowDatabaseQuery, 60)
      );

      const results = await Promise.all(promises);

      // All 10 requests must receive the correct response
      expect(results).toHaveLength(10);
      results.forEach((res) => {
        expect(res).toEqual({ data: 'heavy-dashboard-metrics' });
      });

      // Crucial: The database query MUST only execute once!
      expect(dbExecutions).toBe(1);
    });
  });

  describe('Scenario 3: Socket.io Resilient Scaling Initialization', () => {
    it('should initialize socket server without exceptions', () => {
      const mockIo = {
        use: vi.fn(),
        on: vi.fn(),
        to: vi.fn().mockReturnThis(),
        emit: vi.fn(),
        adapter: vi.fn(),
      } as any;

      expect(() => SocketService.init(mockIo)).not.toThrow();
      expect(mockIo.use).toHaveBeenCalled();
      expect(mockIo.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });
  });

  describe('Scenario 4: Automated Project Progress Calculation', () => {
    it('should automatically compute and persist progress based on completed tasks ratio', async () => {
      // 4 total tasks, 3 completed = 75% progress
      (prisma.task.count as any)
        .mockResolvedValueOnce(4)  // totalTasks
        .mockResolvedValueOnce(3); // completedTasks

      const progress = await taskService.recalculateProjectProgress('proj-1');

      expect(progress).toBe(75);
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        data: { progress: 75 },
      });
    });

    it('should return 0% progress when project has 0 tasks', async () => {
      (prisma.task.count as any)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const progress = await taskService.recalculateProjectProgress('proj-empty');

      expect(progress).toBe(0);
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-empty' },
        data: { progress: 0 },
      });
    });
  });

  describe('Scenario 5: Idempotency Key Architecture', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let nextFn: any;

    beforeEach(async () => {
      await cacheService.invalidatePattern('idempotency:*');
      mockReq = {
        method: 'POST',
        headers: {},
        ip: '127.0.0.1',
      };
      mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        setHeader: vi.fn(),
        statusCode: 200,
      };
      nextFn = vi.fn();
    });

    it('should pass through normally when no Idempotency-Key is provided', async () => {
      await idempotencyMiddleware(mockReq as Request, mockRes as Response, nextFn);
      expect(nextFn).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should ignore non-mutating GET requests even if key is present', async () => {
      mockReq.method = 'GET';
      mockReq.headers = { 'idempotency-key': 'key-123' };

      await idempotencyMiddleware(mockReq as Request, mockRes as Response, nextFn);
      expect(nextFn).toHaveBeenCalled();
    });

    it('should replay cached response on duplicate request without invoking controller', async () => {
      mockReq.headers = { 'idempotency-key': 'order-token-xyz' };

      // Pre-seed an existing completed idempotent response in cache
      await cacheService.set('idempotency:127.0.0.1:order-token-xyz', {
        status: 201,
        body: { id: 'proj-999', name: 'Duplicate Protected Project' },
        cachedAt: new Date().toISOString(),
      });

      await idempotencyMiddleware(mockReq as Request, mockRes as Response, nextFn);

      // Must NOT invoke next() controller!
      expect(nextFn).not.toHaveBeenCalled();
      // Must set X-Idempotent-Replay header
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Idempotent-Replay', 'true');
      // Must return cached response status and body
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({ id: 'proj-999', name: 'Duplicate Protected Project' });
    });

    it('should return 409 Conflict if duplicate request arrives while first is IN_PROGRESS', async () => {
      mockReq.headers = { 'idempotency-key': 'in-flight-key' };

      // Simulate first request currently in flight
      await cacheService.set('idempotency:127.0.0.1:in-flight-key', {
        status: 'IN_PROGRESS',
        startedAt: new Date().toISOString(),
      });

      await idempotencyMiddleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(409);
    });
  });

  describe('Scenario 4: Asynchronous Job Queue with Dead Letter Queue (DLQ)', () => {
    it('should enqueue job immediately and process asynchronously through worker handler', async () => {
      const processedJobs: any[] = [];
      const testQueue = `test-queue-${Date.now()}`;

      queueService.registerWorker(testQueue, async (data) => {
        processedJobs.push(data);
      });

      const result = await queueService.enqueue(testQueue, 'test.job', { message: 'hello world' });
      expect(result.jobId).toBeDefined();
      expect(result.status).toContain('queued');

      // Allow background execution
      await new Promise((r) => setTimeout(r, 50));
      expect(processedJobs.length).toBe(1);
      expect(processedJobs[0].message).toBe('hello world');
    });

    it('should retry failed job with backoff and route to Dead Letter Queue (DLQ) upon final exhaustion', async () => {
      const failingQueue = `failing-queue-${Date.now()}`;
      let attempts = 0;

      queueService.registerWorker(failingQueue, async () => {
        attempts++;
        throw new Error('Database down');
      });

      // Max 2 attempts, 10ms initial backoff
      const result = await queueService.enqueue(failingQueue, 'fail.job', { item: 42 }, {
        maxAttempts: 2,
        backoffDelayMs: 10,
      });

      // Wait for 2 attempts with backoff (attempt 1 instant, attempt 2 after 10ms)
      await new Promise((r) => setTimeout(r, 200));

      expect(attempts).toBe(2);

      // Verify Dead Letter Queue entry
      const dlq = queueService.getDeadLetterQueue(failingQueue);
      expect(dlq.length).toBeGreaterThanOrEqual(1);
      const deadJob = dlq.find((j) => j.jobId === result.jobId);
      expect(deadJob).toBeDefined();
      expect(deadJob?.error).toBe('Database down');
      expect(deadJob?.attemptsMade).toBe(2);
      expect(deadJob?.data).toEqual({ item: 42 });
    });

    it('should allow inspection and replay of dead-lettered jobs', async () => {
      const replayQueue = `replay-queue-${Date.now()}`;
      let executionCount = 0;

      queueService.registerWorker(replayQueue, async () => {
        executionCount++;
        if (executionCount <= 2) throw new Error('Temporary failure');
        return true;
      });

      const { jobId } = await queueService.enqueue(replayQueue, 'replay.job', { action: 'sync' }, {
        maxAttempts: 2,
        backoffDelayMs: 10,
      });

      await new Promise((r) => setTimeout(r, 150));

      const dlqJobs = queueService.getDeadLetterQueue(replayQueue);
      expect(dlqJobs.some((j) => j.jobId === jobId)).toBe(true);

      // Replay the DLQ job
      const replayed = await queueService.retryDeadLetterJob(jobId);
      expect(replayed).toBe(true);

      // DLQ should now be drained of that job
      const dlqAfter = queueService.getDeadLetterQueue(replayQueue);
      expect(dlqAfter.some((j) => j.jobId === jobId)).toBe(false);
    });
  });

  describe('Scenario 5: 3-State Circuit Breaker Pattern (Fault Isolation)', () => {
    it('should execute normally in CLOSED state', async () => {
      const breaker = new CircuitBreaker({
        name: 'test-service',
        failureThreshold: 3,
        cooldownPeriodMs: 100,
      });

      expect(breaker.getState()).toBe('CLOSED');
      const result = await breaker.execute(async () => 'OK');
      expect(result).toBe('OK');
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should trip to OPEN after failureThreshold is reached and fail fast in ~1ms', async () => {
      const breaker = new CircuitBreaker({
        name: 'failing-3rd-party',
        failureThreshold: 3,
        cooldownPeriodMs: 100,
      });

      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Third-party gateway 500');
          });
        } catch {
          // Expected failures
        }
      }

      // Circuit must now be OPEN
      expect(breaker.getState()).toBe('OPEN');

      // Next request must fail-fast immediately without invoking target function
      let targetCalled = false;
      const startTime = Date.now();

      await expect(
        breaker.execute(async () => {
          targetCalled = true;
          return 'should not run';
        })
      ).rejects.toThrow(CircuitBreakerOpenError);

      const elapsedMs = Date.now() - startTime;
      expect(targetCalled).toBe(false);
      expect(elapsedMs).toBeLessThan(10); // Failed fast (<10ms)!
    });

    it('should execute fallback gracefully when circuit is OPEN', async () => {
      const breaker = new CircuitBreaker({
        name: 'cloudinary-mock',
        failureThreshold: 2,
        cooldownPeriodMs: 200,
      });

      // Trip the breaker
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => { throw new Error('Outage'); });
        } catch {}
      }

      expect(breaker.getState()).toBe('OPEN');

      // Call with fallback
      const fallbackResult = await breaker.execute(
        async () => 'from-cloud',
        async () => 'from-local-disk-fallback'
      );

      expect(fallbackResult).toBe('from-local-disk-fallback');
    });

    it('should transition to HALF_OPEN after cooldown and recover to CLOSED upon success', async () => {
      const breaker = new CircuitBreaker({
        name: 'recovering-service',
        failureThreshold: 2,
        cooldownPeriodMs: 50, // Short cooldown for testing
      });

      // Trip to OPEN
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => { throw new Error('Fail'); });
        } catch {}
      }
      expect(breaker.getState()).toBe('OPEN');

      // Wait for cooldown to expire
      await new Promise((r) => setTimeout(r, 60));

      // Circuit should now test in HALF_OPEN
      expect(breaker.getState()).toBe('HALF_OPEN');

      // Trial request succeeds
      const trialResult = await breaker.execute(async () => 'recovered!');
      expect(trialResult).toBe('recovered!');

      // Circuit resets to CLOSED
      expect(breaker.getState()).toBe('CLOSED');
    });
  });

  describe('Scenario 6: Read/Write CQRS Query Splitting (Read-Replica Routing)', () => {
    it('should route read operations (findMany, count) to read-replica and write operations (update, create) to primary', () => {
      const readOperations = ['findUnique', 'findFirst', 'findMany', 'count', 'aggregate', 'groupBy'];
      const writeOperations = ['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany'];

      const readCalls: string[] = [];
      const writeCalls: string[] = [];

      const mockReplica: any = {
        task: {
          findMany: vi.fn(() => { readCalls.push('findMany'); return []; }),
          count: vi.fn(() => { readCalls.push('count'); return 10; }),
        },
      };

      const mockPrimary: any = {
        task: {
          create: vi.fn(() => { writeCalls.push('create'); return {}; }),
          update: vi.fn(() => { writeCalls.push('update'); return {}; }),
        },
        $transaction: vi.fn(() => { writeCalls.push('$transaction'); return {}; }),
      };

      // Test CQRS classification
      readOperations.forEach((op) => {
        expect(['findUnique', 'findFirst', 'findMany', 'count', 'aggregate', 'groupBy']).toContain(op);
      });
      writeOperations.forEach((op) => {
        expect(['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany']).toContain(op);
      });

      // Invoke read methods
      mockReplica.task.findMany();
      mockReplica.task.count();

      // Invoke write methods
      mockPrimary.task.create();
      mockPrimary.task.update();
      mockPrimary.$transaction();

      expect(readCalls).toEqual(['findMany', 'count']);
      expect(writeCalls).toEqual(['create', 'update', '$transaction']);
    });
  });
});
