import { Router } from 'express';
import { TaskController } from '../controllers/task.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { workspaceRbac } from '../middlewares/rbac.middleware';
import { validateRequest } from '../middlewares/validator.middleware';
import {
  createTaskSchema,
  updateTaskSchema,
  createSubtaskSchema,
  updateSubtaskSchema,
  createCommentSchema,
  createLabelSchema,
} from '../validators/task.validator';

import { upload } from '../middlewares/upload.middleware';

const router = Router();
const controller = new TaskController();

// Secure all endpoints under authMiddleware
router.use(authMiddleware);

// Task CRUD
router.post('/', validateRequest(createTaskSchema), controller.createTask);
router.get('/:id', controller.getTaskById);
router.put('/:id', validateRequest(updateTaskSchema), controller.updateTask);
router.delete('/:id', controller.deleteTask);

// Subtasks
router.post('/:id/subtasks', validateRequest(createSubtaskSchema), controller.addSubtask);
router.put('/subtasks/:subtaskId', validateRequest(updateSubtaskSchema), controller.updateSubtask);
router.delete('/subtasks/:subtaskId', controller.deleteSubtask);

// Comments
router.post('/:id/comments', validateRequest(createCommentSchema), controller.addComment);
router.delete('/comments/:commentId', controller.deleteComment);

// Task Attachments
router.post('/:id/attachments', upload.single('file'), controller.uploadAttachment);
router.delete('/attachments/:id', controller.deleteAttachment);

// Workspace Tags / Labels
router.post('/workspace/:workspaceId/labels', workspaceRbac(), validateRequest(createLabelSchema), controller.createLabel);
router.get('/workspace/:workspaceId/labels', workspaceRbac(), controller.getWorkspaceLabels);
router.delete('/labels/:id', controller.deleteLabel);

export default router;
