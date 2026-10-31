/**
 * Experiment No. 05: Code Coverage Improvement Test Suite
 * Additional unit tests targeting uncovered lines and branches identified by NYC
 * Student: Tanmay Bange | Reg No: 231080011 | Subject: Software Testing
 */

const { expect } = require('chai');
const {
  ForbiddenError,
  ConflictError,
  InternalServerError,
} = require('../dist/utils/errors');

const {
  setAuthCookies,
  clearAuthCookies,
} = require('../dist/utils/cookie');

const {
  createSprintSchema,
  updateSprintSchema,
} = require('../dist/validators/sprint.validator');

const {
  createProjectSchema,
} = require('../dist/validators/project.validator');

describe('Code Coverage Improvement Tests (NYC Targeted Uncovered Lines)', () => {
  // 1. Target Uncovered Lines in errors.js (lines 31, 43, 49)
  describe('Coverage Target: utils/errors.js', () => {
    it('TC_COV_001: should instantiate ForbiddenError with status 403 and custom message', () => {
      const err = new ForbiddenError('Access Denied to Resource');
      expect(err.statusCode).to.equal(403);
      expect(err.message).to.equal('Access Denied to Resource');
      
      const defaultErr = new ForbiddenError();
      expect(defaultErr.statusCode).to.equal(403);
      expect(defaultErr.message).to.equal('Forbidden');
    });

    it('TC_COV_002: should instantiate ConflictError with status 409 and custom message', () => {
      const err = new ConflictError('Email already in use');
      expect(err.statusCode).to.equal(409);
      expect(err.message).to.equal('Email already in use');

      const defaultErr = new ConflictError();
      expect(defaultErr.statusCode).to.equal(409);
      expect(defaultErr.message).to.equal('Conflict');
    });

    it('TC_COV_003: should instantiate InternalServerError with status 500', () => {
      const err = new InternalServerError('Database connection dropped');
      expect(err.statusCode).to.equal(500);
      expect(err.message).to.equal('Database connection dropped');

      const defaultErr = new InternalServerError();
      expect(defaultErr.statusCode).to.equal(500);
      expect(defaultErr.message).to.equal('Internal Server Error');
    });
  });

  // 2. Target Uncovered Lines in utils/cookie.js (lines 7 to 32)
  describe('Coverage Target: utils/cookie.js', () => {
    it('TC_COV_004: should set auth cookies with httpOnly and security flags', () => {
      const cookiesSet = {};
      const mockRes = {
        cookie: (name, val, options) => {
          cookiesSet[name] = { val, options };
        },
      };

      setAuthCookies(mockRes, 'access-token-123', 'refresh-token-456');
      expect(cookiesSet).to.have.property('accessToken');
      expect(cookiesSet).to.have.property('refreshToken');
      expect(cookiesSet.accessToken.options.httpOnly).to.be.true;
      expect(cookiesSet.refreshToken.options.httpOnly).to.be.true;
    });

    it('TC_COV_005: should clear auth cookies on logout', () => {
      const cookiesCleared = [];
      const mockRes = {
        clearCookie: (name, options) => {
          cookiesCleared.push({ name, options });
        },
      };

      clearAuthCookies(mockRes);
      expect(cookiesCleared.length).to.equal(3);
      expect(cookiesCleared.map(c => c.name)).to.include('accessToken');
      expect(cookiesCleared.map(c => c.name)).to.include('refreshToken');
      expect(cookiesCleared.map(c => c.name)).to.include('csrf-token');
    });
  });

  // 3. Target Uncovered Lines in validators/sprint.validator.js
  describe('Coverage Target: validators/sprint.validator.js', () => {
    it('TC_COV_006: should validate compliant sprint creation payload', () => {
      const valid = createSprintSchema.safeParse({
        body: {
          name: 'Sprint 10',
          startDate: '2026-11-01T00:00:00.000Z',
          endDate: '2026-11-15T00:00:00.000Z',
        },
      });
      expect(valid.success).to.be.true;
    });

    it('TC_COV_007: should reject sprint creation with missing start date', () => {
      const invalid = createSprintSchema.safeParse({
        body: {
          name: 'Sprint 10',
          endDate: '2026-11-15T00:00:00.000Z',
        },
      });
      expect(invalid.success).to.be.false;
    });

    it('TC_COV_008: should validate updateSprintSchema with partial fields', () => {
      const valid = updateSprintSchema.safeParse({
        body: {
          name: 'Updated Sprint Name',
          status: 'ACTIVE',
        },
      });
      expect(valid.success).to.be.true;
    });
  });

  // 4. Target Uncovered Lines in validators/project.validator.js
  describe('Coverage Target: validators/project.validator.js', () => {
    it('TC_COV_009: should validate compliant project creation schema', () => {
      const valid = createProjectSchema.safeParse({
        body: {
          workspaceId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Alpha Mobile App',
          team_lead: '123e4567-e89b-12d3-a456-426614174001',
          description: 'Client mobile build',
        },
      });
      expect(valid.success).to.be.true;
    });

    it('TC_COV_010: should reject project creation with invalid project UUID format', () => {
      const invalid = createProjectSchema.safeParse({
        body: {
          workspaceId: 'not-a-uuid',
          name: 'Alpha Mobile App',
          team_lead: 'not-a-uuid',
        },
      });
      expect(invalid.success).to.be.false;
    });
  });
});
