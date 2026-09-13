import { describe, it, expect, beforeEach } from "vitest";
import apiClient from "../src/api/apiClient";

describe("Axios API Client & Interceptors", () => {
  beforeEach(() => {
    // Clear cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  });

  it("should attach X-CSRF-Token header when csrf-token cookie is present", async () => {
    document.cookie = "csrf-token=secure-client-csrf-token; path=/";

    // Trigger request interceptor
    const requestHandler = apiClient.interceptors.request.handlers[0].fulfilled;
    const config = await requestHandler({ headers: {} });

    expect(config.headers["X-CSRF-Token"]).toBe("secure-client-csrf-token");
  });

  it("should not crash or attach header if csrf-token cookie is absent", async () => {
    const requestHandler = apiClient.interceptors.request.handlers[0].fulfilled;
    const config = await requestHandler({ headers: {} });

    expect(config.headers["X-CSRF-Token"]).toBeUndefined();
  });
});

