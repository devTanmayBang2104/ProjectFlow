import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { authMiddleware } from "../src/middlewares/auth.middleware";
import { csrfProtection } from "../src/middlewares/csrf.middleware";
import { workspaceRbac } from "../src/middlewares/rbac.middleware";
import { generateAccessToken } from "../src/utils/auth";
import { WorkspaceRole } from "@prisma/client";
import { UnauthorizedError, ForbiddenError } from "../src/utils/errors";

// Mock Prisma
vi.mock("../src/config/db", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    workspaceMember: {
      findUnique: vi.fn(),
    },
  },
}));

import prisma from "../src/config/db";

describe("Middleware Test Suite", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      cookies: {},
      headers: {},
      params: {},
      body: {},
      query: {},
      method: "GET",
      originalUrl: "/api/workspaces",
      baseUrl: "",
      path: "/workspaces",
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      cookie: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  describe("authMiddleware", () => {
    it("should allow request and attach user if valid accessToken cookie is provided", async () => {
      const token = generateAccessToken("user-1", "user@test.com");
      req.cookies = { accessToken: token };

      (prisma.user.findUnique as any).mockResolvedValue({
        id: "user-1",
        email: "user@test.com",
        deletedAt: null,
      });

      await authMiddleware(req as Request, res as Response, next);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        select: { id: true, email: true, deletedAt: true },
      });
      expect(req.user).toEqual({ id: "user-1", email: "user@test.com" });
      expect(next).toHaveBeenCalledWith();
    });

    it("should reject request with UnauthorizedError if token is missing", async () => {
      req.cookies = {};

      await authMiddleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it("should reject request if user account is soft-deleted", async () => {
      const token = generateAccessToken("user-deleted", "deleted@test.com");
      req.cookies = { accessToken: token };

      (prisma.user.findUnique as any).mockResolvedValue({
        id: "user-deleted",
        email: "deleted@test.com",
        deletedAt: new Date(),
      });

      await authMiddleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });
  });

  describe("csrfProtection", () => {
    it("should set a csrf-token cookie on safe GET requests if authenticated user lacks csrf cookie", () => {
      req.method = "GET";
      req.cookies = { accessToken: "valid-access-token" };

      csrfProtection(req as Request, res as Response, next);

      expect(res.cookie).toHaveBeenCalledWith(
        "csrf-token",
        expect.any(String),
        expect.objectContaining({ httpOnly: false })
      );
      expect(next).toHaveBeenCalledWith();
    });

    it("should bypass CSRF token verification for public auth routes", () => {
      req.method = "POST";
      req.originalUrl = "/api/auth/login";

      csrfProtection(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("should reject state-modifying requests (POST) if X-CSRF-Token does not match csrf-token cookie", () => {
      req.method = "POST";
      req.originalUrl = "/api/projects";
      req.cookies = { "csrf-token": "valid-csrf-token" };
      req.headers = { "x-csrf-token": "mismatched-token" };

      csrfProtection(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it("should accept state-modifying requests (POST) when header and cookie tokens match", () => {
      req.method = "POST";
      req.originalUrl = "/api/projects";
      req.cookies = { "csrf-token": "matching-csrf-token" };
      req.headers = { "x-csrf-token": "matching-csrf-token" };

      csrfProtection(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe("workspaceRbac", () => {
    it("should reject if user is not authenticated", async () => {
      req.user = undefined;
      req.params = { workspaceId: "ws-1" };

      const middleware = workspaceRbac();
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it("should reject if user is not a member of the target workspace", async () => {
      req.user = { id: "user-1", email: "user@test.com" };
      req.params = { workspaceId: "ws-1" };

      (prisma.workspaceMember.findUnique as any).mockResolvedValue(null);

      const middleware = workspaceRbac();
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it("should allow request and attach workspaceMember if role requirements are met", async () => {
      req.user = { id: "user-admin", email: "admin@test.com" };
      req.params = { workspaceId: "ws-1" };

      (prisma.workspaceMember.findUnique as any).mockResolvedValue({
        id: "mem-1",
        userId: "user-admin",
        workspaceId: "ws-1",
        role: WorkspaceRole.ADMIN,
      });

      const middleware = workspaceRbac([WorkspaceRole.ADMIN]);
      await middleware(req as Request, res as Response, next);

      expect(req.workspaceMember).toEqual({
        id: "mem-1",
        userId: "user-admin",
        workspaceId: "ws-1",
        role: WorkspaceRole.ADMIN,
      });
      expect(next).toHaveBeenCalledWith();
    });

    it("should reject if member role is insufficient (MEMBER trying to access ADMIN route)", async () => {
      req.user = { id: "user-member", email: "member@test.com" };
      req.params = { workspaceId: "ws-1" };

      (prisma.workspaceMember.findUnique as any).mockResolvedValue({
        id: "mem-2",
        userId: "user-member",
        workspaceId: "ws-1",
        role: WorkspaceRole.MEMBER,
      });

      const middleware = workspaceRbac([WorkspaceRole.ADMIN]);
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });
});

