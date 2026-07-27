import { Request, Response, NextFunction } from 'express';
import { TaskService } from '../services/task.service';
import { UnauthorizedError, ForbiddenError, NotFoundError } from '../utils/errors';
import prisma from '../config/db';
import { UploadService } from '../services/cloudinary.service';

const taskService = new TaskService();

export class TaskController {
  /**
   * Helper to verify user has access to a project's workspace.
   */
  private async checkProjectAccess(userId: string, projectId: string): Promise<void> {
    const project = await prisma.project.findUnique({ 
      where: { id: projectId },
      include: {
        members: { select: { userId: true } }
      }
    });
    if (!project) throw new NotFoundError('Project not found.');

    const member = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: project.workspaceId,
        }
      }
    });

    if (!member) {
      throw new ForbiddenError('Access Denied. You do not belong to this workspace.');
    }

    const isAdmin = member.role === 'ADMIN';
    const isProjectMember = project.members.some((m) => m.userId === userId) || project.team_lead === userId;

    if (!isAdmin && !isProjectMember) {
      throw new ForbiddenError('Access Denied. You must be a project member or a workspace administrator to create tasks.');
    }
  }

  /**
   * Helper to verify user has access to a task's workspace.
   */
  private async checkTaskAccess(userId: string, taskId: string, requiredAccess: 'read' | 'write' | 'delete' = 'read'): Promise<any> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            members: { select: { userId: true } }
          }
        }
      }
    });
    if (!task) throw new NotFoundError('Task not found.');

    const member = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: task.project.workspaceId,
        }
      }
    });

    if (!member) {
      throw new ForbiddenError('Access Denied. You do not belong to this workspace.');
    }

    const isAdmin = member.role === 'ADMIN';
    const isProjectMember = task.project.members.some((m) => m.userId === userId) || task.project.team_lead === userId;

    if (requiredAccess === 'delete') {
      const isTeamLead = task.project.team_lead === userId;
      if (!isAdmin && !isTeamLead) {
        throw new ForbiddenError('Access Denied. Only the Team Lead or an Administrator can delete tasks.');
      }
    } else {
      if (!isAdmin && !isProjectMember) {
        throw new ForbiddenError('Access Denied. You must be a project member or a workspace administrator.');
      }
    }

    return task;
  }

  // --- TASK CRUD ---

  public createTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { projectId, title, description, status, type, priority, assigneeId, due_date, sprintId, labelIds } = req.body;

      await this.checkProjectAccess(req.user.id, projectId);

      const task = await taskService.createTask(req.user.id, projectId, {
        title,
        description,
        status,
        type,
        priority,
        assigneeId,
        due_date,
        sprintId,
        labelIds,
      });

      res.status(201).json({
        success: true,
        data: task,
        message: 'Task created successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  public getTaskById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const taskId = req.params.id;

      await this.checkTaskAccess(req.user.id, taskId, 'read');
      const task = await taskService.getTaskById(taskId);

      res.status(200).json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const taskId = req.params.id;

      await this.checkTaskAccess(req.user.id, taskId, 'write');
      const updated = await taskService.updateTask(taskId, req.user.id, req.body);

      res.status(200).json({
        success: true,
        data: updated,
        message: 'Task details updated successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const taskId = req.params.id;

      await this.checkTaskAccess(req.user.id, taskId, 'delete');
      await taskService.deleteTask(taskId, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Task deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  // --- SUBTASKS ---

  public addSubtask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const taskId = req.params.id;
      const { title } = req.body;

      const task = await this.checkTaskAccess(req.user.id, taskId);

      // Check if user is workspace admin OR project team lead
      const workspaceMember = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: task.project.workspaceId,
          }
        }
      });
      const isTeamLead = task.project.team_lead === req.user.id;
      const isAdmin = workspaceMember?.role === 'ADMIN';

      if (!isTeamLead && !isAdmin) {
        throw new ForbiddenError('Access Denied. Only the Team Lead can add subtasks.');
      }

      const subtask = await taskService.addSubtask(taskId, title);

      res.status(201).json({
        success: true,
        data: subtask,
        message: 'Subtask added successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  public updateSubtask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { subtaskId } = req.params;

      const subtask = await prisma.subtask.findUnique({ where: { id: subtaskId } });
      if (!subtask) throw new NotFoundError('Subtask not found.');

      const task = await this.checkTaskAccess(req.user.id, subtask.taskId);

      // If renaming the subtask title, restrict to Team Leads / Workspace Admins / Owners
      if (req.body.title !== undefined) {
        const workspaceMember = await prisma.workspaceMember.findUnique({
          where: {
            userId_workspaceId: {
              userId: req.user.id,
              workspaceId: task.project.workspaceId,
            }
          }
        });
        const isTeamLead = task.project.team_lead === req.user.id;
        const isAdmin = workspaceMember?.role === 'ADMIN';

        if (!isTeamLead && !isAdmin) {
          throw new ForbiddenError('Access Denied. Only the Team Lead or an Administrator can modify subtask details.');
        }
      }

      const updated = await taskService.updateSubtask(subtaskId, req.body);

      res.status(200).json({
        success: true,
        data: updated,
        message: 'Subtask updated successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteSubtask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { subtaskId } = req.params;

      const subtask = await prisma.subtask.findUnique({ where: { id: subtaskId } });
      if (!subtask) throw new NotFoundError('Subtask not found.');

      const task = await this.checkTaskAccess(req.user.id, subtask.taskId);

      // Check if user is workspace admin OR project team lead
      const workspaceMember = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: task.project.workspaceId,
          }
        }
      });
      const isTeamLead = task.project.team_lead === req.user.id;
      const isAdmin = workspaceMember?.role === 'ADMIN';

      if (!isTeamLead && !isAdmin) {
        throw new ForbiddenError('Access Denied. Only the Team Lead can delete subtasks.');
      }

      await taskService.deleteSubtask(subtaskId);

      res.status(200).json({
        success: true,
        message: 'Subtask deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  // --- COMMENTS ---

  public addComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const taskId = req.params.id;
      const { content } = req.body;

      await this.checkTaskAccess(req.user.id, taskId);
      const comment = await taskService.addComment(taskId, req.user.id, content);

      res.status(201).json({
        success: true,
        data: comment,
        message: 'Comment posted successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { commentId } = req.params;

      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        include: {
          task: {
            include: { project: true }
          }
        }
      });
      if (!comment) throw new NotFoundError('Comment not found.');

      const isCreator = comment.userId === req.user.id;

      const workspaceMember = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: comment.task.project.workspaceId,
          }
        }
      });
      const isAdmin = workspaceMember?.role === 'ADMIN';

      if (!isCreator && !isAdmin) {
        throw new ForbiddenError('Access Denied. You can only delete your own comments unless you are a Workspace Administrator.');
      }

      await taskService.deleteComment(commentId, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Comment deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  // --- LABELS / TAGS ---

  public createLabel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { workspaceId } = req.params;
      const { name, color } = req.body;

      const label = await taskService.createLabel(workspaceId, name, color);

      res.status(201).json({
        success: true,
        data: label,
        message: 'Label created successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  public getWorkspaceLabels = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { workspaceId } = req.params;
      const labels = await taskService.getWorkspaceLabels(workspaceId);

      res.status(200).json({
        success: true,
        data: labels,
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteLabel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = req.params;

      const label = await prisma.label.findUnique({ where: { id } });
      if (!label) throw new NotFoundError('Label not found.');

      // Check workspace membership
      const member = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: req.user.id,
            workspaceId: label.workspaceId,
          }
        }
      });
      if (!member) throw new ForbiddenError('Access Denied.');

      await taskService.deleteLabel(id);

      res.status(200).json({
        success: true,
        message: 'Label deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Upload an attachment file to a specific task.
   */
  public uploadAttachment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const taskId = req.params.id;
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded.' });
        return;
      }

      // Security check: Verify project exists and user has workspace/project access
      await this.checkTaskAccess(req.user.id, taskId, 'read');

      // Upload file via UploadService (handles Cloudinary vs Local Fallback)
      const uploadResult = await UploadService.uploadFile(req.file, 'attachments');

      // Create attachment entry in database
      const attachment = await taskService.addAttachment(
        taskId,
        req.user.id,
        uploadResult.url,
        req.file.originalname,
        req.file.size,
        req.file.mimetype,
        uploadResult.publicId
      );

      res.status(201).json({
        success: true,
        data: attachment,
        message: 'Attachment uploaded successfully.',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete an attachment.
   */
  public deleteAttachment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const attachmentId = req.params.id;

      await taskService.deleteAttachment(attachmentId, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Attachment deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  };
}
