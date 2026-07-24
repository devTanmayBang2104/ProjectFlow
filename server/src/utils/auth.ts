import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'super_secret_access_key';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_key';

export interface AccessTokenPayload {
  userId: string;
  email: string;
}

export interface RefreshTokenPayload {
  userId: string;
  jti: string; // Unique identifier for refresh token rotation
}

/**
 * Hash raw passwords with bcrypt (10 salt rounds)
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

/**
 * Compare plain text password with database hash
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Generate a short-lived access token (15 mins)
 */
export const generateAccessToken = (userId: string, email: string): string => {
  const payload: AccessTokenPayload = { userId, email };
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
};

/**
 * Generate a long-lived refresh token (7 days) with a unique token ID (jti)
 */
export const generateRefreshToken = (userId: string, jti: string): string => {
  const payload: RefreshTokenPayload = { userId, jti };
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
};

/**
 * Verify JWT Access Token
 */
export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
};

/**
 * Verify JWT Refresh Token
 */
export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, REFRESH_SECRET) as RefreshTokenPayload;
};

/**
 * Hash refresh tokens with SHA256 before writing to DB
 */
export const hashRefreshToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
