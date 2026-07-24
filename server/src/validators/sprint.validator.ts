import { z } from 'zod';
import { SprintStatus } from '@prisma/client';

export const createSprintSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Sprint name must be at least 2 characters long'),
    startDate: z.string().datetime('Invalid start date format'),
    endDate: z.string().datetime('Invalid end date format'),
    status: z.enum([SprintStatus.UPCOMING, SprintStatus.ACTIVE, SprintStatus.COMPLETED]).optional(),
  }),
});

export const updateSprintSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Sprint name must be at least 2 characters long').optional(),
    startDate: z.string().datetime('Invalid start date format').optional(),
    endDate: z.string().datetime('Invalid end date format').optional(),
    status: z.enum([SprintStatus.UPCOMING, SprintStatus.ACTIVE, SprintStatus.COMPLETED]).optional(),
  }),
});
