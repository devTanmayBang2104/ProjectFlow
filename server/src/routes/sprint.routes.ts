import { Router } from 'express';
import { SprintController } from '../controllers/sprint.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validator.middleware';
import {
  createSprintSchema,
  updateSprintSchema,
} from '../validators/sprint.validator';

const router = Router();
const controller = new SprintController();

// Secure all endpoints under authMiddleware
router.use(authMiddleware);

router.get('/project/:projectId', controller.getProjectSprints);
router.post('/', validateRequest(createSprintSchema), controller.createSprint);
router.put('/:id', validateRequest(updateSprintSchema), controller.updateSprint);
router.delete('/:id', controller.deleteSprint);

export default router;
