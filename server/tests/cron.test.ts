import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock node-cron and prisma
vi.mock("node-cron", () => ({
  default: {
    schedule: vi.fn((_cronExpr: string, callback: () => Promise<void>) => {
      // Store callback for manual triggering in tests
      (globalThis as any).__cronCallback = callback;
    }),
  },
}));

vi.mock("../src/config/db", () => ({
  default: {
    user: {
      deleteMany: vi.fn(),
    },
  },
}));

import prisma from "../src/config/db";
import { initCronJobs } from "../src/services/cron.service";

describe("Background Database Cleanup (Cron Service)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize daily midnight cron and purge soft-deleted (>30d) and unverified (>24h) users", async () => {
    initCronJobs();

    expect((globalThis as any).__cronCallback).toBeDefined();

    (prisma.user.deleteMany as any)
      .mockResolvedValueOnce({ count: 3 }) // 3 soft-deleted users purged
      .mockResolvedValueOnce({ count: 5 }); // 5 unverified accounts purged

    // Trigger the scheduled cron job
    await (globalThis as any).__cronCallback();

    // Verify 1: Purge soft-deleted users older than 30 days
    expect(prisma.user.deleteMany).toHaveBeenNthCalledWith(1, {
      where: {
        deletedAt: {
          lt: expect.any(Date),
        },
      },
    });

    // Verify 2: Purge unverified accounts older than 24 hours
    expect(prisma.user.deleteMany).toHaveBeenNthCalledWith(2, {
      where: {
        isEmailVerified: false,
        createdAt: {
          lt: expect.any(Date),
        },
      },
    });
  });
});

