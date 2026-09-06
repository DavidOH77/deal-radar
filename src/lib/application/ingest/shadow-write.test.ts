import { afterEach, describe, expect, it } from "vitest";
import type { RawDeal } from "@/lib/deals/types";
import { domainShadowWriteEnabled, shadowWriteSourceObservations } from "./shadow-write";

const original = {
  enabled: process.env.DEAL_DOMAIN_SHADOW_WRITE,
  databaseUrl: process.env.DATABASE_URL,
  postgresUrl: process.env.POSTGRES_URL
};

const deal = {
  source: "ppomppu",
  sourceMode: "public_page",
  sourceDealId: "1",
  title: "테스트 상품",
  sourceUrl: "https://example.com/1",
  publishedAt: "2026-09-07T00:00:00.000Z",
  collectedAt: "2026-09-07T01:00:00.000Z",
  reactions: {}
} satisfies RawDeal;

afterEach(() => {
  for (const [key, value] of Object.entries({
    DEAL_DOMAIN_SHADOW_WRITE: original.enabled,
    DATABASE_URL: original.databaseUrl,
    POSTGRES_URL: original.postgresUrl
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("domain observation shadow write", () => {
  it("is an explicit opt-in and performs no database import when disabled", async () => {
    delete process.env.DEAL_DOMAIN_SHADOW_WRITE;
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_URL;

    expect(domainShadowWriteEnabled()).toBe(false);
    await expect(shadowWriteSourceObservations([deal], "crawl-1")).resolves.toEqual({
      status: "disabled",
      attempted: 1,
      inserted: 0
    });
  });

  it("fails clearly before writing when enabled without a database", async () => {
    process.env.DEAL_DOMAIN_SHADOW_WRITE = "1";
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_URL;

    await expect(shadowWriteSourceObservations([deal], "crawl-1"))
      .rejects.toThrow("requires DATABASE_URL or POSTGRES_URL");
  });
});
