import dotenv from 'dotenv';
// Load environment variables before any other imports
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { SocketService } from './services/socket.service';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';

import { initCronJobs } from './services/cron.service';
import { apiLimiter } from './middlewares/rateLimit.middleware';
import { csrfProtection } from './middlewares/csrf.middleware';
import { errorHandler } from './middlewares/error.middleware';

// Import Route Handlers
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import workspaceRoutes from './routes/workspace.routes';
import projectRoutes from './routes/project.routes';
import sprintRoutes from './routes/sprint.routes';
import taskRoutes from './routes/task.routes';
import notificationRoutes from './routes/notification.routes';

const app = express();
const PORT = process.env.PORT || 5000;

// 1. General Security & HTTP Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 2. Cross-Origin Resource Sharing (CORS) Configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  })
);

// 3. Built-in Parsing Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploads statically for dev local fallback
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 4. Rate Limiting protection (General limit for all API paths)
app.use('/api', apiLimiter);

// 5. CSRF Protection (Double-Submit Cookie validation)
app.use('/api', csrfProtection);

// 6. Mount API Route Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/sprints', sprintRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// 7. Global Catch-All Error Handler (must be registered last)
app.use(errorHandler);

// 8. Initialize Background Cron Services
initCronJobs();

// 9. Startup Server Wrapper for Http & Socket.IO
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

SocketService.init(io);

httpServer.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`  🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  console.log(`  🔌 Socket.IO integration active.`);
  console.log(`==================================================\n`);
});

export default app;
