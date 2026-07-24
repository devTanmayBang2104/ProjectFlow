import { z } from 'zod';
import { TaskStatus, TaskType, Priority } from '@prisma/client';

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(2, 'Task title must be at least 2 characters long'),
    description: z.string().optional(),
    status: z.enum([TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE]).optional(),
    type: z.enum([
      TaskType.TASK,
      TaskType.BUG,
      TaskType.FEATURE,
      TaskType.IMPROVEMENT,
      TaskType.OTHER,
    ]).optional(),
    priority: z.enum([Priority.LOW, Priority.MEDIUM, Priority.HIGH]).optional(),
    assigneeId: z.string().uuid('Assignee must be a valid User ID'),
    due_date: z.string().datetime('Invalid due date format'),
    sprintId: z.string().uuid('Sprint ID must be a valid UUID').optional(),
    labelIds: z.array(z.string().uuid('Label ID must be a valid UUID')).optional(),
  }),
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().min(2, 'Task title must be at least 2 characters long').optional(),
    description: z.string().optional(),
    status: z.enum([TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE]).optional(),
    type: z.enum([
      TaskType.TASK,
      TaskType.BUG,
      TaskType.FEATURE,
      TaskType.IMPROVEMENT,
      TaskType.OTHER,
    ]).optional(),
    priority: z.enum([Priority.LOW, Priority.MEDIUM, Priority.HIGH]).optional(),
    assigneeId: z.string().uuid('Assignee must be a valid User ID').optional(),
    due_date: z.string().datetime('Invalid due date format').optional(),
    sprintId: z.string().uuid('Sprint ID must be a valid UUID').or(z.literal(null)).optional(),
    labelIds: z.array(z.string().uuid('Label ID must be a valid UUID')).optional(),
  }),
});

export const createSubtaskSchema = z.object({
  body: z.object({
    title: z.string().min(2, 'Subtask title must be at least 2 characters long'),
  }),
});

export const updateSubtaskSchema = z.object({
  body: z.object({
    title: z.string().min(2, 'Subtask title must be at least 2 characters long').optional(),
    isCompleted: z.boolean().optional(),
  }),
});

export const createCommentSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Comment content cannot be empty'),
  }),
});

export const createLabelSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Label name cannot be empty'),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex color code (e.g. #3b82f6)'),
  }),
});
