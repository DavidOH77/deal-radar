import { describe, expect, it } from "vitest";
import {
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSessionToken,
  deriveAdminPasswordHash,
  hasValidBearerToken,
  verifyAdminCredentials,
  verifyAdminSessionToken
} from "./auth";

describe("hasValidBearerToken", () => {
  it("accepts only the complete configured bearer token", () => {
    const valid = new Request("https://example.com/api/cron", {
      headers: { authorization: "Bearer correct-secret" }
    });
    const invalid = new Request("https://example.com/api/cron", {
      headers: { authorization: "Bearer correct-secre" }
    });

    expect(hasValidBearerToken(valid, "correct-secret")).toBe(true);
    expect(hasValidBearerToken(invalid, "correct-secret")).toBe(false);
    expect(hasValidBearerToken(valid, undefined)).toBe(false);
  });
});

describe("admin authentication", () => {
  const config = {
    username: "admin-user",
    passwordSalt: "test-salt",
    passwordHash: deriveAdminPasswordHash("correct-password", "test-salt"),
    sessionSecret: "test-session-secret"
  };

  it("checks the configured username and password hash", () => {
    expect(verifyAdminCredentials("admin-user", "correct-password", config)).toBe(true);
    expect(verifyAdminCredentials("admin-user", "wrong-password", config)).toBe(false);
    expect(verifyAdminCredentials("wrong-user", "correct-password", config)).toBe(false);
  });

  it("accepts signed sessions until expiry and rejects tampering", () => {
    const now = Date.parse("2026-08-25T00:00:00.000Z");
    const token = createAdminSessionToken("admin-user", config, now);
    expect(verifyAdminSessionToken(token, config, now + 1_000)).toBe(true);
    expect(verifyAdminSessionToken(`${token}x`, config, now + 1_000)).toBe(false);
    expect(verifyAdminSessionToken(token, config, now + ADMIN_SESSION_TTL_SECONDS * 1_000)).toBe(false);
  });
});
