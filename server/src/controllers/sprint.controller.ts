import { Request, Response, NextFunction } from 'express';
import { SprintService } from '../services/sprint.service';
import { UnauthorizedError, ForbiddenError, NotFoundError } from '../utils/errors';
import prisma from '../config/db';

const sprintService = new SprintService();

export class SprintController {
  /**
   * Helper to verify user has access to a project's workspace.
   */
  private async checkProjectAccess(userId: string, projectId: string): Promise<void> {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundError('Project not found.');

    const isMember = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: project.workspaceId,
        }
      }
    });

    if (!isMember) {
      throw new ForbiddenError('Access Denied. You are not a member of this workspace.');
    }
  }

  public getProjectSprints = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { projectId } = req.params;
      
      await this.checkProjectAccess(req.user.id, projectId);
      const sprints = await sprintService.getProjectSprints(projectId);

      res.status(200).json({
        success: true,
        data: sprints,
      });
    } catch (error) {
      next(error);
    }
  };

  public createSprint = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { projectId, name, startDate, endDate, status } = req.body;

      await this.checkProjectAccess(req.user.id, projectId);

      const sprint = await sprintService.createSprint(req.user.id, projectId, {
        name,
        startDate,
        endDate,
        status,
      });

      res.status(201).json({
        success: true,
        data: sprint,
        message: 'Sprint created successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  public updateSprint = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const sprintId = req.params.id;

      // Fetch sprint to check project access
      const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
      if (!sprint) throw new NotFoundError('Sprint not found.');

      await this.checkProjectAccess(req.user.id, sprint.projectId);

      const updated = await sprintService.updateSprint(sprintId, req.user.id, req.body);

      res.status(200).json({
        success: true,
        data: updated,
        message: 'Sprint settings updated successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteSprint = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const sprintId = req.params.id;

      const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
      if (!sprint) throw new NotFoundError('Sprint not found.');

      await this.checkProjectAccess(req.user.id, sprint.projectId);

      await sprintService.deleteSprint(sprintId, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Sprint deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  };
}
