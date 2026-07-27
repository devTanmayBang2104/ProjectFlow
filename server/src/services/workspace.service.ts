import prisma from '../config/db';
import { WorkspaceRole, ActivityAction, NotificationType } from '@prisma/client';
import { BadRequestError, ConflictError, NotFoundError, ForbiddenError } from '../utils/errors';
import { ActivityLogService } from './activity.service';
import { NotificationService } from './notification.service';

const activityLog = new ActivityLogService();
const notification = new NotificationService();

export class WorkspaceService {
  /**
   * Fetches all workspaces a user belongs to.
   */
  public async getUserWorkspaces(userId: string): Promise<any[]> {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            image_url: true,
            ownerId: true,
            createdAt: true,
          }
        }
      }
    });

    return memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
    }));
  }

  /**
   * Creates a new workspace. The creator automatically becomes the ADMIN owner.
   */
  public async createWorkspace(userId: string, name: string, slug: string, description?: string, imageUrl?: string): Promise<any> {
    const existingWorkspace = await prisma.workspace.findUnique({ where: { slug } });
    if (existingWorkspace) {
      throw new ConflictError('A workspace with this URL slug already exists. Please choose a unique slug.');
    }

    const newWorkspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        description,
        image_url: imageUrl || '',
        ownerId: userId,
        members: {
          create: {
            userId,
            role: WorkspaceRole.ADMIN,
            message: 'Owner created workspace',
          }
        }
      },
      include: {
        members: true,
      }
    });

    // Log the activity
    await activityLog.log(
      newWorkspace.id,
      userId,
      ActivityAction.CREATE,
      'WORKSPACE',
      newWorkspace.id,
      `created workspace ${newWorkspace.name}`
    );

    return newWorkspace;
  }

  /**
   * Retrieves workspace details, including members and projects.
   */
  public async getWorkspaceById(workspaceId: string): Promise<any> {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              }
            }
          }
        },
        projects: {
          orderBy: { createdAt: 'desc' },
          include: {
            tasks: true
          }
        }
      }
    });

    if (!workspace) {
      throw new NotFoundError('Workspace not found.');
    }

    return workspace;
  }

  /**
   * Updates general workspace settings.
   */
  public async updateWorkspace(workspaceId: string, userId: string, data: { name?: string; description?: string; settings?: any; imageUrl?: string }): Promise<any> {
    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name: data.name,
        description: data.description,
        settings: data.settings,
        image_url: data.imageUrl,
      }
    });

    await activityLog.log(
      workspaceId,
      userId,
      ActivityAction.UPDATE,
      'WORKSPACE',
      workspaceId,
      `updated workspace settings`
    );

    return updated;
  }

  /**
   * Deletes a workspace and cascades deletes to all children.
   */
  public async deleteWorkspace(workspaceId: string, userId: string): Promise<void> {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      throw new NotFoundError('Workspace not found.');
    }

    if (workspace.ownerId !== userId) {
      throw new ForbiddenError('Only the workspace owner can delete the workspace.');
    }

    await prisma.workspace.delete({ where: { id: workspaceId } });
  }

  /**
   * Invites and adds a user as a member of the workspace.
   */
  public async addMember(workspaceId: string, actorId: string, email: string, role: WorkspaceRole = WorkspaceRole.MEMBER): Promise<any> {
    const workspaceObj = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspaceObj) {
      throw new NotFoundError('Workspace not found.');
    }

    // Only the workspace owner can invite or promote members to ADMIN
    if (role === WorkspaceRole.ADMIN && workspaceObj.ownerId !== actorId) {
      throw new ForbiddenError('Only the workspace owner can invite or promote members to Administrator.');
    }

    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) {
      throw new NotFoundError('User with this email address not found. They must sign up for an account first.');
    }

    const existingMembership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: targetUser.id,
          workspaceId,
        }
      }
    });

    if (existingMembership) {
      throw new ConflictError('User is already a member of this workspace.');
    }

    const newMember = await prisma.workspaceMember.create({
      data: {
        userId: targetUser.id,
        workspaceId,
        role,
        message: 'Added by administrator'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        }
      }
    });

    // Log workspace activity
    await activityLog.log(
      workspaceId,
      actorId,
      ActivityAction.INVITE,
      'MEMBER',
      targetUser.id,
      `invited ${targetUser.name} to the workspace`
    );

    // Send in-app notification to the invited user
    await notification.create(
      targetUser.id,
      'Workspace Invitation',
      `You have been added to the workspace "${workspaceObj.name}"`,
      NotificationType.PROJECT_INVITE,
      'WORKSPACE',
      workspaceId
    );

    return newMember;
  }

  /**
   * Removes a member from the workspace.
   */
  public async removeMember(workspaceId: string, actorId: string, memberId: string): Promise<void> {
    const membership = await prisma.workspaceMember.findUnique({
      where: { id: memberId }
    });

    if (!membership) {
      throw new NotFoundError('Workspace membership not found.');
    }

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      throw new NotFoundError('Workspace not found.');
    }
    if (workspace.ownerId === membership.userId) {
      throw new BadRequestError('The workspace owner cannot be removed from the workspace.');
    }

    const isSelfLeaving = membership.userId === actorId;

    if (!isSelfLeaving) {
      // Fetch actor's membership role
      const actorMembership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: actorId,
            workspaceId,
          }
        }
      });

      if (!actorMembership) {
        throw new ForbiddenError('Access Denied. You do not belong to this workspace.');
      }

      const isOwner = workspace.ownerId === actorId;
      const isAdmin = actorMembership.role === WorkspaceRole.ADMIN;

      if (!isOwner && !isAdmin) {
        throw new ForbiddenError('Access Denied. Only the Owner or an Administrator can remove members.');
      }

      // If actor is an Admin (but not the owner), check target role
      if (isAdmin && !isOwner) {
        if (membership.role === WorkspaceRole.ADMIN) {
          throw new ForbiddenError('Access Denied. Workspace Administrators cannot remove other Administrators.');
        }
      }
    }

    await prisma.workspaceMember.delete({ where: { id: memberId } });

    // Log workspace activity
    await activityLog.log(
      workspaceId,
      actorId,
      ActivityAction.LEAVE,
      'MEMBER',
      membership.userId,
      isSelfLeaving ? `left the workspace` : `removed user from workspace`
    );
  }
}
