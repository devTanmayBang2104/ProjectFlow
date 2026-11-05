import prisma from '../config/db';
import { TaskStatus, TaskType, Priority, ActivityAction, NotificationType } from '@prisma/client';
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import { ActivityLogService } from './activity.service';
import { NotificationService } from './notification.service';
import { SocketService } from './socket.service';
import cacheService from './cache.service';

const activityLog = new ActivityLogService();
const notification = new NotificationService();

export class TaskService {
  /**
   * Creates a new task in a project.
   */
  public async createTask(
    userId: string,
    projectId: string,
    data: {
      title: string;
      description?: string;
      status?: TaskStatus;
      type?: TaskType;
      priority?: Priority;
      assigneeId: string;
      due_date: string;
      sprintId?: string;
      labelIds?: string[];
    }
  ): Promise<any> {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundError('Project not found.');
    }

    if (project.status === 'COMPLETED' || project.status === 'CANCELLED') {
      throw new BadRequestError(`Cannot create tasks in a project that is ${project.status.toLowerCase()}.`);
    }

    // Verify assignee is a member of the project if assigned
    const hasAssignee = data.assigneeId && data.assigneeId !== "";
    if (hasAssignee) {
      const isMember = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: data.assigneeId,
            projectId,
          }
        }
      });

      if (!isMember) {
        throw new BadRequestError('Assignee must be a member of the project team.');
      }
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        title: data.title,
        description: data.description,
        status: data.status || TaskStatus.TODO,
        type: data.type || TaskType.TASK,
        priority: data.priority || Priority.MEDIUM,
        assigneeId: (hasAssignee ? data.assigneeId : null) as any,
        due_date: new Date(data.due_date),
        sprintId: (data.sprintId ? data.sprintId : null) as any,
        labels: data.labelIds ? {
          connect: data.labelIds.map((id) => ({ id }))
        } : undefined,
      },
      include: {
        assignee: {
          select: { id: true, name: true, image: true }
        },
        labels: true,
      }
    });

    // Log workspace activity
    await activityLog.log(
      project.workspaceId,
      userId,
      ActivityAction.CREATE,
      'TASK',
      task.id,
      `created task "${task.title}"`,
      projectId
    );

    // Notify assignee (if not the creator)
    if (hasAssignee && data.assigneeId !== userId) {
      await notification.create(
        data.assigneeId,
        'New Task Assignment',
        `You have been assigned to task: "${task.title}" in project "${project.name}"`,
        NotificationType.TASK_ASSIGNED,
        'TASK',
        task.id
      );
    }

    // Broadcast task creation to workspace room
    SocketService.broadcastTaskUpdate(project.workspaceId, task.id, 'create', {
      ...task,
      projectId: project.id,
    });

    // Invalidate project and workspace caches
    await cacheService.invalidatePattern(`project:${projectId}:*`);
    await cacheService.invalidatePattern(`projects:workspace:${project.workspaceId}:*`);

    // Automatically recalculate and persist project progress
    await this.recalculateProjectProgress(projectId);

    return task;
  }

  /**
   * Retrieves full task details (including subtasks, comments, attachments, and labels).
   */
  public async getTaskById(taskId: string): Promise<any> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            workspaceId: true,
            start_date: true,
            status: true,
            priority: true,
            progress: true,
            team_lead: true,
            workspace: {
              select: {
                ownerId: true,
                members: {
                  select: {
                    userId: true,
                    role: true,
                  }
                }
              }
            }
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        },
        subtasks: {
          orderBy: { createdAt: 'asc' }
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        attachments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        labels: true,
      }
    });

    if (!task) {
      throw new NotFoundError('Task not found.');
    }

    return task;
  }

  /**
   * Updates task details.
   */
  public async updateTask(
    taskId: string,
    userId: string,
    data: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      type?: TaskType;
      priority?: Priority;
      assigneeId?: string;
      due_date?: string;
      sprintId?: string;
      labelIds?: string[];
      version?: number;
    }
  ): Promise<any> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true }
    });

    if (!task) {
      throw new NotFoundError('Task not found.');
    }

    // System Design - Optimistic Concurrency Control (OCC)
    // Prevent lost updates by ensuring the client is operating on the latest version
    if (data.version !== undefined && (task as any).version !== undefined) {
      if ((task as any).version !== data.version) {
        throw new ConflictError(
          'Conflict detected: This task has already been updated by another user. Please refresh and review the latest changes.'
        );
      }
    }

    const updateData: any = {
      title: data.title,
      description: data.description,
      status: data.status,
      type: data.type,
      priority: data.priority,
      assigneeId: data.assigneeId === "" ? null : data.assigneeId,
      version: { increment: 1 },
    };

    if (data.due_date !== undefined) {
      updateData.due_date = data.due_date ? new Date(data.due_date) : undefined;
    }

    if (data.sprintId !== undefined) {
      updateData.sprintId = data.sprintId || null;
    }

    if (data.labelIds !== undefined) {
      updateData.labels = {
        set: data.labelIds.map((id) => ({ id }))
      };
    }

    // Verify new assignee exists in project
    if (data.assigneeId && data.assigneeId !== task.assigneeId) {
      const isMember = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: data.assigneeId,
            projectId: task.projectId,
          }
        }
      });
      if (!isMember) {
        throw new BadRequestError('Assignee must be a member of the project team.');
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, name: true, image: true }
        },
        labels: true,
      }
    });

    // Notify new assignee if changed
    if (data.assigneeId && data.assigneeId !== task.assigneeId && data.assigneeId !== userId) {
      await notification.create(
        data.assigneeId,
        'Task Reassigned to You',
        `Task: "${updatedTask.title}" has been reassigned to you in project "${task.project.name}"`,
        NotificationType.TASK_ASSIGNED,
        'TASK',
        taskId
      );
    }

    // Log workspace activity
    await activityLog.log(
      task.project.workspaceId,
      userId,
      ActivityAction.UPDATE,
      'TASK',
      taskId,
      `updated task "${updatedTask.title}"`,
      task.projectId
    );

    // Broadcast update to workspace room
    SocketService.broadcastTaskUpdate(task.project.workspaceId, taskId, 'update', updatedTask);

    // Automatically recalculate and persist project progress
    await this.recalculateProjectProgress(task.projectId);

    // Invalidate project and workspace caches
    await cacheService.invalidatePattern(`project:${task.projectId}:*`);
    await cacheService.invalidatePattern(`projects:workspace:${task.project.workspaceId}:*`);

    return updatedTask;
  }

  /**
   * Deletes a task.
   */
  public async deleteTask(taskId: string, userId: string): Promise<void> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true }
    });

    if (!task) {
      throw new NotFoundError('Task not found.');
    }

    await prisma.task.delete({ where: { id: taskId } });

    await activityLog.log(
      task.project.workspaceId,
      userId,
      ActivityAction.DELETE,
      'TASK',
      taskId,
      `deleted task "${task.title}"`,
      task.projectId
    );

    // Broadcast delete to workspace room
    SocketService.broadcastTaskUpdate(task.project.workspaceId, taskId, 'delete', { 
      id: taskId,
      projectId: task.projectId 
    });

    // Automatically recalculate and persist project progress
    await this.recalculateProjectProgress(task.projectId);

    // Invalidate project and workspace caches
    await cacheService.invalidatePattern(`project:${task.projectId}:*`);
    await cacheService.invalidatePattern(`projects:workspace:${task.project.workspaceId}:*`);
  }

  /**
   * Automatically calculates and persists project progress based on task completion.
   * Formula: Progress = (Completed Tasks / Total Tasks) * 100
   */
  public async recalculateProjectProgress(projectId: string): Promise<number> {
    try {
      const [totalTasks, completedTasks] = await Promise.all([
        prisma.task.count({ where: { projectId } }),
        prisma.task.count({ where: { projectId, status: TaskStatus.DONE } }),
      ]);

      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      await prisma.project.update({
        where: { id: projectId },
        data: { progress },
      });
      return progress;
    } catch (err) {
      console.warn(`[TaskService] Failed to auto-recalculate project progress for ${projectId}:`, err);
      return 0;
    }
  }

  // --- SUBTASKS ---

  public async addSubtask(taskId: string, title: string): Promise<any> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true }
    });
    if (!task) {
      throw new NotFoundError('Task not found.');
    }

    const subtask = await prisma.subtask.create({
      data: {
        taskId,
        title,
        isCompleted: false,
      }
    });

    // Broadcast subtask change for real-time socket updates
    SocketService.broadcastTaskUpdate(task.project.workspaceId, taskId, 'update', {
      id: taskId,
    });

    return subtask;
  }

  public async updateSubtask(subtaskId: string, data: { title?: string; isCompleted?: boolean }): Promise<any> {
    const subtask = await prisma.subtask.findUnique({
      where: { id: subtaskId },
      include: {
        task: {
          include: { project: true }
        }
      }
    });
    if (!subtask) {
      throw new NotFoundError('Subtask not found.');
    }

    const updated = await prisma.subtask.update({
      where: { id: subtaskId },
      data: {
        title: data.title,
        isCompleted: data.isCompleted,
      }
    });

    // Broadcast subtask change for real-time socket updates
    SocketService.broadcastTaskUpdate(subtask.task.project.workspaceId, subtask.taskId, 'update', {
      id: subtask.taskId,
    });

    return updated;
  }

  public async deleteSubtask(subtaskId: string): Promise<void> {
    const subtask = await prisma.subtask.findUnique({
      where: { id: subtaskId },
      include: {
        task: {
          include: { project: true }
        }
      }
    });
    if (!subtask) {
      throw new NotFoundError('Subtask not found.');
    }

    const workspaceId = subtask.task.project.workspaceId;
    const taskId = subtask.taskId;

    await prisma.subtask.delete({ where: { id: subtaskId } });

    // Broadcast subtask change for real-time socket updates
    SocketService.broadcastTaskUpdate(workspaceId, taskId, 'update', {
      id: taskId,
    });
  }

  // --- COMMENTS ---

  public async addComment(taskId: string, userId: string, content: string, parentId?: string | null): Promise<any> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            workspace: {
              include: {
                members: {
                  include: {
                    user: {
                      select: { id: true, name: true, username: true, email: true }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
    if (!task) {
      throw new NotFoundError('Task not found.');
    }

    if (parentId) {
      const parentComment = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parentComment || parentComment.taskId !== taskId) {
        throw new BadRequestError('Parent comment does not exist on this task.');
      }
    }

    const comment = await prisma.comment.create({
      data: {
        taskId,
        userId,
        content,
        parentId: parentId || null,
        reactions: {},
      },
      include: {
        user: {
          select: { id: true, name: true, image: true }
        }
      }
    });

    // 1. Extract @mentions from comment content (supports @username or @[Name](id) or @Name)
    const mentionRegex = /@(\w+)/g;
    const matches = Array.from(content.matchAll(mentionRegex), (m) => m[1].toLowerCase());
    const workspaceMembers = task.project.workspace.members;

    const mentionedUserIds = new Set<string>();
    for (const match of matches) {
      const matchedMember = workspaceMembers.find(
        (m) =>
          m.user.username?.toLowerCase() === match ||
          m.user.name.toLowerCase().replace(/\s+/g, '') === match ||
          m.user.name.toLowerCase().split(' ')[0] === match
      );
      if (matchedMember && matchedMember.userId !== userId) {
        mentionedUserIds.add(matchedMember.userId);
      }
    }

    // Dispatch @mention notifications
    for (const mentionedId of mentionedUserIds) {
      try {
        await notification.create(
          mentionedId,
          `Mentioned in task: "${task.title}"`,
          `${comment.user.name} mentioned you in a comment: "${content.substring(0, 50)}..."`,
          NotificationType.TASK_MENTION,
          'TASK',
          taskId
        );
      } catch (err) {
        console.error(`[Notification Error] Failed to notify mentioned user ${mentionedId}:`, err);
      }
    }

    // 2. Notify parent comment author if replying to a thread
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({ where: { id: parentId } });
      if (parentComment && parentComment.userId !== userId && !mentionedUserIds.has(parentComment.userId)) {
        await notification.create(
          parentComment.userId,
          'Reply to your comment',
          `${comment.user.name} replied to your thread in "${task.title}"`,
          NotificationType.TASK_COMMENT,
          'TASK',
          taskId
        );
      }
    }

    // 3. Notify assignee (if not commenter, not parent commenter, and not mentioned)
    if (
      task.assigneeId &&
      task.assigneeId !== userId &&
      !mentionedUserIds.has(task.assigneeId)
    ) {
      await notification.create(
        task.assigneeId,
        'New Comment on Assigned Task',
        `A comment was posted on task "${task.title}": "${content.substring(0, 30)}..."`,
        NotificationType.TASK_COMMENT,
        'TASK',
        taskId
      );
    }

    // Log activity
    await activityLog.log(
      task.project.workspaceId,
      userId,
      ActivityAction.COMMENT,
      'COMMENT',
      comment.id,
      parentId ? `replied to a comment on task "${task.title}"` : `commented on task "${task.title}"`,
      task.projectId
    );

    // Broadcast task change for real-time socket updates
    SocketService.broadcastTaskUpdate(task.project.workspaceId, taskId, 'update', {
      id: taskId,
      commentId: comment.id,
      parentId: comment.parentId,
    });

    return comment;
  }

  public async toggleReaction(commentId: string, userId: string, emoji: string): Promise<any> {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        task: {
          include: { project: true }
        }
      }
    });

    if (!comment) {
      throw new NotFoundError('Comment not found.');
    }

    const currentReactions = (comment.reactions as Record<string, string[]>) || {};
    const userList: string[] = currentReactions[emoji] || [];

    let updatedList: string[];
    if (userList.includes(userId)) {
      // Remove reaction if already reacted
      updatedList = userList.filter((id) => id !== userId);
    } else {
      // Add reaction
      updatedList = [...userList, userId];
    }

    const updatedReactions = { ...currentReactions };
    if (updatedList.length > 0) {
      updatedReactions[emoji] = updatedList;
    } else {
      delete updatedReactions[emoji];
    }

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: { reactions: updatedReactions },
      include: {
        user: { select: { id: true, name: true, image: true } }
      }
    });

    // Real-time broadcast
    SocketService.broadcastTaskUpdate(comment.task.project.workspaceId, comment.taskId, 'update', {
      id: comment.taskId,
      commentId,
      reactions: updatedReactions,
    });

    return updatedComment;
  }

  public async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        task: {
          include: { project: true }
        }
      }
    });
    if (!comment) {
      throw new NotFoundError('Comment not found.');
    }

    const isCreator = comment.userId === userId;

    const workspaceMember = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: comment.task.project.workspaceId,
        }
      }
    });
    const isAdmin = workspaceMember?.role === 'ADMIN';

    if (!isCreator && !isAdmin) {
      throw new ForbiddenError('You can only delete your own comments unless you are a Workspace Administrator.');
    }

    const workspaceId = comment.task.project.workspaceId;
    const taskId = comment.taskId;

    await prisma.comment.delete({ where: { id: commentId } });

    // Broadcast task change for real-time socket updates
    SocketService.broadcastTaskUpdate(workspaceId, taskId, 'update', {
      id: taskId,
    });
  }

  // --- ATTACHMENTS ---

  public async addAttachment(
    taskId: string,
    userId: string,
    url: string,
    filename: string,
    size: number,
    type: string,
    publicId: string
  ): Promise<any> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true }
    });
    if (!task) {
      throw new NotFoundError('Task not found.');
    }

    const attachment = await prisma.attachment.create({
      data: {
        taskId,
        userId,
        fileUrl: url,
        fileName: filename,
        fileSize: size,
        fileType: type,
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    });

    // Log activity
    await activityLog.log(
      task.project.workspaceId,
      userId,
      ActivityAction.UPDATE,
      'ATTACHMENT',
      attachment.id,
      `uploaded attachment "${filename}" to task "${task.title}"`,
      task.projectId
    );

    // Broadcast task change (attaching the new attachment list)
    SocketService.broadcastTaskUpdate(task.project.workspaceId, taskId, 'update', {
      id: taskId,
      attachments: [attachment],
    });

    return attachment;
  }

  public async deleteAttachment(attachmentId: string, userId: string): Promise<void> {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        task: {
          include: { project: true }
        }
      }
    });

    if (!attachment) {
      throw new NotFoundError('Attachment not found.');
    }

    // Permit deleting if user is uploader or task assignee or project team lead
    const workspaceId = attachment.task.project.workspaceId;
    const isUploader = attachment.userId === userId;

    if (!isUploader) {
      const member = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId,
            workspaceId,
          }
        }
      });
      const isAdmin = member?.role === 'ADMIN';
      const isTeamLead = attachment.task.project.team_lead === userId;

      if (!isAdmin && !isTeamLead) {
        throw new ForbiddenError('You do not have permission to delete this attachment.');
      }
    }

    // 1. Delete physical storage (Cloudinary or local disk)
    const { UploadService } = await import('./cloudinary.service');
    const getPublicIdFromUrl = (fileUrl: string): string => {
      if (fileUrl.includes('/uploads/')) {
        const filename = fileUrl.split('/uploads/').pop();
        return filename ? `local-${filename}` : '';
      }
      if (fileUrl.includes('res.cloudinary.com')) {
        const parts = fileUrl.split('/image/upload/');
        if (parts.length > 1) {
          const pathAfterUpload = parts[1].replace(/^v\d+\//, '');
          const lastDotIndex = pathAfterUpload.lastIndexOf('.');
          return lastDotIndex !== -1 ? pathAfterUpload.substring(0, lastDotIndex) : pathAfterUpload;
        }
      }
      return '';
    };
    const publicId = getPublicIdFromUrl(attachment.fileUrl);
    await UploadService.deleteFile(publicId);

    // 2. Delete database entry
    await prisma.attachment.delete({ where: { id: attachmentId } });

    // 3. Log workspace activity
    await activityLog.log(
      workspaceId,
      userId,
      ActivityAction.UPDATE,
      'ATTACHMENT',
      attachmentId,
      `removed attachment "${attachment.fileName}" from task "${attachment.task.title}"`,
      attachment.task.projectId
    );

    // 4. Broadcast update to workspace
    SocketService.broadcastTaskUpdate(workspaceId, attachment.taskId, 'update', {
      id: attachment.taskId,
    });
  }

  // --- LABELS / TAGS ---

  public async createLabel(workspaceId: string, name: string, color: string): Promise<any> {
    return prisma.label.create({
      data: {
        workspaceId,
        name,
        color,
      }
    });
  }

  public async getWorkspaceLabels(workspaceId: string): Promise<any[]> {
    return prisma.label.findMany({ where: { workspaceId } });
  }

  public async deleteLabel(labelId: string): Promise<void> {
    await prisma.label.delete({ where: { id: labelId } });
  }
}
