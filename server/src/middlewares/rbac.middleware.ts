import { Request, Response, NextFunction, RequestHandler } from 'express';
import { WorkspaceRole } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import prisma from '../config/db';

/**
 * Middleware to enforce Role-Based Access Control (RBAC) on a workspace level.
 * Checks if the authenticated user is a member of the target workspace and
 * has the required role (ADMIN or MEMBER).
 */
export const workspaceRbac = (allowedRoles?: WorkspaceRole[]): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required.');
      }

      // 1. Extract workspaceId from parameters, body, or query safely
      let workspaceId = req.params.workspaceId || req.body?.workspaceId || (req.query?.workspaceId as string);

      // Handle direct workspace routes where the parameter is :id (e.g. GET /workspaces/:id)
      const isWorkspaceRoute = req.baseUrl.endsWith('/workspaces') || req.path.includes('/workspaces');
      if (!workspaceId && req.params.id && isWorkspaceRoute) {
        workspaceId = req.params.id;
      }

      if (!workspaceId) {
        throw new ForbiddenError('Workspace identifier is required for this operation.');
      }

      // 2. Fetch user membership details in the workspace
      const member = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId,
          },
        },
      });

      if (!member) {
        throw new ForbiddenError('Access Denied. You are not a member of this workspace.');
      }

      // 3. Verify workspace role permissions if restricted roles are specified
      if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(member.role)) {
          throw new ForbiddenError('Access Denied. You do not have the required role to perform this action.');
        }
      }

      // 4. Attach membership details to request for downstream controller access
      req.workspaceMember = {
        id: member.id,
        userId: member.userId,
        workspaceId: member.workspaceId,
        role: member.role,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default workspaceRbac;
