import { z } from 'zod';
import { WorkspaceRole } from '@prisma/client';

export const createWorkspaceSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Workspace name must be at least 2 characters long'),
    slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
    description: z.string().max(250, 'Description cannot exceed 250 characters').optional(),
    imageUrl: z.string().url('Invalid image URL').or(z.literal('')).optional(),
  }),
});

export const updateWorkspaceSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Workspace name must be at least 2 characters long').optional(),
    description: z.string().max(250, 'Description cannot exceed 250 characters').optional(),
    imageUrl: z.string().url('Invalid image URL').or(z.literal('')).optional(),
    settings: z.record(z.any()).optional(),
  }),
});

export const addWorkspaceMemberSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    role: z.enum([WorkspaceRole.ADMIN, WorkspaceRole.MEMBER]).optional(),
  }),
});
