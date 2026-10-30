import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskService } from '../src/services/task.service';
import cacheService from '../src/services/cache.service';
import { ConflictError } from '../src/utils/errors';
import { SocketService } from '../src/services/socket.service';

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
});
