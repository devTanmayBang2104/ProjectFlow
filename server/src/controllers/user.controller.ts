import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { verifyRefreshToken } from '../utils/auth';
import { clearAuthCookies } from '../utils/cookie';
import { UnauthorizedError } from '../utils/errors';
import { UploadService } from '../services/cloudinary.service';
import prisma from '../config/db';

const userService = new UserService();

export class UserController {
  /**
   * Update active user profile details
   */
  public updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { name, username, image } = req.body;
      
      const user = await userService.updateProfile(req.user.id, { name, username, image });

      res.status(200).json({
        success: true,
        data: user,
        message: 'Profile details updated successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Change user password (invalidates all other active sessions)
   */
  public changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { currentPassword, newPassword } = req.body;
      
      // Extract current active session ID from refresh token cookie to prevent revoking current device
      const refreshToken = req.cookies?.refreshToken;
      let currentSessionId: string | undefined;
      
      if (refreshToken) {
        try {
          const decoded = verifyRefreshToken(refreshToken);
          currentSessionId = decoded.jti;
        } catch (err) {
          // Token invalid, proceed without setting currentSessionId
        }
      }

      await userService.changePassword(req.user.id, currentPassword, newPassword, currentSessionId);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully. All other device sessions have been logged out.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update notification, language, and theme preferences
   */
  public updatePreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { theme, language, emailNotifications, pushNotifications } = req.body;

      const preferences = await userService.updatePreferences(req.user.id, {
        theme,
        language,
        emailNotifications,
        pushNotifications,
      });

      res.status(200).json({
        success: true,
        data: preferences,
        message: 'User preferences updated successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * List all active logged-in device sessions
   */
  public getActiveSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const sessions = await userService.getActiveSessions(req.user.id);

      res.status(200).json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Terminate a specific active session
   */
  public revokeSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const sessionId = req.params.id;
      
      await userService.revokeSession(req.user.id, sessionId);

      res.status(200).json({
        success: true,
        message: 'Session revoked successfully. The target device has been logged out.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Log out of all device sessions except the current active one
   */
  public revokeAllOtherSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      
      const refreshToken = req.cookies?.refreshToken;
      let currentSessionId: string | undefined;

      if (refreshToken) {
        try {
          const decoded = verifyRefreshToken(refreshToken);
          currentSessionId = decoded.jti;
        } catch (err) {
          // ignore
        }
      }

      await userService.revokeAllOtherSessions(req.user.id, currentSessionId);

      res.status(200).json({
        success: true,
        message: 'Logged out of all other active device sessions successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Soft-delete user account (30-day recovery grace period)
   */
  public softDeleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { password } = req.body;

      await userService.softDeleteAccount(req.user.id, password);
      
      // Wipe browser authorization cookies
      clearAuthCookies(res);

      res.status(200).json({
        success: true,
        message: 'Your account has been deactivated. You have 30 days to sign back in and recover your account before it is permanently deleted.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Permanently delete user account immediately
   */
  public immediateDeleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { password } = req.body;

      await userService.immediateDeleteAccount(req.user.id, password);
      
      // Wipe browser authorization cookies
      clearAuthCookies(res);

      res.status(200).json({
        success: true,
        message: 'Your account has been permanently deleted.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Recover a deactivated account before the 30-day grace period expires
   */
  public recoverAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const user = await userService.recoverAccount(email, password);

      res.status(200).json({
        success: true,
        data: user,
        message: 'Account recovered successfully! You can now log in using your password.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Upload avatar image for active user profile
   */
  public uploadAvatar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded.' });
        return;
      }

      const uploadResult = await UploadService.uploadFile(req.file, 'avatars');

      // Update user image in DB
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { image: uploadResult.url },
        select: { id: true, name: true, username: true, email: true, image: true }
      });

      res.status(200).json({
        success: true,
        data: user,
        message: 'Profile picture uploaded and updated successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Remove avatar image from active user profile
   */
  public removeAvatar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();

      // Clear image property in DB
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { image: '' },
        select: { id: true, name: true, username: true, email: true, image: true }
      });

      res.status(200).json({
        success: true,
        data: user,
        message: 'Profile picture removed successfully.',
      });
    } catch (error) {
      next(error);
    }
  };
}
