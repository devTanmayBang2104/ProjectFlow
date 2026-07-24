import { WorkspaceRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
      workspaceMember?: {
        id: string;
        userId: string;
        workspaceId: string;
        role: WorkspaceRole;
      };
    }
  }
}

export {};
