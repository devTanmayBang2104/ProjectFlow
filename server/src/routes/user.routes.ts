import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validator.middleware';
import {
  updateProfileSchema,
  updatePreferencesSchema,
  softDeleteSchema,
  recoverAccountSchema,
} from '../validators/user.validator';
import { changePasswordSchema } from '../validators/auth.validator';

import { upload } from '../middlewares/upload.middleware';

const router = Router();
const controller = new UserController();

// --- Public Endpoints ---
router.post('/account/recover', validateRequest(recoverAccountSchema), controller.recoverAccount);

// --- Protected Endpoints (Requires Login Session) ---
router.use(authMiddleware);

// Profile Updates
router.put('/profile', validateRequest(updateProfileSchema), controller.updateProfile);
router.post('/profile/avatar', upload.single('avatar'), controller.uploadAvatar);
router.delete('/profile/avatar', controller.removeAvatar);
router.put('/password', validateRequest(changePasswordSchema), controller.changePassword);
router.put('/preferences', validateRequest(updatePreferencesSchema), controller.updatePreferences);

// Active Devices / Sessions Management
router.get('/sessions', controller.getActiveSessions);
router.delete('/sessions/:id', controller.revokeSession);
router.delete('/sessions', controller.revokeAllOtherSessions); // Revoke all other sessions

// Account Deactivation & Permanent Deletion
router.delete('/account', validateRequest(softDeleteSchema), controller.softDeleteAccount);
router.delete('/account/permanent', validateRequest(softDeleteSchema), controller.immediateDeleteAccount);

export default router;
