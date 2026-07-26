import prisma from '../config/db';
import { Priority, ProjectStatus, ActivityAction, NotificationType } from '@prisma/client';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors';
import { ActivityLogService } from './activity.service';
import { NotificationService } from './notification.service';

const activityLog = new ActivityLogService();
const notification = new NotificationService();

export class ProjectService {
  /**
   * List all projects inside a specific workspace.
   */
  public async getWorkspaceProjects(workspaceId: string, userId: string): Promise<any[]> {
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        }
      }
    });

    if (!membership) {
      throw new ForbiddenError('Access Denied. You do not belong to this workspace.');
    }

    const isAdmin = membership.role === 'ADMIN';

    if (isAdmin) {
      return prisma.project.findMany({
        where: { workspaceId },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              image: true,
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      return prisma.project.findMany({
        where: {
          workspaceId,
          OR: [
            { team_lead: userId },
            {
              members: {
                some: {
                  userId,
                }
              }
            }
          ]
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              image: true,
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }
  }

  /**
   * Creates a new project in a workspace. Adds the team lead as a project member.
   */
  public async createProject(
    userId: string,
    workspaceId: string,
    data: {
      name: string;
      description?: string;
      priority?: Priority;
      status?: ProjectStatus;
      start_date?: string;
      end_date?: string;
      team_lead: string;
    }
  ): Promise<any> {
    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        priority: data.priority || Priority.MEDIUM,
        status: data.status || ProjectStatus.ACTIVE,
        start_date: data.start_date ? new Date(data.start_date) : null,
        end_date: data.end_date ? new Date(data.end_date) : null,
        team_lead: data.team_lead,
        workspaceId,
        members: {
          create: {
            userId: data.team_lead, // Team lead is automatically added as a member
          }
        }
      },
      include: {
        owner: {
          select: { id: true, name: true }
        }
      }
    });

    // Log the activity
    await activityLog.log(
      workspaceId,
      userId,
      ActivityAction.CREATE,
      'PROJECT',
      project.id,
      `created project "${project.name}"`,
      project.id
    );

    // Notify the team lead (if it is a different user)
    if (data.team_lead !== userId) {
      await notification.create(
        data.team_lead,
        'Project Team Lead Assignment',
        `You have been assigned as the Team Lead for project "${project.name}"`,
        NotificationType.GENERAL,
        'PROJECT',
        project.id
      );
    }

    return project;
  }

  /**
   * Retrieves detailed project information including members, tasks, and sprints.
   */
  public async getProjectById(projectId: string, userId: string): Promise<any> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        },
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
        sprints: {
          orderBy: { startDate: 'asc' }
        },
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                image: true,
              }
            },
            labels: true,
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!project) {
      throw new NotFoundError('Project not found.');
    }

    // Check workspace membership
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: project.workspaceId,
        }
      }
    });

    if (!membership) {
      throw new ForbiddenError('Access Denied. You do not belong to this workspace.');
    }

    // If role is MEMBER, check if user is team lead or project member
    if (membership.role !== 'ADMIN') {
      const isTeamLead = project.team_lead === userId;
      const isProjectMember = project.members.some((m) => m.userId === userId);

      if (!isTeamLead && !isProjectMember) {
        throw new ForbiddenError('Access Denied. You are not a member of this project.');
      }
    }

    return project;
  }

  /**
   * Updates project details, status, or progress.
   */
  public async updateProject(
    projectId: string,
    userId: string,
    data: {
      name?: string;
      description?: string;
      priority?: Priority;
      status?: ProjectStatus;
      progress?: number;
      start_date?: string;
      end_date?: string;
      team_lead?: string;
    }
  ): Promise<any> {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundError('Project not found.');
    }

    const updateData: any = {
      name: data.name,
      description: data.description,
      priority: data.priority,
      status: data.status,
      progress: data.progress,
      team_lead: data.team_lead,
    };

    if (data.start_date !== undefined) {
      updateData.start_date = data.start_date ? new Date(data.start_date) : null;
    }
    if (data.end_date !== undefined) {
      updateData.end_date = data.end_date ? new Date(data.end_date) : null;
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
    });

    // Auto add new team lead to project members if modified
    if (data.team_lead && data.team_lead !== project.team_lead) {
      await prisma.projectMember.upsert({
        where: {
          userId_projectId: {
            userId: data.team_lead,
            projectId,
          }
        },
        create: {
          userId: data.team_lead,
          projectId,
        },
        update: {}
      });

      await notification.create(
        data.team_lead,
        'Project Team Lead Assignment',
        `You have been assigned as the new Team Lead for project "${updated.name}"`,
        NotificationType.GENERAL,
        'PROJECT',
        projectId
      );
    }

    await activityLog.log(
      project.workspaceId,
      userId,
      ActivityAction.UPDATE,
      'PROJECT',
      projectId,
      `updated project settings of "${updated.name}"`,
      projectId
    );

    return updated;
  }

  /**
   * Deletes a project.
   */
  public async deleteProject(projectId: string, userId: string): Promise<void> {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundError('Project not found.');
    }

    await prisma.project.delete({ where: { id: projectId } });

    await activityLog.log(
      project.workspaceId,
      userId,
      ActivityAction.DELETE,
      'PROJECT',
      projectId,
      `deleted project "${project.name}"`
    );
  }

  /**
   * Adds a user to the project team.
   */
  public async addMember(projectId: string, actorId: string, userId: string): Promise<any> {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundError('Project not found.');
    }

    // Verify user exists in the workspace first
    const isWorkspaceMember = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: project.workspaceId,
        }
      }
    });

    if (!isWorkspaceMember) {
      throw new BadRequestError('User must be a member of the workspace before being added to a project.');
    }

    const existingMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId,
        }
      }
    });

    if (existingMember) {
      return existingMember; // user already assigned
    }

    const member = await prisma.projectMember.create({
      data: {
        userId,
        projectId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    });

    // Notify user
    await notification.create(
      userId,
      'Project Assignment',
      `You have been assigned to the project "${project.name}"`,
      NotificationType.PROJECT_INVITE,
      'PROJECT',
      projectId
    );

    // Log activity
    await activityLog.log(
      project.workspaceId,
      actorId,
      ActivityAction.UPDATE,
      'PROJECT',
      projectId,
      `added member to project "${project.name}"`,
      projectId
    );

    return member;
  }

  /**
   * Removes a user from the project team.
   */
  public async removeMember(projectId: string, actorId: string, userId: string): Promise<void> {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundError('Project not found.');
    }

    if (project.team_lead === userId) {
      throw new BadRequestError('The project Team Lead cannot be removed from the project team.');
    }

    await prisma.projectMember.delete({
      where: {
        userId_projectId: {
          userId,
          projectId,
        }
      }
    });

    await activityLog.log(
      project.workspaceId,
      actorId,
      ActivityAction.UPDATE,
      'PROJECT',
      projectId,
      `removed a member from project "${project.name}"`,
      projectId
    );
  }
}
