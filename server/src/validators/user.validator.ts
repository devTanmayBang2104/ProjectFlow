import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters long').optional(),
    username: z.string().min(3, 'Username must be at least 3 characters long').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain alphanumeric characters and underscores').optional(),
    image: z.string().url('Invalid image URL').or(z.literal('')).optional(),
  }),
});

export const updatePreferencesSchema = z.object({
  body: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    language: z.string().min(2, 'Language code must be at least 2 characters long').optional(),
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
  }),
});

export const softDeleteSchema = z.object({
  body: z.object({
    password: z.string().optional(),
  }),
});

export const recoverAccountSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().optional(),
  }),
});
