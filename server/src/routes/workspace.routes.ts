import { Router } from 'express';
import { WorkspaceController } from '../controllers/workspace.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { workspaceRbac } from '../middlewares/rbac.middleware';
import { validateRequest } from '../middlewares/validator.middleware';
import { WorkspaceRole } from '@prisma/client';
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  addWorkspaceMemberSchema,
} from '../validators/workspace.validator';

const router = Router();
const controller = new WorkspaceController();

// All routes require user authentication
router.use(authMiddleware);

// Workspace Queries & Creation
router.get('/', controller.getUserWorkspaces);
router.post('/', validateRequest(createWorkspaceSchema), controller.createWorkspace);

// Specific Workspace Operations (Protected by Workspace RBAC)
router.get('/:id', workspaceRbac(), controller.getWorkspaceById);
router.put('/:id', workspaceRbac([WorkspaceRole.ADMIN]), validateRequest(updateWorkspaceSchema), controller.updateWorkspace);
router.delete('/:id', workspaceRbac([WorkspaceRole.ADMIN]), controller.deleteWorkspace);

// Member Management
router.post('/:workspaceId/members', workspaceRbac([WorkspaceRole.ADMIN]), validateRequest(addWorkspaceMemberSchema), controller.addMember);
router.delete('/:workspaceId/members/:memberId', workspaceRbac([WorkspaceRole.ADMIN]), controller.removeMember);

// Activity Feed retrieval
router.get('/:workspaceId/activities', workspaceRbac(), controller.getWorkspaceActivities);

export default router;
