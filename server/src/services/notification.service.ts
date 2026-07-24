import prisma from '../config/db';
import { NotificationType } from '@prisma/client';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { SocketService } from './socket.service';

export class NotificationService {
  /**
   * Creates a notification for a specific user and logs it in the DB.
   */
  public async create(
    userId: string,
    title: string,
    message: string,
    type: NotificationType,
    entityType?: string,
    entityId?: string
  ): Promise<any> {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          entityType,
          entityId,
        },
      });

      // Broadcast notification to user personal room in real-time via Socket.IO
      SocketService.sendNotification(userId, notification);

      return notification;
    } catch (error) {
      console.error('[Notification Error] Failed to create notification:', error);
    }
  }

  /**
   * Retrieves active notifications for a specific user.
   */
  public async getUserNotifications(userId: string, unreadOnly: boolean = false): Promise<any[]> {
    const whereClause: any = { userId };
    
    if (unreadOnly) {
      whereClause.isRead = false;
    }

    return prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 50, // limit to recent 50
    });
  }

  /**
   * Marks a specific notification as read.
   */
  public async markAsRead(userId: string, notificationId: string): Promise<any> {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found.');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenError('Access Denied.');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /**
   * Marks all active notifications of a user as read.
   */
  public async markAllAsRead(userId: string): Promise<any> {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
