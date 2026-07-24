import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middlewares/validator.middleware';
import { authLimiter, apiLimiter } from '../middlewares/rateLimit.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';

const router = Router();
const controller = new AuthController();

// 1. Authentication Mutations (with auth rate-limit protection)
router.post('/register', authLimiter, validateRequest(registerSchema), controller.register);
router.post('/login', authLimiter, validateRequest(loginSchema), controller.login);
router.post('/logout', controller.logout);
router.post('/refresh', controller.refresh);
router.get('/google/url', controller.getGoogleAuthUrl);
router.post('/google/callback', authLimiter, controller.googleLogin);

// 2. Account Recovery & Verification flows
router.post('/verify-email', authLimiter, validateRequest(verifyEmailSchema), controller.verifyEmail);
router.post('/resend-verification', authLimiter, validateRequest(resendVerificationSchema), controller.resendVerification);
router.post('/forgot-password', authLimiter, validateRequest(forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', authLimiter, validateRequest(resetPasswordSchema), controller.resetPassword);

// 3. User Identity Query (with auth verification middleware)
router.get('/me', authMiddleware, controller.me);

export default router;
