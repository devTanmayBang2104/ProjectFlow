import { Request, Response, NextFunction } from 'express';
import { ProjectService } from '../services/project.service';
import { UnauthorizedError, ForbiddenError, NotFoundError } from '../utils/errors';
import prisma from '../config/db';
import { WorkspaceRole } from '@prisma/client';

const projectService = new ProjectService();

export class ProjectController {
  public getWorkspaceProjects = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { workspaceId } = req.params;
      const projects = await projectService.getWorkspaceProjects(workspaceId, req.user.id);

      res.status(200).json({
        success: true,
        data: projects,
      });
    } catch (error) {
      next(error);
    }
  };

  public createProject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { workspaceId, name, description, priority, status, start_date, end_date, team_lead } = req.body;

      const project = await projectService.createProject(req.user.id, workspaceId, {
        name,
        description,
        priority,
        status,
        start_date,
        end_date,
        team_lead,
      });

      res.status(201).json({
        success: true,
        data: project,
        message: 'Project created successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  public getProjectById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const projectId = req.params.id;

      // 1. Fetch project to extract workspaceId and project members
      const project = await prisma.project.findUnique({ 
        where: { id: projectId },
        include: { members: true }
      });
      if (!project) throw new NotFoundError('Project not found.');

      // 2. Validate user belongs to the project's workspace
      const isMember = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: project.workspaceId,
          }
        }
      });
      if (!isMember) throw new ForbiddenError('Access Denied. You are not a member of this workspace.');

      // 3. For workspace MEMBERS, enforce project membership or team lead checks
      if (isMember.role === WorkspaceRole.MEMBER) {
        const isTeamLead = project.team_lead === req.user.id;
        const isProjMember = project.members.some((m) => m.userId === req.user.id);
        if (!isTeamLead && !isProjMember) {
          throw new ForbiddenError('Access Denied. You are not a member of this project.');
        }
      }

      const detailedProject = await projectService.getProjectById(projectId, req.user.id);

      res.status(200).json({
        success: true,
        data: detailedProject,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateProject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const projectId = req.params.id;

      // Validate project exists and user is ADMIN in workspace or Team Lead of project
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new NotFoundError('Project not found.');

      const member = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: project.workspaceId,
          }
        }
      });

      if (!member) throw new ForbiddenError('Access Denied. You do not belong to this workspace.');

      const isTeamLead = project.team_lead === req.user.id;
      const isAdmin = member.role === WorkspaceRole.ADMIN;

      if (!isTeamLead && !isAdmin) {
        throw new ForbiddenError('Access Denied. Only the Team Lead or an Administrator can edit project settings.');
      }

      const updatedProject = await projectService.updateProject(projectId, req.user.id, req.body);

      res.status(200).json({
        success: true,
        data: updatedProject,
        message: 'Project details updated successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteProject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const projectId = req.params.id;

      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new NotFoundError('Project not found.');

      const member = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: project.workspaceId,
          }
        }
      });

      if (!member || member.role !== WorkspaceRole.ADMIN) {
        throw new ForbiddenError('Access Denied. Only workspace administrators can delete projects.');
      }

      await projectService.deleteProject(projectId, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Project deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  public addMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { projectId } = req.params;
      const { userId } = req.body;

      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new NotFoundError('Project not found.');

      const member = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: project.workspaceId,
          }
        }
      });

      if (!member) throw new ForbiddenError('Access Denied.');

      const isTeamLead = project.team_lead === req.user.id;
      const isAdmin = member.role === WorkspaceRole.ADMIN;

      if (!isTeamLead && !isAdmin) {
        throw new ForbiddenError('Access Denied. Only the Team Lead or a workspace administrator can assign project members.');
      }

      const newMember = await projectService.addMember(projectId, req.user.id, userId);

      res.status(200).json({
        success: true,
        data: newMember,
        message: 'Member assigned to project successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  public removeMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { projectId, userId } = req.params;

      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new NotFoundError('Project not found.');

      const member = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: project.workspaceId,
          }
        }
      });

      if (!member) throw new ForbiddenError('Access Denied.');

      const isTeamLead = project.team_lead === req.user.id;
      const isAdmin = member.role === WorkspaceRole.ADMIN;

      if (!isTeamLead && !isAdmin) {
        throw new ForbiddenError('Access Denied. Only the Team Lead or a workspace administrator can unassign project members.');
      }

      await projectService.removeMember(projectId, req.user.id, userId);

      res.status(200).json({
        success: true,
        message: 'Member unassigned from project successfully.',
      });
    } catch (error) {
      next(error);
    }
  };
}
