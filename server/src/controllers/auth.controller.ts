import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { setAuthCookies, clearAuthCookies } from '../utils/cookie';
import { generateCsrfToken } from '../middlewares/csrf.middleware';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import * as crypto from 'crypto';

const authService = new AuthService();

export class AuthController {
  /**
   * Handle user registration
   */
  public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email, password } = req.body;
      const user = await authService.register(name, email, password);
      
      res.status(201).json({
        success: true,
        data: user,
        message: 'Account registered successfully. Please check your email to verify your account.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle user login
   */
  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;

      const { user, accessToken, refreshToken } = await authService.login(
        email, 
        password, 
        userAgent, 
        ipAddress
      );

      // Set cookies for JWT
      setAuthCookies(res, accessToken, refreshToken);
      
      // Set double-submit cookie for CSRF validation
      const csrfToken = generateCsrfToken(req, res);

      res.status(200).json({
        success: true,
        data: {
          user,
          csrfToken,
        },
        message: 'Logged in successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle session refreshing (RTR)
   */
  public refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        throw new UnauthorizedError('Session expired. Please log in again.');
      }

      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;

      const tokens = await authService.refresh(refreshToken, userAgent, ipAddress);

      // Reissue rotated cookies
      setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      res.status(200).json({
        success: true,
        message: 'Session refreshed successfully.',
      });
    } catch (error) {
      // Clear cookies if refresh fails (session invalid/expired)
      clearAuthCookies(res);
      next(error);
    }
  };

  /**
   * Handle user logout
   */
  public logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      clearAuthCookies(res);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Verify email address
   */
  public verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.body;
      await authService.verifyEmail(token);

      res.status(200).json({
        success: true,
        message: 'Email address verified successfully. You can now log in.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Resend verification email
   */
  public resendVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;
      await authService.resendVerification(email);

      res.status(200).json({
        success: true,
        message: 'Verification link has been sent if the email matches an unverified account.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Forgot password recovery link
   */
  public forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;
      await authService.forgotPassword(email);

      res.status(200).json({
        success: true,
        message: 'A password recovery link has been sent if the account exists.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Reset password submission
   */
  public resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token, newPassword } = req.body;
      await authService.resetPassword(token, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password reset successful. Please log in using your new credentials.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Fetch details of currently logged-in user
   */
  public me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Unauthorized.');
      }
      const user = await authService.getProfile(req.user.id);
      
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get Google consent screen authorization URL
   */
  public getGoogleAuthUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const redirectUri = process.env.GOOGLE_CALLBACK_URL;
      
      if (!clientId || !redirectUri) {
        res.status(500).json({ 
          success: false, 
          message: 'Google OAuth is not configured on the server.' 
        });
        return;
      }

      // Generate anti-CSRF state token
      const state = crypto.randomBytes(16).toString('hex');
      
      // Set the state in a temporary cookie (10 min lifespan)
      res.cookie('oauth-state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000, // 10 minutes
        path: '/',
      });
      
      const scope = [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' ');
      
      const url = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}` +
        `&redirect_uri=${redirectUri}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scope)}` +
        `&state=${state}` +
        `&access_type=offline` +
        `&prompt=select_account`;
        
      res.status(200).json({
        success: true,
        data: { url },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle Google OAuth Callback (Exchanging Auth Code for tokens)
   */
  public googleLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code, state } = req.body;
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;

      // Verify anti-CSRF state token
      const cookieState = req.cookies?.['oauth-state'];
      if (!state || !cookieState || state !== cookieState) {
        res.clearCookie('oauth-state', { path: '/' });
        throw new ForbiddenError('OAuth state verification failed. Possible CSRF attack detected.');
      }

      // Clear the oauth-state cookie
      res.clearCookie('oauth-state', { path: '/' });

      const { user, accessToken, refreshToken } = await authService.googleLogin(
        code,
        userAgent,
        ipAddress
      );

      // Set cookies for JWT
      setAuthCookies(res, accessToken, refreshToken);
      
      // Set double-submit cookie for CSRF validation
      const csrfToken = generateCsrfToken(req, res);

      res.status(200).json({
        success: true,
        data: {
          user,
          csrfToken,
        },
        message: 'Logged in with Google successfully.',
      });
    } catch (error) {
      next(error);
    }
  };
}
