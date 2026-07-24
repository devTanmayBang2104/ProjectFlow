import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const controller = new NotificationController();

// Secure all endpoints under authMiddleware
router.use(authMiddleware);

router.get('/', controller.getUserNotifications);
router.put('/:id/read', controller.markAsRead);
router.put('/read-all', controller.markAllAsRead);

export default router;
