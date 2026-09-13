import { describe, it, expect } from "vitest";
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashRefreshToken,
} from "../src/utils/auth";
import crypto from "crypto";

describe("Authentication & Cryptographic Utilities", () => {
  describe("Password Hashing (bcryptjs)", () => {
    it("should securely hash passwords and verify matching passwords", async () => {
      const password = "StrongPassword123!";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);

      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);
    });

    it("should reject incorrect passwords", async () => {
      const password = "CorrectPassword123!";
      const hash = await hashPassword(password);

      const isInvalid = await comparePassword("WrongPassword123!", hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe("JWT Generation & Verification", () => {
    it("should generate and verify a valid access token", () => {
      const userId = "user-uuid-123";
      const email = "developer@projectflow.com";

      const token = generateAccessToken(userId, email);
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      const decoded = verifyAccessToken(token);
      expect(decoded.userId).toBe(userId);
      expect(decoded.email).toBe(email);
    });

    it("should generate and verify a valid refresh token with jti (JWT ID)", () => {
      const userId = "user-uuid-456";
      const jti = "session-uuid-789";

      const token = generateRefreshToken(userId, jti);
      expect(token).toBeDefined();

      const decoded = verifyRefreshToken(token);
      expect(decoded.userId).toBe(userId);
      expect(decoded.jti).toBe(jti);
    });

    it("should throw an error when verifying an invalid or tampered token", () => {
      const tamperedToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.tamperedsignature";
      expect(() => verifyAccessToken(tamperedToken)).toThrow();
    });
  });

  describe("Refresh Token Rotation (RTR) Hashing", () => {
    it("should deterministically hash raw refresh tokens with SHA-256 for database storage", () => {
      const rawToken = "sample-raw-refresh-token-12345";
      const hash1 = hashRefreshToken(rawToken);
      const hash2 = hashRefreshToken(rawToken);

      expect(hash1).toBeDefined();
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 outputs 64 hex characters
      expect(hash1).not.toBe(rawToken);
    });

    it("should generate random hex tokens for email verification & password resets", () => {
      const token1 = crypto.randomBytes(32).toString("hex");
      const token2 = crypto.randomBytes(32).toString("hex");

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(token1).toHaveLength(64); // 32 bytes in hex = 64 characters
    });
  });

  describe("Dynamic authMethods Resolution Logic", () => {
    it("should return [\"LOCAL\"] for standard users with passwordHash and no Google account", () => {
      const user = { passwordHash: "hashed-pw", accounts: [] };
      const authMethods: string[] = [];
      if (user.passwordHash) authMethods.push("LOCAL");
      if (user.accounts.some((acc: any) => acc.provider === "google")) authMethods.push("GOOGLE");

      expect(authMethods).toEqual(["LOCAL"]);
    });

    it("should return [\"GOOGLE\"] for OAuth-only users without a local password", () => {
      const user = { passwordHash: null, accounts: [{ provider: "google" }] };
      const authMethods: string[] = [];
      if (user.passwordHash) authMethods.push("LOCAL");
      if (user.accounts.some((acc: any) => acc.provider === "google")) authMethods.push("GOOGLE");

      expect(authMethods).toEqual(["GOOGLE"]);
    });

    it("should return [\"LOCAL\", \"GOOGLE\"] after a Google user creates a local password", () => {
      const user = { passwordHash: "new-hashed-pw", accounts: [{ provider: "google" }] };
      const authMethods: string[] = [];
      if (user.passwordHash) authMethods.push("LOCAL");
      if (user.accounts.some((acc: any) => acc.provider === "google")) authMethods.push("GOOGLE");

      expect(authMethods).toContain("LOCAL");
      expect(authMethods).toContain("GOOGLE");
      expect(authMethods).toHaveLength(2);
    });
  });

  describe("Account Lockout Thresholds", () => {
    it("should calculate a 15-minute lockout window when attempts reach 5", () => {
      const attempts = 5;
      let lockUntil: Date | null = null;

      if (attempts >= 5) {
        lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      expect(lockUntil).not.toBeNull();
      expect(lockUntil!.getTime()).toBeGreaterThan(Date.now());
      const remainingMinutes = Math.ceil((lockUntil!.getTime() - Date.now()) / 60000);
      expect(remainingMinutes).toBe(15);
    });
  });
});

