import prisma from '../config/db';
import { ActivityAction } from '@prisma/client';
import { SocketService } from './socket.service';

export class ActivityLogService {
  /**
   * Creates a workspace activity log entry in the database.
   */
  public async log(
    workspaceId: string,
    userId: string,
    action: ActivityAction,
    entityType: string,
    entityId: string,
    details?: string,
    projectId?: string
  ): Promise<any> {
    try {
      const log = await prisma.activityLog.create({
        data: {
          workspaceId,
          userId,
          action,
          entityType,
          entityId,
          details,
          projectId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      });

      // Broadcast workspace activity in real-time via Socket.IO
      SocketService.broadcastWorkspaceActivity(workspaceId, log);

      return log;
    } catch (error) {
      console.error('[ActivityLog Error] Failed to log activity:', error);
    }
  }

  /**
   * Retrieves paginated activity logs for a specific workspace.
   */
  public async getWorkspaceActivities(workspaceId: string, page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;

    const [logs, total] = await prisma.$transaction([
      prisma.activityLog.findMany({
        where: { workspaceId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activityLog.count({ where: { workspaceId } }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
