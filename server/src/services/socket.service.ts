import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/auth';
import prisma from '../config/db';

let ioInstance: Server | null = null;

const parseCookies = (cookieString?: string): Record<string, string> => {
  const cookies: Record<string, string> = {};
  if (!cookieString) return cookies;
  
  cookieString.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
  return cookies;
};

export class SocketService {
  /**
   * Initializes the Socket.IO server with authentication middleware and event listeners.
   */
  public static init(io: Server): void {
    ioInstance = io;

    // 1. Connection Authentication Middleware
    io.use(async (socket: Socket, next) => {
      try {
        const cookieHeader = socket.handshake.headers.cookie;
        const cookies = parseCookies(cookieHeader);
        const token = cookies['accessToken'];

        if (!token) {
          return next(new Error('Authentication failed: Token not found.'));
        }

        const decoded = verifyAccessToken(token);
        socket.data.user = decoded; // Store user details (id, email) in socket session

        next();
      } catch (err) {
        next(new Error('Authentication failed: Invalid token.'));
      }
    });

    // 2. Connection Listener
    io.on('connection', async (socket: Socket) => {
      const userId = socket.data.user?.id;
      if (!userId) return;

      console.log(`[Socket] Client connected: ${socket.id} (User: ${userId})`);

      // Join personal user room (for notifications)
      socket.join(`user:${userId}`);

      // Join rooms for all workspaces this user belongs to
      try {
        const memberships = await prisma.workspaceMember.findMany({
          where: { userId },
          select: { workspaceId: true }
        });

        memberships.forEach((m) => {
          socket.join(`workspace:${m.workspaceId}`);
          console.log(`[Socket] User ${userId} joined room workspace:${m.workspaceId}`);
        });
      } catch (err) {
        console.error('[Socket Room Join Error] Failed to join workspace rooms:', err);
      }

      socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Broadcasts a new notification to a specific user.
   */
  public static sendNotification(userId: string, notification: any): void {
    if (ioInstance) {
      ioInstance.to(`user:${userId}`).emit('notification:new', notification);
      console.log(`[Socket Broadcast] Sent notification:new to user:${userId}`);
    }
  }

  /**
   * Broadcasts a workspace activity feed log to all members of that workspace.
   */
  public static broadcastWorkspaceActivity(workspaceId: string, activityLog: any): void {
    if (ioInstance) {
      ioInstance.to(`workspace:${workspaceId}`).emit('activity:new', activityLog);
      console.log(`[Socket Broadcast] Sent activity:new to workspace:${workspaceId}`);
    }
  }

  /**
   * Broadcasts real-time task board changes to all members of that workspace.
   */
  public static broadcastTaskUpdate(workspaceId: string, taskId: string, action: 'create' | 'update' | 'delete', taskData: any): void {
    if (ioInstance) {
      ioInstance.to(`workspace:${workspaceId}`).emit('task:changed', {
        taskId,
        action,
        taskData
      });
      console.log(`[Socket Broadcast] Sent task:changed [${action}] to workspace:${workspaceId}`);
    }
  }
}
