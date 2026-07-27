import prisma from '../config/db';
import { hashPassword, comparePassword } from '../utils/auth';
import { BadRequestError, ConflictError, UnauthorizedError, NotFoundError, ForbiddenError } from '../utils/errors';

export class UserService {
  /**
   * Updates user name, username, or profile picture image URL.
   */
  public async updateProfile(userId: string, data: { name?: string; username?: string; image?: string }): Promise<any> {
    const updateData: any = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.image !== undefined) {
      updateData.image = data.image;
    }

    if (data.username !== undefined) {
      // Check if username is already taken by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          username: data.username,
          NOT: { id: userId }
        }
      });
      if (existingUser) {
        throw new ConflictError('This username is already taken.');
      }
      updateData.username = data.username;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        updatedAt: true
      }
    });

    return updatedUser;
  }

  /**
   * Changes the user's password. Revokes all other active sessions for safety.
   */
  public async changePassword(userId: string, currentPassword?: string, newPassword?: string, currentSessionId?: string): Promise<void> {
    if (!newPassword) {
      throw new BadRequestError('New password is required.');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    // Verify current password (if user has a password set)
    if (user.passwordHash) {
      if (!currentPassword) {
        throw new BadRequestError('Current password is required.');
      }
      const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Incorrect current password.');
      }
    }

    const newPasswordHash = await hashPassword(newPassword);

    // Transaction: Update password and revoke all sessions EXCEPT the current one
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash }
      }),
      prisma.session.deleteMany({
        where: {
          userId,
          NOT: { id: currentSessionId }
        }
      })
    ]);
  }

  /**
   * Updates theme, language, and notification preferences.
   */
  public async updatePreferences(
    userId: string, 
    preferences: { theme?: string; language?: string; emailNotifications?: boolean; pushNotifications?: boolean }
  ): Promise<any> {
    const updatedPreferences = await prisma.userPreference.upsert({
      where: { userId },
      update: preferences,
      create: {
        userId,
        theme: preferences.theme || 'light',
        language: preferences.language || 'en',
        emailNotifications: preferences.emailNotifications !== undefined ? preferences.emailNotifications : true,
        pushNotifications: preferences.pushNotifications !== undefined ? preferences.pushNotifications : true,
      }
    });

    return updatedPreferences;
  }

  /**
   * Retrieves active device sessions for the user.
   */
  public async getActiveSessions(userId: string): Promise<any[]> {
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
        isRevoked: false
      },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return sessions;
  }

  /**
   * Revokes (deletes) a specific active session.
   */
  public async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundError('Session not found.');
    }

    if (session.userId !== userId) {
      throw new ForbiddenError('You do not have permission to revoke this session.');
    }

    await prisma.session.delete({ where: { id: sessionId } });
  }

  /**
   * Revokes all active sessions for the user except the current active one.
   */
  public async revokeAllOtherSessions(userId: string, currentSessionId?: string): Promise<void> {
    await prisma.session.deleteMany({
      where: {
        userId,
        NOT: { id: currentSessionId }
      }
    });
  }

  /**
   * Soft deletes a user account by setting `deletedAt` and revoking all sessions.
   * Gives a 30-day window for account recovery.
   */
  public async softDeleteAccount(userId: string, password?: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    // Verify password if it is a local login account
    if (user.passwordHash && password) {
      const isPasswordValid = await comparePassword(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Incorrect password. Account deletion aborted.');
      }
    }

    // Transaction: Mark user as soft-deleted and revoke all active sessions
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { deletedAt: new Date() }
      }),
      prisma.session.deleteMany({
        where: { userId }
      })
    ]);
  }

  /**
   * Permanently deletes a user account immediately.
   */
  public async immediateDeleteAccount(userId: string, password?: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    // Verify password if it is a local login account
    if (user.passwordHash && password) {
      const isPasswordValid = await comparePassword(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Incorrect password. Account deletion aborted.');
      }
    }

    // Permanent hard delete
    await prisma.user.delete({
      where: { id: userId }
    });
  }

  /**
   * Recovers a soft-deleted account before the 30-day window expires.
   */
  public async recoverAccount(email: string, password?: string): Promise<any> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundError('User account not found.');
    }

    if (!user.deletedAt) {
      throw new BadRequestError('Account is not marked for deletion.');
    }

    // Verify credentials
    if (user.passwordHash && password) {
      const isPasswordValid = await comparePassword(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Incorrect password. Recovery aborted.');
      }
    }

    // Restore user access
    const restoredUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        deletedAt: null,
        loginAttempts: 0,
        lockUntil: null
      },
      select: {
        id: true,
        name: true,
        email: true,
        isEmailVerified: true
      }
    });

    return restoredUser;
  }
}
