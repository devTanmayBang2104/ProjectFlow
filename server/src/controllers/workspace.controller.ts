import { Request, Response, NextFunction } from 'express';
import { WorkspaceService } from '../services/workspace.service';
import { ActivityLogService } from '../services/activity.service';
import { UnauthorizedError } from '../utils/errors';

const workspaceService = new WorkspaceService();
const activityLog = new ActivityLogService();

export class WorkspaceController {
  public getUserWorkspaces = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const workspaces = await workspaceService.getUserWorkspaces(req.user.id);
      
      res.status(200).json({
        success: true,
        data: workspaces,
      });
    } catch (error) {
      next(error);
    }
  };

  public createWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { name, slug, description, imageUrl } = req.body;
      const workspace = await workspaceService.createWorkspace(req.user.id, name, slug, description, imageUrl);

      res.status(201).json({
        success: true,
        data: workspace,
        message: 'Workspace created successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  public getWorkspaceById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.params.id;
      const workspace = await workspaceService.getWorkspaceById(workspaceId);

      res.status(200).json({
        success: true,
        data: workspace,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const workspaceId = req.params.id;
      const { name, description, settings, imageUrl } = req.body;

      const workspace = await workspaceService.updateWorkspace(workspaceId, req.user.id, {
        name,
        description,
        settings,
        imageUrl,
      });

      res.status(200).json({
        success: true,
        data: workspace,
        message: 'Workspace updated successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const workspaceId = req.params.id;

      await workspaceService.deleteWorkspace(workspaceId, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Workspace deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  public addMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { workspaceId } = req.params;
      const { email, role } = req.body;

      const member = await workspaceService.addMember(workspaceId, req.user.id, email, role);

      res.status(200).json({
        success: true,
        data: member,
        message: 'Member added to workspace successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  public removeMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { workspaceId, memberId } = req.params;

      await workspaceService.removeMember(workspaceId, req.user.id, memberId);

      res.status(200).json({
        success: true,
        message: 'Member removed from workspace successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  public getWorkspaceActivities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { workspaceId } = req.params;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const activities = await activityLog.getWorkspaceActivities(workspaceId, page, limit);

      res.status(200).json({
        success: true,
        data: activities.logs,
        pagination: activities.pagination,
      });
    } catch (error) {
      next(error);
    }
  };
}
