import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { UnauthorizedError } from '../utils/errors';

const notificationService = new NotificationService();

export class NotificationController {
  public getUserNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const unreadOnly = req.query.unread === 'true';

      const notifications = await notificationService.getUserNotifications(req.user.id, unreadOnly);

      res.status(200).json({
        success: true,
        data: notifications,
      });
    } catch (error) {
      next(error);
    }
  };

  public markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const notificationId = req.params.id;

      const notification = await notificationService.markAsRead(req.user.id, notificationId);

      res.status(200).json({
        success: true,
        data: notification,
        message: 'Notification marked as read.',
      });
    } catch (error) {
      next(error);
    }
  };

  public markAllAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();

      await notificationService.markAllAsRead(req.user.id);

      res.status(200).json({
        success: true,
        message: 'All notifications marked as read.',
      });
    } catch (error) {
      next(error);
    }
  };
}
