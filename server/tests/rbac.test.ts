import { describe, it, expect, vi, beforeEach } from "vitest";
import { WorkspaceRole } from "@prisma/client";

// Mock Prisma and Services
vi.mock("../src/config/db", () => ({
  default: {
    workspace: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    workspaceMember: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    task: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    subtask: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    comment: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    attachment: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("../src/services/activity.service", () => ({
  ActivityLogService: class {
    log = vi.fn().mockResolvedValue({});
  },
}));

vi.mock("../src/services/notification.service", () => ({
  NotificationService: class {
    create = vi.fn().mockResolvedValue({});
  },
}));

vi.mock("../src/services/cloudinary.service", () => ({
  UploadService: {
    deleteFile: vi.fn().mockResolvedValue({}),
  },
}));

import prisma from "../src/config/db";
import { WorkspaceService } from "../src/services/workspace.service";
import { TaskService } from "../src/services/task.service";

describe("Hierarchical RBAC Service Test Suite", () => {
  let workspaceService: WorkspaceService;
  let taskService: TaskService;

  beforeEach(() => {
    vi.clearAllMocks();
    workspaceService = new WorkspaceService();
    taskService = new TaskService();
  });

  describe("Workspace Authorization Rules", () => {
    it("should allow only the workspace owner to delete the workspace", async () => {
      (prisma.workspace.findUnique as any).mockResolvedValue({
        id: "ws-1",
        ownerId: "user-owner",
      });

      // Attempt deletion by a non-owner
      await expect(
        workspaceService.deleteWorkspace("ws-1", "user-non-owner")
      ).rejects.toThrow("Only the workspace owner can delete the workspace.");

      // Attempt deletion by the owner
      (prisma.workspace.delete as any).mockResolvedValue({});
      await expect(
        workspaceService.deleteWorkspace("ws-1", "user-owner")
      ).resolves.not.toThrow();
      expect(prisma.workspace.delete).toHaveBeenCalledWith({ where: { id: "ws-1" } });
    });

    it("should prevent non-owners from promoting/inviting users as ADMIN", async () => {
      (prisma.workspace.findUnique as any).mockResolvedValue({
        id: "ws-1",
        ownerId: "user-owner",
        name: "Acme Corp",
      });

      // An Admin (actorId != ownerId) tries to invite another user as ADMIN
      await expect(
        workspaceService.addMember("ws-1", "user-admin", "new@test.com", WorkspaceRole.ADMIN)
      ).rejects.toThrow("Only the workspace owner can invite or promote members to Administrator.");
    });

    it("should prevent workspace owner from being removed", async () => {
      (prisma.workspaceMember.findUnique as any).mockResolvedValue({
        id: "mem-owner",
        userId: "user-owner",
      });
      (prisma.workspace.findUnique as any).mockResolvedValue({
        id: "ws-1",
        ownerId: "user-owner",
      });

      await expect(
        workspaceService.removeMember("ws-1", "user-admin", "mem-owner")
      ).rejects.toThrow("The workspace owner cannot be removed");
    });

    it("should prevent Workspace Admins from removing other Admins", async () => {
      (prisma.workspaceMember.findUnique as any).mockImplementation(({ where }: any) => {
        if (where?.id === "mem-target-admin") {
          return Promise.resolve({
            id: "mem-target-admin",
            userId: "user-target-admin",
            role: WorkspaceRole.ADMIN,
          });
        }
        if (where?.userId_workspaceId?.userId === "user-acting-admin") {
          return Promise.resolve({
            id: "mem-acting-admin",
            userId: "user-acting-admin",
            role: WorkspaceRole.ADMIN,
          });
        }
        return Promise.resolve(null);
      });

      (prisma.workspace.findUnique as any).mockResolvedValue({
        id: "ws-1",
        ownerId: "user-owner", // Actor is NOT owner
      });

      await expect(
        workspaceService.removeMember("ws-1", "user-acting-admin", "mem-target-admin")
      ).rejects.toThrow("Workspace Administrators cannot remove other Administrators.");
    });
  });

  describe("Comment & Attachment Deletion Rules", () => {
    it("should allow comment creator or workspace admin to delete comments", async () => {
      (prisma.comment.findUnique as any).mockResolvedValue({
        id: "comment-1",
        userId: "user-author",
        task: { project: { workspaceId: "ws-1" } },
      });

      (prisma.comment.delete as any).mockResolvedValue({});

      // Author can delete
      await expect(taskService.deleteComment("comment-1", "user-author")).resolves.not.toThrow();
    });

    it("should allow attachment uploader, team lead, or workspace admin to delete attachments", async () => {
      (prisma.attachment.findUnique as any).mockResolvedValue({
        id: "att-1",
        userId: "user-uploader",
        fileUrl: "http://res.cloudinary.com/demo/image/upload/v1/sample.png",
        task: {
          project: {
            workspaceId: "ws-1",
            team_lead: "user-lead",
          },
        },
      });

      (prisma.attachment.delete as any).mockResolvedValue({});

      // Uploader can delete
      await expect(taskService.deleteAttachment("att-1", "user-uploader")).resolves.not.toThrow();

      // Non-uploader non-lead non-admin gets rejected
      (prisma.workspaceMember.findUnique as any).mockResolvedValue({
        role: WorkspaceRole.MEMBER,
      });

      await expect(
        taskService.deleteAttachment("att-1", "user-random-member")
      ).rejects.toThrow("You do not have permission to delete this attachment.");
    });
  });
});

