import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/auth';
import { UnauthorizedError } from '../utils/errors';
import prisma from '../config/db';

/**
 * Middleware to authenticate requests using HttpOnly access token cookies.
 * Attaches validated user fields to `req.user`.
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      throw new UnauthorizedError('Authentication required. Access token is missing.');
    }

    try {
      const decoded = verifyAccessToken(token);

      // Verify the user is registered and active (not soft-deleted)
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, deletedAt: true },
      });

      if (!user) {
        throw new UnauthorizedError('User session invalid. Account not found.');
      }

      if (user.deletedAt) {
        throw new UnauthorizedError('Your account is marked for deletion. Please sign in and recover your account.');
      }

      // Inject validated user credentials
      req.user = {
        id: user.id,
        email: user.email,
      };

      next();
    } catch (jwtError) {
      throw new UnauthorizedError('Access token is invalid or has expired.');
    }
  } catch (error) {
    next(error);
  }
};

export default authMiddleware;
