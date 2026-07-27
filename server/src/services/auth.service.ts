import crypto from 'crypto';
import prisma from '../config/db';
import { 
  hashPassword, 
  comparePassword, 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken, 
  hashRefreshToken 
} from '../utils/auth';
import { 
  BadRequestError, 
  ConflictError, 
  UnauthorizedError, 
  NotFoundError,
  ForbiddenError
} from '../utils/errors';
import { sendVerificationEmail, sendPasswordResetEmail } from './mail.service';

/**
 * Helper to generate random hex tokens
 */
const generateToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export class AuthService {
  /**
   * Registers a new user account, creates preferences, and dispatches verification mail.
   */
  public async register(name: string, email: string, password: string): Promise<any> {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictError('A user with this email address already exists.');
    }

    const passwordHash = await hashPassword(password);
    const verificationToken = generateToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        verificationToken,
        verificationTokenExpires,
        preferences: {
          create: {
            theme: 'light',
            language: 'en',
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        isEmailVerified: true,
      }
    });

    // Send verification email (fire-and-forget or await is fine; let's await to ensure errors are caught)
    try {
      await sendVerificationEmail(user.email, user.name, verificationToken);
    } catch (err) {
      console.error('[Mail Error] Failed to send registration verify mail:', err);
    }

    return user;
  }

  /**
   * Authenticates user, checks lockouts, and generates Access/Refresh tokens and active Session.
   */
  public async login(email: string, password: string, userAgent?: string, ipAddress?: string): Promise<any> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    // Check account lockout status
    if (user.lockUntil && user.lockUntil > new Date()) {
      const waitTimeMins = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedError(`Account is temporarily locked due to repeated failures. Try again in ${waitTimeMins} minutes.`);
    }

    // Check if password match
    const isPasswordValid = user.passwordHash ? await comparePassword(password, user.passwordHash) : false;
    if (!isPasswordValid) {
      // Increment login attempts
      const attempts = user.loginAttempts + 1;
      let lockUntil: Date | null = null;
      
      if (attempts >= 5) {
        lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 mins
        console.warn(`[Security] Account locked: ${email} for 15 mins.`);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: attempts,
          lockUntil,
        }
      });

      throw new UnauthorizedError('Invalid email or password.');
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      throw new ForbiddenError('Your email address has not been verified. Please check your inbox or request a new verification link.');
    }

    // Success: Reset login attempts and lockout
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockUntil: null,
      }
    });

    // Generate Session ID (jti)
    const jti = crypto.randomUUID();
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, jti);

    const refreshTokenHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Persist session to database
    await prisma.session.create({
      data: {
        id: jti,
        userId: user.id,
        refreshTokenHash,
        userAgent,
        ipAddress,
        expiresAt,
      }
    });

    const googleAccount = await prisma.account.findFirst({
      where: { userId: user.id, provider: 'google' }
    });
    const authMethods = ['LOCAL'];
    if (googleAccount) {
      authMethods.push('GOOGLE');
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        isEmailVerified: user.isEmailVerified,
        authMethods,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refreshes active session, implements Refresh Token Rotation (RTR), and blocks hijacked sessions.
   */
  public async refresh(refreshToken: string, userAgent?: string, ipAddress?: string): Promise<any> {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      const tokenHash = hashRefreshToken(refreshToken);

      // Look up session in DB
      const session = await prisma.session.findUnique({
        where: { id: decoded.jti },
        include: { user: true }
      });

      // Session reuse detection:
      // If we find the session but it was flagged as revoked, it indicates token theft/replay.
      // We immediately revoke all sessions for this user to contain the breach.
      if (session && session.isRevoked) {
        await prisma.session.deleteMany({ where: { userId: session.userId } });
        console.warn(`[Security Alert] Refresh token reuse detected for User ${session.userId}. Revoking all sessions.`);
        throw new UnauthorizedError('Session hijacked. Please log in again.');
      }

      // If session does not exist or has expired
      if (!session || session.expiresAt < new Date()) {
        throw new UnauthorizedError('Session expired or invalid.');
      }

      // Generate a new session key and tokens
      const newJti = crypto.randomUUID();
      const newAccessToken = generateAccessToken(session.userId, session.user.email);
      const newRefreshToken = generateRefreshToken(session.userId, newJti);

      const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Transaction: Revoke the old session and create a new session
      await prisma.$transaction([
        prisma.session.update({
          where: { id: session.id },
          data: { isRevoked: true } // flag old as revoked for reuse detection
        }),
        prisma.session.create({
          data: {
            id: newJti,
            userId: session.userId,
            refreshTokenHash: newRefreshTokenHash,
            userAgent,
            ipAddress,
            expiresAt: newExpiresAt,
          }
        })
      ]);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Invalid session refresh token.');
    }
  }

  /**
   * Invalidates a session token upon logout.
   */
  public async logout(refreshToken: string): Promise<void> {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      await prisma.session.delete({ where: { id: decoded.jti } }).catch(() => {});
    } catch (err) {
      // Token was already invalid/expired, ignore
    }
  }

  /**
   * Verifies a user's sign-up email token.
   */
  public async verifyEmail(token: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
      }
    });

    if (!user) {
      throw new BadRequestError('Invalid email verification link.');
    }

    if (user.verificationTokenExpires && user.verificationTokenExpires < new Date()) {
      throw new BadRequestError('Verification link expired');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        verificationToken: null,
        verificationTokenExpires: null,
      }
    });
  }

  /**
   * Resends sign-up verification email.
   */
  public async resendVerification(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return; // Return silently for email enumeration prevention
    }

    if (user.isEmailVerified) {
      throw new BadRequestError('Email address is already verified.');
    }

    const verificationToken = generateToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpires,
      }
    });

    try {
      await sendVerificationEmail(user.email, user.name, verificationToken);
    } catch (err) {
      console.error('[Mail Error] Failed to send verification email on resend:', err);
    }
  }

  /**
   * Triggers forgot-password recovery.
   */
  public async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return; // Silent return for security
    }

    const resetPasswordToken = generateToken();
    const resetPasswordTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken,
        resetPasswordTokenExpires,
      }
    });

    try {
      await sendPasswordResetEmail(user.email, user.name, resetPasswordToken);
    } catch (err) {
      console.error('[Mail Error] Failed to send password reset email:', err);
    }
  }

  /**
   * Completes the password reset process.
   */
  public async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordTokenExpires: { gt: new Date() },
      }
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired password reset link.');
    }

    const passwordHash = await hashPassword(newPassword);

    // Transaction: Update password, reset reset tokens, and revoke all sessions
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          resetPasswordToken: null,
          resetPasswordTokenExpires: null,
        }
      }),
      prisma.session.deleteMany({
        where: { userId: user.id }
      })
    ]);
  }

  /**
   * Retrieves profile details for the active user.
   */
  public async getProfile(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        accounts: {
          select: {
            provider: true
          }
        },
        preferences: {
          select: {
            theme: true,
            language: true,
            emailNotifications: true,
            pushNotifications: true,
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundError('User profile not found.');
    }

    const authMethods: string[] = [];
    if (user.passwordHash) {
      authMethods.push('LOCAL');
    }
    if (user.accounts.some(acc => acc.provider === 'google')) {
      authMethods.push('GOOGLE');
    }

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      image: user.image,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      authMethods,
      preferences: user.preferences
    };
  }

  /**
   * Handle Google OAuth login and registration pipeline
   */
  public async googleLogin(code: string, userAgent?: string, ipAddress?: string): Promise<any> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_CALLBACK_URL;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Google OAuth credentials are not configured on the server.');
    }

    // 1. Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error('[OAuth Error] Failed to exchange code for tokens:', errBody);
      throw new BadRequestError('Failed to authenticate with Google OAuth.');
    }

    const tokens = await tokenResponse.json() as any;
    const accessTokenGoogle = tokens.access_token;

    // 2. Retrieve user profile info using the Google access token
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessTokenGoogle}` },
    });

    if (!profileResponse.ok) {
      throw new BadRequestError('Failed to fetch user profile from Google.');
    }

    const profile = await profileResponse.json() as any;
    const { sub, name, email, picture } = profile;

    if (!email) {
      throw new BadRequestError('Google account does not provide an email address.');
    }

    // 3. Find or create user
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Create user with verified email since it comes from Google
      user = await prisma.user.create({
        data: {
          name,
          email,
          image: picture || '',
          isEmailVerified: true,
          preferences: {
            create: {
              theme: 'light',
              language: 'en',
            }
          }
        }
      });
    } else {
      if (user.deletedAt) {
        throw new UnauthorizedError('Your account is marked for deletion. Please recover it first.');
      }
      // If the user already exists but has no profile picture, update it with Google's profile picture
      if ((!user.image || user.image === "") && picture) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { image: picture },
        });
      }
    }

    // 4. Link provider Account if not already present
    const existingAccount = await prisma.account.findFirst({
      where: {
        provider: 'google',
        providerAccountId: sub,
      }
    });

    if (!existingAccount) {
      await prisma.account.create({
        data: {
          userId: user.id,
          provider: 'google',
          providerAccountId: sub,
        }
      });
    }

    // 5. Create a new session
    const jti = crypto.randomUUID();
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id, jti);

    const refreshTokenHash = hashRefreshToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.session.create({
      data: {
        id: jti,
        userId: user.id,
        refreshTokenHash,
        userAgent,
        ipAddress,
        expiresAt,
      }
    });

    const authMethods = ['GOOGLE'];
    if (user.passwordHash) {
      authMethods.push('LOCAL');
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        isEmailVerified: user.isEmailVerified,
        authMethods,
      },
      accessToken,
      refreshToken,
    };
  }
}
