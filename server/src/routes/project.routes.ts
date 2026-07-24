import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { workspaceRbac } from '../middlewares/rbac.middleware';
import { validateRequest } from '../middlewares/validator.middleware';
import {
  createProjectSchema,
  updateProjectSchema,
  addProjectMemberSchema,
} from '../validators/project.validator';

const router = Router();
const controller = new ProjectController();

// Secure all routes under authMiddleware
router.use(authMiddleware);

// Workspace-specific project listing & creation
router.get('/workspace/:workspaceId', workspaceRbac(), controller.getWorkspaceProjects);
router.post('/', workspaceRbac(), validateRequest(createProjectSchema), controller.createProject);

// Single project detail queries & operations
router.get('/:id', controller.getProjectById);
router.put('/:id', validateRequest(updateProjectSchema), controller.updateProject);
router.delete('/:id', controller.deleteProject);

// Project team member assignments
router.post('/:projectId/members', validateRequest(addProjectMemberSchema), controller.addMember);
router.delete('/:projectId/members/:userId', controller.removeMember);

export default router;
