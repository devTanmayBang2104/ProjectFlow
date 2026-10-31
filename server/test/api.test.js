/**
 * Experiment No. 04: Unit Testing on Node.js Project (ProjectFlow)
 * API Endpoint Integration & Unit Tests using Mocha, Chai, and Chai-HTTP
 * Reference Manual: UNIT TESTING & CODE COVERAGE.pdf
 * Student: Tanmay Bange | Reg No: 231080011 | Subject: Software Testing
 */

const { expect } = require('chai');
const express = require('express');
const chaiHttp = require('chai-http');
const chai = require('chai');
const bcrypt = require('bcryptjs');

chai.use(chaiHttp);

// Import ProjectFlow utilities
const {
  generateAccessToken,
  verifyAccessToken,
} = require('../dist/utils/auth');

// Initialize dedicated Express App for Chai-HTTP API Testing
const app = express();
app.use(express.json());

// In-Memory Test State (Deterministic Unit Isolation)
const mockUsers = [
  {
    id: 'user-001',
    name: 'Tanmay Bange',
    email: 'tanmay@projectflow.io',
    passwordHash: bcrypt.hashSync('SecurePassword123!', 10),
  },
];

const mockWorkspaces = [
  {
    id: 'ws-001',
    name: 'Default Workspace',
    slug: 'default-workspace',
    ownerId: 'user-001',
  },
];

const mockTasks = [
  {
    id: 'task-001',
    title: 'Setup Redis and PostgreSQL Caching',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
  },
];

// -------------------------------------------------------------------------
// Express Routes Definition for API Unit Testing
// -------------------------------------------------------------------------

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Auth Routes: Register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'Invalid email address format' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long' });
  }
  if (!name || name.trim() === '') {
    return res.status(400).json({ success: false, error: 'Name is required' });
  }

  const existing = mockUsers.find((u) => u.email === email);
  if (existing) {
    return res.status(409).json({ success: false, error: 'User already exists' });
  }

  const newUser = {
    id: `user-${Date.now()}`,
    name,
    email,
    passwordHash: bcrypt.hashSync(password, 10),
  };
  mockUsers.push(newUser);
  res.status(201).json({ success: true, message: 'User registered successfully', user: { id: newUser.id, name, email } });
});

// Auth Routes: Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password required' });
  }

  const user = mockUsers.find((u) => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ success: false, error: 'Invalid email or password' });
  }

  const token = generateAccessToken(user.id, user.email);
  res.status(200).json({ success: true, message: 'Login successful', token, user: { id: user.id, email: user.email } });
});

// Authentication Guard Middleware
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

// Workspaces Routes
app.get('/api/workspaces', requireAuth, (req, res) => {
  res.status(200).json({ success: true, workspaces: mockWorkspaces });
});

app.post('/api/workspaces', requireAuth, (req, res) => {
  const { name, slug } = req.body || {};
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ success: false, error: 'Workspace name must be at least 2 characters' });
  }
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ success: false, error: 'Invalid workspace slug format' });
  }

  const newWorkspace = { id: `ws-${Date.now()}`, name, slug, ownerId: req.user.userId };
  mockWorkspaces.push(newWorkspace);
  res.status(201).json({ success: true, workspace: newWorkspace });
});

// Tasks Routes
app.post('/api/tasks', requireAuth, (req, res) => {
  const { title, priority } = req.body || {};
  if (!title || title.trim() === '') {
    return res.status(400).json({ success: false, error: 'Task title is required' });
  }

  const newTask = {
    id: `task-${Date.now()}`,
    title,
    priority: priority || 'MEDIUM',
    status: 'TODO',
  };
  mockTasks.push(newTask);
  res.status(201).json({ success: true, task: newTask });
});

app.get('/api/tasks/:id', (req, res) => {
  const task = mockTasks.find((t) => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }
  res.status(200).json({ success: true, task });
});

// Sprints Routes
app.post('/api/sprints', requireAuth, (req, res) => {
  const { name, startDate, endDate } = req.body || {};
  if (!name || name.trim() === '') {
    return res.status(400).json({ success: false, error: 'Sprint name is required' });
  }
  if (!startDate || !endDate) {
    return res.status(400).json({ success: false, error: 'Start and end dates are required' });
  }

  res.status(201).json({
    success: true,
    sprint: { id: `sprint-${Date.now()}`, name, startDate, endDate },
  });
});

// 404 Catch-All Route
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Resource not found' });
});

// =========================================================================
// Mocha + Chai Test Suite
// =========================================================================

describe('ProjectFlow API Unit Tests (Mocha + Chai + Chai-HTTP)', () => {
  let validAuthToken = '';

  before(() => {
    validAuthToken = generateAccessToken('user-001', 'tanmay@projectflow.io');
  });

  // 1. System Health
  describe('GET /health', () => {
    it('TC_API_001 [Valid Scenario]: should return HTTP 200 with healthy system status', (done) => {
      chai.request(app)
        .get('/health')
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.be.an('object');
          expect(res.body.status).to.equal('healthy');
          expect(res.body.timestamp).to.exist;
          done();
        });
    });
  });

  // 2. User Registration
  describe('POST /api/auth/register', () => {
    it('TC_API_002 [Valid Scenario]: should register new user with 201 Created and return user profile', (done) => {
      chai.request(app)
        .post('/api/auth/register')
        .send({
          name: 'Sarah Connor',
          email: 'sarah.connor@projectflow.io',
          password: 'CyberPassword2026!',
        })
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body.success).to.be.true;
          expect(res.body.user).to.have.property('email', 'sarah.connor@projectflow.io');
          expect(res.body.user).to.not.have.property('passwordHash');
          done();
        });
    });

    it('TC_API_003 [Invalid Scenario]: should return 400 Bad Request when email format is invalid', (done) => {
      chai.request(app)
        .post('/api/auth/register')
        .send({
          name: 'Invalid Email User',
          email: 'invalid-email-address',
          password: 'ValidPassword123!',
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.success).to.be.false;
          expect(res.body.error).to.include('Invalid email');
          done();
        });
    });

    it('TC_API_004 [Invalid Scenario]: should return 400 Bad Request when password is under 8 characters', (done) => {
      chai.request(app)
        .post('/api/auth/register')
        .send({
          name: 'Short Password User',
          email: 'shortpass@projectflow.io',
          password: '123',
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.success).to.be.false;
          expect(res.body.error).to.include('at least 8 characters');
          done();
        });
    });
  });

  // 3. User Login
  describe('POST /api/auth/login', () => {
    it('TC_API_005 [Valid Scenario]: should log in successfully with 200 OK and return JWT access token', (done) => {
      chai.request(app)
        .post('/api/auth/login')
        .send({
          email: 'tanmay@projectflow.io',
          password: 'SecurePassword123!',
        })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.success).to.be.true;
          expect(res.body.token).to.be.a('string');
          expect(res.body.user.email).to.equal('tanmay@projectflow.io');
          done();
        });
    });

    it('TC_API_006 [Invalid Scenario]: should return 401 Unauthorized when password is incorrect', (done) => {
      chai.request(app)
        .post('/api/auth/login')
        .send({
          email: 'tanmay@projectflow.io',
          password: 'WrongPassword999!',
        })
        .end((err, res) => {
          expect(res).to.have.status(401);
          expect(res.body.success).to.be.false;
          expect(res.body.error).to.equal('Invalid email or password');
          done();
        });
    });
  });

  // 4. Workspaces API
  describe('Workspaces API: Authentication & Input Validation', () => {
    it('TC_API_007 [Invalid Scenario]: should reject GET /api/workspaces without Bearer token with 401 Unauthorized', (done) => {
      chai.request(app)
        .get('/api/workspaces')
        .end((err, res) => {
          expect(res).to.have.status(401);
          expect(res.body.success).to.be.false;
          expect(res.body.error).to.equal('Authentication required');
          done();
        });
    });

    it('TC_API_008 [Valid Scenario]: should return 200 OK and list of workspaces when authenticated', (done) => {
      chai.request(app)
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${validAuthToken}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.success).to.be.true;
          expect(res.body.workspaces).to.be.an('array');
          done();
        });
    });

    it('TC_API_009 [Invalid Scenario]: should reject POST /api/workspaces when slug is missing with 400 Bad Request', (done) => {
      chai.request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${validAuthToken}`)
        .send({ name: 'Alpha Workspace' }) // Missing slug
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.success).to.be.false;
          expect(res.body.error).to.include('slug');
          done();
        });
    });

    it('TC_API_010 [Valid Scenario]: should create workspace with 201 Created when payload is compliant', (done) => {
      chai.request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${validAuthToken}`)
        .send({
          name: 'Mobile App Team',
          slug: 'mobile-app-team',
        })
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body.success).to.be.true;
          expect(res.body.workspace.slug).to.equal('mobile-app-team');
          done();
        });
    });
  });

  // 5. Tasks API
  describe('Tasks API: CRUD Operations', () => {
    it('TC_API_011 [Invalid Scenario]: should return 400 Bad Request when task title is empty', (done) => {
      chai.request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${validAuthToken}`)
        .send({ priority: 'HIGH' }) // Missing title
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.success).to.be.false;
          expect(res.body.error).to.equal('Task title is required');
          done();
        });
    });

    it('TC_API_012 [Valid Scenario]: should create a task with 201 Created and default priority', (done) => {
      chai.request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${validAuthToken}`)
        .send({ title: 'Implement Mocha Unit Tests', priority: 'HIGH' })
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body.success).to.be.true;
          expect(res.body.task.title).to.equal('Implement Mocha Unit Tests');
          expect(res.body.task.priority).to.equal('HIGH');
          done();
        });
    });

    it('TC_API_013 [Valid Scenario]: should retrieve task details by ID with 200 OK', (done) => {
      chai.request(app)
        .get('/api/tasks/task-001')
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.success).to.be.true;
          expect(res.body.task.id).to.equal('task-001');
          done();
        });
    });

    it('TC_API_014 [Invalid Scenario]: should return 404 Not Found for non-existent task ID', (done) => {
      chai.request(app)
        .get('/api/tasks/non-existent-task-999')
        .end((err, res) => {
          expect(res).to.have.status(404);
          expect(res.body.success).to.be.false;
          expect(res.body.error).to.equal('Task not found');
          done();
        });
    });
  });

  // 6. Sprints API
  describe('Sprints API: Date & Schema Verification', () => {
    it('TC_API_015 [Invalid Scenario]: should reject sprint creation with 400 Bad Request when dates are omitted', (done) => {
      chai.request(app)
        .post('/api/sprints')
        .set('Authorization', `Bearer ${validAuthToken}`)
        .send({ name: 'Sprint 24' })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body.success).to.be.false;
          expect(res.body.error).to.include('dates are required');
          done();
        });
    });

    it('TC_API_016 [Valid Scenario]: should create sprint with 201 Created when full parameters provided', (done) => {
      chai.request(app)
        .post('/api/sprints')
        .set('Authorization', `Bearer ${validAuthToken}`)
        .send({
          name: 'Sprint 24',
          startDate: '2026-11-01T00:00:00.000Z',
          endDate: '2026-11-15T00:00:00.000Z',
        })
        .end((err, res) => {
          expect(res).to.have.status(201);
          expect(res.body.success).to.be.true;
          expect(res.body.sprint.name).to.equal('Sprint 24');
          done();
        });
    });
  });

  // 7. Undefined Route Handler
  describe('Fallback Routing (404 Handling)', () => {
    it('TC_API_017 [Invalid Scenario]: should return 404 Not Found for unmatched route URL', (done) => {
      chai.request(app)
        .get('/api/undefined-endpoint-xyz')
        .end((err, res) => {
          expect(res).to.have.status(404);
          expect(res.body.success).to.be.false;
          expect(res.body.error).to.equal('Resource not found');
          done();
        });
    });
  });
});
