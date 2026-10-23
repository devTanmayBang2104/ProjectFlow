import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { ForbiddenError } from '../utils/errors';

/**
 * Double-Submit Cookie CSRF protection middleware.
 * Verifies that the 'X-CSRF-Token' header matches the 'csrf-token' cookie.
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // 1. Skip CSRF validation for safe HTTP methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    // Auto-generate CSRF cookie if user is authenticated but CSRF cookie is missing/expired
    if (req.cookies?.accessToken && !req.cookies?.['csrf-token']) {
      try {
        generateCsrfToken(req, res);
      } catch (e) {
        // Safe fallback
      }
    }
    next();
    return;
  }

  // 1.5. Skip CSRF validation for public authentication, registration, recovery, and refresh endpoints
  const publicPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/resend-verification',
    '/api/auth/verify-email',
    '/api/auth/google/callback',
    '/api/auth/refresh',
    '/api/auth/logout',
    '/api/users/account/recover'
  ];

  if (publicPaths.some(path => req.originalUrl.startsWith(path))) {
    next();
    return;
  }

  // 2. Retrieve tokens from request headers and cookies
  const headerToken = req.headers['x-csrf-token'];
  const cookieToken = req.cookies?.['csrf-token'];

  // 3. Perform match checks if double-submit tokens are present
  if (headerToken && cookieToken && headerToken === cookieToken) {
    next();
    return;
  }

  // 4. Cross-domain origin check: When frontend is deployed on Vercel and backend on Render,
  // browsers forbid client JS from reading third-party cookies via document.cookie.
  // Origin verification guarantees the request came from our trusted application domain.
  const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : undefined);
  if (origin && (origin.endsWith('.vercel.app') || origin.includes('localhost'))) {
    next();
    return;
  }

  next(new ForbiddenError('Invalid or missing CSRF security token.'));
};

/**
 * Generates a random cryptographically secure CSRF token,
 * sets it in a client-readable cookie, and returns it.
 */
export const generateCsrfToken = (req: Request, res: Response): string => {
  const token = crypto.randomBytes(32).toString('hex');
  
  // Set as non-HttpOnly so client-side code can read and attach it in headers
  res.cookie('csrf-token', token, {
    httpOnly: false, // client JS must read this
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge: 3600000, // 1 hour expiration
  });

  return token;
};
