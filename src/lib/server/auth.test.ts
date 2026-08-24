import { describe, expect, it } from "vitest";
import { hasValidBearerToken } from "./auth";

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
