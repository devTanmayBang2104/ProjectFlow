import { z } from 'zod';
import { Priority, ProjectStatus } from '@prisma/client';

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Project name must be at least 2 characters long'),
    description: z.string().optional(),
    priority: z.enum([Priority.LOW, Priority.MEDIUM, Priority.HIGH]).optional(),
    status: z.enum([
      ProjectStatus.ACTIVE,
      ProjectStatus.PLANNING,
      ProjectStatus.COMPLETED,
      ProjectStatus.ON_HOLD,
      ProjectStatus.CANCELLED,
    ]).optional(),
    start_date: z.string().datetime('Invalid start date format').optional(),
    end_date: z.string().datetime('Invalid end date format').optional(),
    team_lead: z.string().uuid('Team lead must be a valid User ID'),
  }),
});

export const updateProjectSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Project name must be at least 2 characters long').optional(),
    description: z.string().optional(),
    priority: z.enum([Priority.LOW, Priority.MEDIUM, Priority.HIGH]).optional(),
    status: z.enum([
      ProjectStatus.ACTIVE,
      ProjectStatus.PLANNING,
      ProjectStatus.COMPLETED,
      ProjectStatus.ON_HOLD,
      ProjectStatus.CANCELLED,
    ]).optional(),
    progress: z.number().min(0).max(100, 'Progress must be between 0 and 100').optional(),
    start_date: z.string().datetime('Invalid start date format').or(z.literal(null)).optional(),
    end_date: z.string().datetime('Invalid end date format').or(z.literal(null)).optional(),
    team_lead: z.string().uuid('Team lead must be a valid User ID').optional(),
  }),
});

export const addProjectMemberSchema = z.object({
  body: z.object({
    userId: z.string().uuid('User ID must be a valid UUID'),
  }),
});
