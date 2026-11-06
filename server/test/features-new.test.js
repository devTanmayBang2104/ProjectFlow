/**
 * New Features & Extended Capabilities Test Suite
 * Covers recently added features and previously untested modules:
 * - Threaded Comment Replies, @Mentions & Emoji Reactions
 * - Checklist / Subtasks Management
 * - In-App Notifications API
 * - Circuit Breaker Fault-Tolerance Pattern
 * - Workspace Tags & Labels Validation
 * - Idempotency Key Middleware
 */

const { expect } = require('chai');
const express = require('express');
const chai = require('chai');
const chaiHttp = require('chai-http');
const crypto = require('crypto');

chai.use(chaiHttp);

// Import Validators from compiled dist
const {
  createCommentSchema,
  updateCommentSchema,
  reactCommentSchema,
  createSubtaskSchema,
  updateSubtaskSchema,
  createLabelSchema,
} = require('../dist/validators/task.validator');

// Import Utilities
const {
  generateAccessToken,
  verifyAccessToken,
} = require('../dist/utils/auth');

const {
  CircuitBreaker,
  CircuitBreakerOpenError,
} = require('../dist/utils/circuitBreaker');

// ---------------------------------------------------------------------------
// Dedicated Express Server for New Features API Integration Tests
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json());

// In-Memory Test State
let mockComments = [
  {
    id: 'comment-001',
    taskId: 'task-100',
    userId: 'user-001',
    content: 'Initial top-level comment',
    parentId: null,
    reactions: { '👍': ['user-002'] },
    createdAt: new Date().toISOString(),
  },
];

let mockSubtasks = [
  {
    id: 'subtask-001',
    taskId: 'task-100',
    title: 'Design DB Schema',
    isCompleted: false,
    createdAt: new Date().toISOString(),
  },
];

let mockNotifications = [
  {
    id: 'notif-001',
    userId: 'user-001',
    title: 'New Mention',
    message: 'User-002 mentioned you in task-100',
    type: 'TASK_MENTION',
    entityType: 'TASK',
    entityId: 'task-100',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notif-002',
    userId: 'user-001',
    title: 'Task Assigned',
    message: 'You were assigned to task-100',
    type: 'TASK_ASSIGNED',
    entityType: 'TASK',
    entityId: 'task-100',
    isRead: true,
    createdAt: new Date().toISOString(),
  },
];

const idempotencyCache = new Map();

// Test Auth Middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

// --- Test Comments Routes ---
app.post('/api/tasks/:id/comments', authenticate, (req, res) => {
  const result = createCommentSchema.safeParse({ body: req.body });
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error.issues[0].message });
  }

  const { content, parentId } = req.body;
  const newComment = {
    id: crypto.randomUUID(),
    taskId: req.params.id,
    userId: req.user.userId,
    content,
    parentId: parentId || null,
    reactions: {},
    createdAt: new Date().toISOString(),
  };
  mockComments.push(newComment);
  res.status(201).json({ success: true, data: newComment });
});

app.put('/api/tasks/comments/:commentId', authenticate, (req, res) => {
  const result = updateCommentSchema.safeParse({ body: req.body });
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error.issues[0].message });
  }

  const comment = mockComments.find((c) => c.id === req.params.commentId);
  if (!comment) return res.status(404).json({ success: false, error: 'Comment not found' });
  if (comment.userId !== req.user.userId) {
    return res.status(403).json({ success: false, error: 'You can only edit your own comments' });
  }

  comment.content = req.body.content;
  res.status(200).json({ success: true, data: comment });
});

app.post('/api/tasks/comments/:commentId/reactions', authenticate, (req, res) => {
  const result = reactCommentSchema.safeParse({ body: req.body });
  if (!result.success) {
    return res.status(400).json({ success: false, error: 'Unsupported reaction emoji' });
  }

  const comment = mockComments.find((c) => c.id === req.params.commentId);
  if (!comment) return res.status(404).json({ success: false, error: 'Comment not found' });

  const { emoji } = req.body;
  const currentReactions = comment.reactions || {};
  const users = currentReactions[emoji] || [];

  let updatedList;
  if (users.includes(req.user.userId)) {
    updatedList = users.filter((u) => u !== req.user.userId);
  } else {
    updatedList = [...users, req.user.userId];
  }

  if (updatedList.length > 0) {
    currentReactions[emoji] = updatedList;
  } else {
    delete currentReactions[emoji];
  }
  comment.reactions = currentReactions;

  res.status(200).json({ success: true, data: comment });
});

app.delete('/api/tasks/comments/:commentId', authenticate, (req, res) => {
  const index = mockComments.findIndex((c) => c.id === req.params.commentId);
  if (index === -1) return res.status(404).json({ success: false, error: 'Comment not found' });
  mockComments.splice(index, 1);
  res.status(200).json({ success: true, message: 'Comment deleted successfully' });
});

// --- Test Subtasks Routes ---
app.post('/api/tasks/:id/subtasks', authenticate, (req, res) => {
  const result = createSubtaskSchema.safeParse({ body: req.body });
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error.issues[0].message });
  }

  const newSubtask = {
    id: `subtask-${Date.now()}`,
    taskId: req.params.id,
    title: req.body.title,
    isCompleted: false,
    createdAt: new Date().toISOString(),
  };
  mockSubtasks.push(newSubtask);
  res.status(201).json({ success: true, data: newSubtask });
});

app.put('/api/tasks/subtasks/:subtaskId', authenticate, (req, res) => {
  const result = updateSubtaskSchema.safeParse({ body: req.body });
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error.issues[0].message });
  }

  const subtask = mockSubtasks.find((s) => s.id === req.params.subtaskId);
  if (!subtask) return res.status(404).json({ success: false, error: 'Subtask not found' });

  if (req.body.title !== undefined) subtask.title = req.body.title;
  if (req.body.isCompleted !== undefined) subtask.isCompleted = req.body.isCompleted;

  res.status(200).json({ success: true, data: subtask });
});

app.delete('/api/tasks/subtasks/:subtaskId', authenticate, (req, res) => {
  const index = mockSubtasks.findIndex((s) => s.id === req.params.subtaskId);
  if (index === -1) return res.status(404).json({ success: false, error: 'Subtask not found' });
  mockSubtasks.splice(index, 1);
  res.status(200).json({ success: true, message: 'Subtask deleted' });
});

// --- Test Notifications Routes ---
app.get('/api/notifications', authenticate, (req, res) => {
  const { unread } = req.query;
  let userNotifs = mockNotifications.filter((n) => n.userId === req.user.userId);
  if (unread === 'true') {
    userNotifs = userNotifs.filter((n) => !n.isRead);
  }
  res.status(200).json({ success: true, data: userNotifs });
});

app.put('/api/notifications/:id/read', authenticate, (req, res) => {
  const notif = mockNotifications.find((n) => n.id === req.params.id);
  if (!notif) return res.status(404).json({ success: false, error: 'Notification not found' });
  notif.isRead = true;
  res.status(200).json({ success: true, data: notif });
});

app.put('/api/notifications/read-all', authenticate, (req, res) => {
  mockNotifications.forEach((n) => {
    if (n.userId === req.user.userId) n.isRead = true;
  });
  res.status(200).json({ success: true, message: 'All notifications marked as read' });
});

// --- Test Idempotent Mutation Route ---
app.post('/api/idempotent-action', authenticate, (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
  if (idempotencyKey) {
    if (idempotencyCache.has(idempotencyKey)) {
      const cached = idempotencyCache.get(idempotencyKey);
      return res.status(cached.status).set('X-Cache-Lookup', 'HIT').json(cached.body);
    }
  }

  const responseBody = { success: true, executionId: `exec-${Date.now()}-${Math.random()}` };
  if (idempotencyKey) {
    idempotencyCache.set(idempotencyKey, { status: 200, body: responseBody });
  }
  res.status(200).set('X-Cache-Lookup', 'MISS').json(responseBody);
});

// ===========================================================================
// Test Execution Suite
// ===========================================================================
describe('ProjectFlow New Features Test Suite (Extended Test Cases)', () => {
  const user1Token = generateAccessToken('user-001', 'user1@projectflow.io');
  const user2Token = generateAccessToken('user-002', 'user2@projectflow.io');

  // -------------------------------------------------------------------------
  // 1. Zod Validation Schemas for Comments & Reactions
  // -------------------------------------------------------------------------
  describe('Zod Validation: Discussion Comments & Reactions', () => {
    it('TC_NEW_001 [Valid]: createCommentSchema validates compliant top-level comment', () => {
      const result = createCommentSchema.safeParse({
        body: { content: 'Please review the authentication refactor.' },
      });
      expect(result.success).to.be.true;
    });

    it('TC_NEW_002 [Valid]: createCommentSchema validates threaded comment with optional parentId', () => {
      const result = createCommentSchema.safeParse({
        body: {
          content: 'Looks great! Approved from my side.',
          parentId: '123e4567-e89b-12d3-a456-426614174000',
        },
      });
      expect(result.success).to.be.true;
    });

    it('TC_NEW_003 [Invalid]: createCommentSchema rejects empty string content', () => {
      const result = createCommentSchema.safeParse({
        body: { content: '' },
      });
      expect(result.success).to.be.false;
    });

    it('TC_NEW_004 [Invalid]: createCommentSchema rejects non-string content', () => {
      const result = createCommentSchema.safeParse({
        body: { content: 12345 },
      });
      expect(result.success).to.be.false;
    });

    it('TC_NEW_005 [Valid]: updateCommentSchema validates valid comment edit', () => {
      const result = updateCommentSchema.safeParse({
        body: { content: 'Updated comment content text' },
      });
      expect(result.success).to.be.true;
    });

    it('TC_NEW_006 [Invalid]: updateCommentSchema rejects empty edited comment', () => {
      const result = updateCommentSchema.safeParse({
        body: { content: '' },
      });
      expect(result.success).to.be.false;
    });

    it('TC_NEW_007 [Valid]: reactCommentSchema accepts all supported emojis (👍, ❤️, 🚀, 🎉, 👀)', () => {
      const supported = ['👍', '❤️', '🚀', '🎉', '👀'];
      supported.forEach((emoji) => {
        const result = reactCommentSchema.safeParse({ body: { emoji } });
        expect(result.success).to.be.true;
      });
    });

    it('TC_NEW_008 [Invalid]: reactCommentSchema rejects unsupported emojis', () => {
      const unsupported = ['🔥', '💩', 'random', '💯'];
      unsupported.forEach((emoji) => {
        const result = reactCommentSchema.safeParse({ body: { emoji } });
        expect(result.success).to.be.false;
      });
    });
  });

  // -------------------------------------------------------------------------
  // 2. Zod Validation: Subtasks & Labels
  // -------------------------------------------------------------------------
  describe('Zod Validation: Subtasks & Workspace Labels', () => {
    it('TC_NEW_009 [Valid]: createSubtaskSchema validates subtask creation with valid title', () => {
      const result = createSubtaskSchema.safeParse({
        body: { title: 'Implement OAuth refresh token rotation' },
      });
      expect(result.success).to.be.true;
    });

    it('TC_NEW_010 [Invalid]: createSubtaskSchema rejects empty subtask title', () => {
      const result = createSubtaskSchema.safeParse({
        body: { title: '' },
      });
      expect(result.success).to.be.false;
    });

    it('TC_NEW_011 [Valid]: updateSubtaskSchema validates subtask completion state toggle', () => {
      const result = updateSubtaskSchema.safeParse({
        body: { isCompleted: true },
      });
      expect(result.success).to.be.true;
    });

    it('TC_NEW_012 [Valid]: createLabelSchema validates compliant label name and hex color', () => {
      const result = createLabelSchema.safeParse({
        body: { name: 'Urgent', color: '#EF4444' },
      });
      expect(result.success).to.be.true;
    });

    it('TC_NEW_013 [Invalid]: createLabelSchema rejects invalid hex color format', () => {
      const result = createLabelSchema.safeParse({
        body: { name: 'Urgent', color: 'not-a-hex' },
      });
      expect(result.success).to.be.false;
    });
  });

  // -------------------------------------------------------------------------
  // 3. Discussion Comments API (Chai-HTTP Integration)
  // -------------------------------------------------------------------------
  describe('Comments & Threaded Replies API (Chai-HTTP)', () => {
    let createdCommentId;

    it('TC_NEW_014 [Valid Scenario]: should create a top-level comment with 201 Created', async () => {
      const res = await chai.request(app)
        .post('/api/tasks/task-100/comments')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ content: 'Top-level discussion starter.' });

      expect(res).to.have.status(201);
      expect(res.body.success).to.be.true;
      expect(res.body.data.content).to.equal('Top-level discussion starter.');
      expect(res.body.data.parentId).to.be.null;
      createdCommentId = res.body.data.id;
    });

    it('TC_NEW_015 [Valid Scenario]: should create a threaded reply referencing parentId with 201 Created', async () => {
      const res = await chai.request(app)
        .post('/api/tasks/task-100/comments')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          content: 'Replying to the discussion starter!',
          parentId: createdCommentId,
        });

      expect(res).to.have.status(201);
      expect(res.body.success).to.be.true;
      expect(res.body.data.parentId).to.equal(createdCommentId);
    });

    it('TC_NEW_016 [Invalid Scenario]: should return 400 Bad Request when comment content is empty', async () => {
      const res = await chai.request(app)
        .post('/api/tasks/task-100/comments')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ content: '' });

      expect(res).to.have.status(400);
      expect(res.body.success).to.be.false;
    });

    it('TC_NEW_017 [Invalid Scenario]: should reject comment posting with 401 Unauthorized when token missing', async () => {
      const res = await chai.request(app)
        .post('/api/tasks/task-100/comments')
        .send({ content: 'Anonymous comment attempt' });

      expect(res).to.have.status(401);
    });

    it('TC_NEW_018 [Valid Scenario]: should allow author to edit comment with 200 OK', async () => {
      const res = await chai.request(app)
        .put(`/api/tasks/comments/${createdCommentId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ content: 'Edited content by original author.' });

      expect(res).to.have.status(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.content).to.equal('Edited content by original author.');
    });

    it('TC_NEW_019 [Invalid Scenario]: should reject comment edit from non-author with 403 Forbidden', async () => {
      const res = await chai.request(app)
        .put(`/api/tasks/comments/${createdCommentId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ content: 'Malicious unauthorized modification attempt.' });

      expect(res).to.have.status(403);
      expect(res.body.success).to.be.false;
    });

    it('TC_NEW_020 [Valid Scenario]: should toggle emoji reaction ON with 200 OK', async () => {
      const res = await chai.request(app)
        .post(`/api/tasks/comments/${createdCommentId}/reactions`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ emoji: '🚀' });

      expect(res).to.have.status(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.reactions['🚀']).to.include('user-001');
    });

    it('TC_NEW_021 [Valid Scenario]: should toggle emoji reaction OFF when clicked again', async () => {
      const res = await chai.request(app)
        .post(`/api/tasks/comments/${createdCommentId}/reactions`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ emoji: '🚀' });

      expect(res).to.have.status(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.reactions['🚀']).to.be.undefined;
    });

    it('TC_NEW_022 [Invalid Scenario]: should reject invalid emoji reaction with 400 Bad Request', async () => {
      const res = await chai.request(app)
        .post(`/api/tasks/comments/${createdCommentId}/reactions`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ emoji: '💩' });

      expect(res).to.have.status(400);
    });

    it('TC_NEW_023 [Valid Scenario]: should delete comment with 200 OK', async () => {
      const res = await chai.request(app)
        .delete(`/api/tasks/comments/${createdCommentId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res).to.have.status(200);
      expect(res.body.success).to.be.true;
    });
  });

  // -------------------------------------------------------------------------
  // 4. Subtasks / Checklist API (Chai-HTTP Integration)
  // -------------------------------------------------------------------------
  describe('Subtasks & Checklist Items API (Chai-HTTP)', () => {
    let createdSubtaskId;

    it('TC_NEW_024 [Valid Scenario]: should add subtask checklist item with 201 Created', async () => {
      const res = await chai.request(app)
        .post('/api/tasks/task-100/subtasks')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ title: 'Configure Jest / Mocha testing harness' });

      expect(res).to.have.status(201);
      expect(res.body.success).to.be.true;
      expect(res.body.data.title).to.equal('Configure Jest / Mocha testing harness');
      expect(res.body.data.isCompleted).to.be.false;
      createdSubtaskId = res.body.data.id;
    });

    it('TC_NEW_025 [Invalid Scenario]: should reject subtask creation when title is empty', async () => {
      const res = await chai.request(app)
        .post('/api/tasks/task-100/subtasks')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ title: '' });

      expect(res).to.have.status(400);
    });

    it('TC_NEW_026 [Valid Scenario]: should toggle subtask completion to true with 200 OK', async () => {
      const res = await chai.request(app)
        .put(`/api/tasks/subtasks/${createdSubtaskId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ isCompleted: true });

      expect(res).to.have.status(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.isCompleted).to.be.true;
    });

    it('TC_NEW_027 [Valid Scenario]: should delete subtask with 200 OK', async () => {
      const res = await chai.request(app)
        .delete(`/api/tasks/subtasks/${createdSubtaskId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res).to.have.status(200);
      expect(res.body.success).to.be.true;
    });
  });

  // -------------------------------------------------------------------------
  // 5. Notifications System API (Chai-HTTP Integration)
  // -------------------------------------------------------------------------
  describe('In-App Notifications API (Chai-HTTP)', () => {
    it('TC_NEW_028 [Valid Scenario]: should retrieve user notifications list with 200 OK', async () => {
      const res = await chai.request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res).to.have.status(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data).to.be.an('array');
      expect(res.body.data.length).to.be.greaterThan(0);
    });

    it('TC_NEW_029 [Valid Scenario]: should filter only unread notifications with query unread=true', async () => {
      const res = await chai.request(app)
        .get('/api/notifications?unread=true')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res).to.have.status(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.every((n) => n.isRead === false)).to.be.true;
    });

    it('TC_NEW_030 [Valid Scenario]: should mark a single notification as read with 200 OK', async () => {
      const res = await chai.request(app)
        .put('/api/notifications/notif-001/read')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res).to.have.status(200);
      expect(res.body.success).to.be.true;
      expect(res.body.data.isRead).to.be.true;
    });

    it('TC_NEW_031 [Valid Scenario]: should mark all user notifications as read with 200 OK', async () => {
      const res = await chai.request(app)
        .put('/api/notifications/read-all')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res).to.have.status(200);
      expect(res.body.success).to.be.true;
    });

    it('TC_NEW_032 [Invalid Scenario]: should reject unauthenticated notification access with 401', async () => {
      const res = await chai.request(app)
        .get('/api/notifications');

      expect(res).to.have.status(401);
    });
  });

  // -------------------------------------------------------------------------
  // 6. System Design: Circuit Breaker Pattern Unit Tests
  // -------------------------------------------------------------------------
  describe('System Design: Circuit Breaker Pattern (Fault Isolation)', () => {
    it('TC_NEW_033 [Valid]: should initialize in CLOSED state and execute successful calls', async () => {
      const cb = new CircuitBreaker({ name: 'TestService', failureThreshold: 3, cooldownPeriodMs: 50 });
      expect(cb.getState()).to.equal('CLOSED');

      const result = await cb.execute(async () => 'success_payload');
      expect(result).to.equal('success_payload');
      expect(cb.getState()).to.equal('CLOSED');
    });

    it('TC_NEW_034 [Valid]: should track consecutive failures and trip to OPEN state upon reaching threshold', async () => {
      const cb = new CircuitBreaker({ name: 'ExternalPaymentGateway', failureThreshold: 3, cooldownPeriodMs: 50 });

      for (let i = 0; i < 3; i++) {
        try {
          await cb.execute(async () => { throw new Error('Gateway 503'); });
        } catch {
          // Expected failure
        }
      }

      expect(cb.getState()).to.equal('OPEN');
    });

    it('TC_NEW_035 [Invalid]: should fail-fast with CircuitBreakerOpenError without invoking action when OPEN', async () => {
      const cb = new CircuitBreaker({ name: 'CloudinaryUploader', failureThreshold: 2, cooldownPeriodMs: 500 });

      // Trip the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await cb.execute(async () => { throw new Error('Timeout'); });
        } catch {
          // Expected
        }
      }
      expect(cb.getState()).to.equal('OPEN');

      let actionCalled = false;
      try {
        await cb.execute(async () => {
          actionCalled = true;
          return 'should_not_run';
        });
        expect.fail('Should have thrown CircuitBreakerOpenError');
      } catch (err) {
        expect(err).to.be.instanceOf(CircuitBreakerOpenError);
        expect(actionCalled).to.be.false;
      }
    });

    it('TC_NEW_036 [Valid]: should transition from OPEN to HALF_OPEN after cooldown period elapses', async () => {
      const cb = new CircuitBreaker({ name: 'SMTPMailer', failureThreshold: 2, cooldownPeriodMs: 30 });

      for (let i = 0; i < 2; i++) {
        try {
          await cb.execute(async () => { throw new Error('SMTP connection refused'); });
        } catch {
          // Expected
        }
      }
      expect(cb.getState()).to.equal('OPEN');

      // Wait for cooldown period to elapse
      await new Promise((resolve) => setTimeout(resolve, 40));
      expect(cb.getState()).to.equal('HALF_OPEN');
    });

    it('TC_NEW_037 [Valid]: should reset from HALF_OPEN to CLOSED upon successful trial request', async () => {
      const cb = new CircuitBreaker({ name: 'RedisSync', failureThreshold: 2, cooldownPeriodMs: 30 });

      for (let i = 0; i < 2; i++) {
        try {
          await cb.execute(async () => { throw new Error('Redis ECONNRESET'); });
        } catch {
          // Expected
        }
      }
      expect(cb.getState()).to.equal('OPEN');

      await new Promise((resolve) => setTimeout(resolve, 40));
      expect(cb.getState()).to.equal('HALF_OPEN');

      const trialResult = await cb.execute(async () => 'recovered_data');
      expect(trialResult).to.equal('recovered_data');
      expect(cb.getState()).to.equal('CLOSED');
    });
  });

  // -------------------------------------------------------------------------
  // 7. System Design: Idempotency Key & Mention Tag Extraction
  // -------------------------------------------------------------------------
  describe('System Design: Idempotency Key Middleware & @Mention Tag Parsing', () => {
    it('TC_NEW_038 [Valid Scenario]: should cache response and return cached payload on replay with same Idempotency-Key', async () => {
      const uniqueKey = `idempotency-test-${Date.now()}`;

      // First request (MISS)
      const res1 = await chai.request(app)
        .post('/api/idempotent-action')
        .set('Authorization', `Bearer ${user1Token}`)
        .set('Idempotency-Key', uniqueKey);

      expect(res1).to.have.status(200);
      expect(res1.header['x-cache-lookup']).to.equal('MISS');
      const firstExecutionId = res1.body.executionId;

      // Replay request with matching key (HIT)
      const res2 = await chai.request(app)
        .post('/api/idempotent-action')
        .set('Authorization', `Bearer ${user1Token}`)
        .set('Idempotency-Key', uniqueKey);

      expect(res2).to.have.status(200);
      expect(res2.header['x-cache-lookup']).to.equal('HIT');
      expect(res2.body.executionId).to.equal(firstExecutionId);
    });

    it('TC_NEW_039 [Valid Scenario]: should process new execution when a different Idempotency-Key is provided', async () => {
      const keyA = `key-A-${Date.now()}`;
      const keyB = `key-B-${Date.now()}`;

      const resA = await chai.request(app)
        .post('/api/idempotent-action')
        .set('Authorization', `Bearer ${user1Token}`)
        .set('Idempotency-Key', keyA);

      const resB = await chai.request(app)
        .post('/api/idempotent-action')
        .set('Authorization', `Bearer ${user1Token}`)
        .set('Idempotency-Key', keyB);

      expect(resA.body.executionId).to.not.equal(resB.body.executionId);
    });

    it('TC_NEW_040 [Valid]: should accurately extract @username tags from comment content', () => {
      const sampleComment = 'Hey @tanmay and @sarah, please check the status with @alex_dev!';
      const matches = sampleComment.match(/@([a-zA-Z0-9._-]+)/g) || [];
      const extractedUsers = matches.map((m) => m.slice(1));

      expect(extractedUsers).to.deep.equal(['tanmay', 'sarah', 'alex_dev']);
    });
  });
});
