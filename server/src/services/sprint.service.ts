import prisma from '../config/db';
import { SprintStatus, ActivityAction } from '@prisma/client';
import { NotFoundError, ConflictError } from '../utils/errors';
import { ActivityLogService } from './activity.service';

const activityLog = new ActivityLogService();

export class SprintService {
  /**
   * Lists all sprints for a specific project.
   */
  public async getProjectSprints(projectId: string): Promise<any[]> {
    return prisma.sprint.findMany({
      where: { projectId },
      orderBy: { startDate: 'asc' },
    });
  }

  /**
   * Creates a new sprint.
   */
  public async createSprint(
    userId: string,
    projectId: string,
    data: {
      name: string;
      startDate: string;
      endDate: string;
      status?: SprintStatus;
    }
  ): Promise<any> {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundError('Project not found.');
    }

    // If setting to ACTIVE, ensure only one active sprint exists at a time
    if (data.status === SprintStatus.ACTIVE) {
      const activeSprint = await prisma.sprint.findFirst({
        where: { projectId, status: SprintStatus.ACTIVE }
      });
      if (activeSprint) {
        throw new ConflictError('There is already an active sprint running in this project.');
      }
    }

    const sprint = await prisma.sprint.create({
      data: {
        projectId,
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: data.status || SprintStatus.UPCOMING,
      }
    });

    await activityLog.log(
      project.workspaceId,
      userId,
      ActivityAction.UPDATE,
      'SPRINT',
      sprint.id,
      `created sprint "${sprint.name}"`,
      projectId
    );

    return sprint;
  }

  /**
   * Updates sprint settings.
   */
  public async updateSprint(
    sprintId: string,
    userId: string,
    data: {
      name?: string;
      startDate?: string;
      endDate?: string;
      status?: SprintStatus;
    }
  ): Promise<any> {
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: { project: true }
    });

    if (!sprint) {
      throw new NotFoundError('Sprint not found.');
    }

    const updateData: any = {
      name: data.name,
      status: data.status,
    };

    if (data.startDate) {
      updateData.startDate = new Date(data.startDate);
    }
    if (data.endDate) {
      updateData.endDate = new Date(data.endDate);
    }

    // Verify only one active sprint exists if updating status to ACTIVE
    if (data.status === SprintStatus.ACTIVE && sprint.status !== SprintStatus.ACTIVE) {
      const activeSprint = await prisma.sprint.findFirst({
        where: { projectId: sprint.projectId, status: SprintStatus.ACTIVE }
      });
      if (activeSprint) {
        throw new ConflictError('There is already an active sprint running in this project.');
      }
    }

    const updated = await prisma.sprint.update({
      where: { id: sprintId },
      data: updateData,
    });

    await activityLog.log(
      sprint.project.workspaceId,
      userId,
      ActivityAction.UPDATE,
      'SPRINT',
      sprintId,
      `updated sprint "${updated.name}" to status ${updated.status}`,
      sprint.projectId
    );

    return updated;
  }

  /**
   * Deletes a sprint (associated tasks will remain but their sprintId is set to NULL).
   */
  public async deleteSprint(sprintId: string, userId: string): Promise<void> {
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: { project: true }
    });

    if (!sprint) {
      throw new NotFoundError('Sprint not found.');
    }

    await prisma.sprint.delete({ where: { id: sprintId } });

    await activityLog.log(
      sprint.project.workspaceId,
      userId,
      ActivityAction.UPDATE,
      'SPRINT',
      sprintId,
      `deleted sprint "${sprint.name}"`,
      sprint.projectId
    );
  }
}
