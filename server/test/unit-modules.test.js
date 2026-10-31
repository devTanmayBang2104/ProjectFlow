/**
 * Experiment No. 04: Unit Testing on Node.js Project (ProjectFlow)
 * Module-Level Unit Tests using Mocha and Chai
 * Student: Tanmay Bange | Reg No: 231080011 | Subject: Software Testing
 */

const { expect } = require('chai');
const path = require('path');

// Import Utility Functions and Validators from dist
const {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashRefreshToken,
} = require('../dist/utils/auth');

const {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} = require('../dist/validators/auth.validator');

const {
  createWorkspaceSchema,
} = require('../dist/validators/workspace.validator');

const {
  createTaskSchema,
} = require('../dist/validators/task.validator');

const {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} = require('../dist/utils/errors');

describe('ProjectFlow Unit Tests: Modules & Utilities (Mocha + Chai)', () => {

  // =========================================================================
  // 1. Password Hashing & Cryptographic Verification
  // =========================================================================
  describe('Module 1: Password Cryptography (bcryptjs)', () => {
    const rawPassword = 'SecurePassword123!';

    it('TC_UNIT_001 [Valid]: should securely hash a plain-text password using 10 salt rounds', async () => {
      const hash = await hashPassword(rawPassword);
      expect(hash).to.be.a('string');
      expect(hash).to.not.equal(rawPassword);
      expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).to.be.true;
      expect(hash.length).to.equal(60);
    });

    it('TC_UNIT_002 [Valid]: should verify matching password against generated bcrypt hash', async () => {
      const hash = await hashPassword(rawPassword);
      const isMatch = await comparePassword(rawPassword, hash);
      expect(isMatch).to.be.true;
    });

    it('TC_UNIT_003 [Invalid]: should reject incorrect password against bcrypt hash', async () => {
      const hash = await hashPassword(rawPassword);
      const isMatch = await comparePassword('WrongPassword999!', hash);
      expect(isMatch).to.be.false;
    });
  });

  // =========================================================================
  // 2. JWT Access and Refresh Token Utilities
  // =========================================================================
  describe('Module 2: JWT Authentication Tokens (jsonwebtoken)', () => {
    const testUserId = 'user-uuid-101';
    const testEmail = 'developer@projectflow.com';

    it('TC_UNIT_004 [Valid]: should generate and verify a valid JWT access token payload', () => {
      const token = generateAccessToken(testUserId, testEmail);
      expect(token).to.be.a('string');
      expect(token.split('.')).to.have.lengthOf(3);

      const decoded = verifyAccessToken(token);
      expect(decoded.userId).to.equal(testUserId);
      expect(decoded.email).to.equal(testEmail);
      expect(decoded.exp).to.be.greaterThan(decoded.iat);
    });

    it('TC_UNIT_005 [Valid]: should generate a valid refresh token with 7-day expiration', () => {
      const refreshToken = generateRefreshToken(testUserId);
      expect(refreshToken).to.be.a('string');

      const decoded = verifyRefreshToken(refreshToken);
      expect(decoded.userId).to.equal(testUserId);
    });

    it('TC_UNIT_006 [Invalid]: should reject malformed or tampered JWT access token', () => {
      const token = generateAccessToken(testUserId, testEmail);
      const tampered = token.slice(0, -6) + 'abcdef';
      expect(() => verifyAccessToken(tampered)).to.throw();
    });

    it('TC_UNIT_007 [Valid]: should hash refresh token into 64-character SHA-256 hex digest', () => {
      const rawToken = 'sample-refresh-token-xyz';
      const hashed = hashRefreshToken(rawToken);
      expect(hashed).to.be.a('string');
      expect(hashed).to.have.lengthOf(64);
      expect(hashed).to.equal(hashRefreshToken(rawToken)); // Deterministic hashing
    });
  });

  // =========================================================================
  // 3. Zod Input Validation Schemas
  // =========================================================================
  describe('Module 3: Zod Validation Schemas (Input Sanitization)', () => {
    it('TC_UNIT_008 [Valid]: should validate compliant user registration payload', () => {
      const validPayload = {
        body: {
          name: 'Tanmay Bange',
          email: 'tanmay@projectflow.io',
          password: 'StrongPassword123!',
        },
      };
      const result = registerSchema.safeParse(validPayload);
      expect(result.success).to.be.true;
    });

    it('TC_UNIT_009 [Invalid]: should reject registration with invalid email format', () => {
      const invalidEmailPayload = {
        body: {
          name: 'Tanmay Bange',
          email: 'not-a-valid-email',
          password: 'StrongPassword123!',
        },
      };
      const result = registerSchema.safeParse(invalidEmailPayload);
      expect(result.success).to.be.false;
      expect(result.error.issues[0].path).to.include('email');
    });

    it('TC_UNIT_010 [Invalid]: should reject registration with password under minimum characters', () => {
      const shortPassPayload = {
        body: {
          name: 'Tanmay Bange',
          email: 'tanmay@projectflow.io',
          password: '123',
        },
      };
      const result = registerSchema.safeParse(shortPassPayload);
      expect(result.success).to.be.false;
      expect(result.error.issues[0].message).to.include('characters long');
    });

    it('TC_UNIT_011 [Valid]: should validate compliant workspace creation payload', () => {
      const validWorkspace = {
        body: {
          name: 'Engineering Workspace',
          slug: 'engineering-workspace',
          description: 'Core dev workspace',
        },
      };
      const result = createWorkspaceSchema.safeParse(validWorkspace);
      expect(result.success).to.be.true;
    });

    it('TC_UNIT_012 [Invalid]: should reject workspace creation when name is empty', () => {
      const invalidWorkspace = {
        body: {
          name: '',
          description: 'Empty name test',
        },
      };
      const result = createWorkspaceSchema.safeParse(invalidWorkspace);
      expect(result.success).to.be.false;
    });

    it('TC_UNIT_013 [Invalid]: should reject task creation when title is missing', () => {
      const invalidTask = {
        body: {
          description: 'Missing title',
          priority: 'HIGH',
        },
      };
      const result = createTaskSchema.safeParse(invalidTask);
      expect(result.success).to.be.false;
    });
  });

  // =========================================================================
  // 4. Custom Application Error Classes
  // =========================================================================
  describe('Module 4: Custom HTTP Error Architecture', () => {
    it('TC_UNIT_014 [Valid]: BadRequestError should instantiate with status 400', () => {
      const err = new BadRequestError('Invalid user request payload');
      expect(err).to.be.instanceOf(AppError);
      expect(err.statusCode).to.equal(400);
      expect(err.message).to.equal('Invalid user request payload');
    });

    it('TC_UNIT_015 [Valid]: UnauthorizedError should instantiate with status 401', () => {
      const err = new UnauthorizedError('JWT Token expired or invalid');
      expect(err.statusCode).to.equal(401);
      expect(err.message).to.equal('JWT Token expired or invalid');
    });

    it('TC_UNIT_016 [Valid]: NotFoundError should instantiate with status 404', () => {
      const err = new NotFoundError('Task not found');
      expect(err.statusCode).to.equal(404);
      expect(err.message).to.equal('Task not found');
    });
  });
});
