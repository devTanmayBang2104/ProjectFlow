import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from "../src/validators/auth.validator";
import {
  createWorkspaceSchema,
  addWorkspaceMemberSchema,
} from "../src/validators/workspace.validator";
import { createProjectSchema } from "../src/validators/project.validator";
import { createSprintSchema } from "../src/validators/sprint.validator";
import { createTaskSchema } from "../src/validators/task.validator";

describe("Zod Validation Schemas", () => {
  describe("Auth Validators", () => {
    it("should accept valid registration data and reject short passwords or bad emails", () => {
      const valid = registerSchema.safeParse({
        body: {
          name: "Tanmay",
          email: "tanmay@example.com",
          password: "SecurePassword123!",
        },
      });
      expect(valid.success).toBe(true);

      const invalidEmail = registerSchema.safeParse({
        body: {
          name: "Tanmay",
          email: "invalid-email-string",
          password: "SecurePassword123!",
        },
      });
      expect(invalidEmail.success).toBe(false);

      const shortPassword = registerSchema.safeParse({
        body: {
          name: "Tanmay",
          email: "tanmay@example.com",
          password: "123", // under 6 characters
        },
      });
      expect(shortPassword.success).toBe(false);
    });

    it("should validate changePasswordSchema where currentPassword is optional for Google users", () => {
      // For Google-first users without current password
      const googleUserChange = changePasswordSchema.safeParse({
        body: {
          newPassword: "BrandNewPassword123!",
        },
      });
      expect(googleUserChange.success).toBe(true);

      // For standard users with current password
      const standardUserChange = changePasswordSchema.safeParse({
        body: {
          currentPassword: "OldPassword123!",
          newPassword: "BrandNewPassword123!",
        },
      });
      expect(standardUserChange.success).toBe(true);
    });
  });

  describe("Workspace Validators", () => {
    it("should validate workspace creation with required slug", () => {
      const validWorkspace = createWorkspaceSchema.safeParse({
        body: {
          name: "Engineering Team",
          slug: "engineering-team",
          description: "Main workspace for core developers",
        },
      });
      expect(validWorkspace.success).toBe(true);

      const validMember = addWorkspaceMemberSchema.safeParse({
        body: {
          email: "developer@example.com",
          role: "MEMBER",
        },
      });
      expect(validMember.success).toBe(true);
    });
  });

  describe("Project, Sprint & Task Validators", () => {
    it("should validate project creation schema requiring team_lead UUID", () => {
      const validProject = createProjectSchema.safeParse({
        body: {
          name: "ProjectFlow Web App",
          description: "Full stack agile workspace",
          priority: "HIGH",
          team_lead: "123e4567-e89b-12d3-a456-426614174000",
        },
      });
      expect(validProject.success).toBe(true);
    });

    it("should validate sprint creation schema with start and end ISO dates", () => {
      const validSprint = createSprintSchema.safeParse({
        body: {
          name: "Sprint 1",
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 14 * 86400000).toISOString(),
        },
      });
      expect(validSprint.success).toBe(true);
    });

    it("should validate task creation schema requiring assigneeId UUID and due_date", () => {
      const validTask = createTaskSchema.safeParse({
        body: {
          title: "Implement Refresh Token Rotation",
          priority: "HIGH",
          status: "IN_PROGRESS",
          type: "FEATURE",
          assigneeId: "123e4567-e89b-12d3-a456-426614174000",
          due_date: new Date().toISOString(),
        },
      });
      expect(validTask.success).toBe(true);
    });
  });
});

