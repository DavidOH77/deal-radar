import { afterEach, describe, expect, it } from "vitest";
import { SOURCE_IDS, type CrawlStore, type Deal } from "@/lib/deals/types";
import { backendHealth } from "./health";

const originalVercel = process.env.VERCEL;
const storageKeys = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  "BLOB_READ_WRITE_TOKEN",
  "BLOB_STORE_ID"
] as const;
const originalStorage = Object.fromEntries(storageKeys.map((key) => [key, process.env[key]]));

afterEach(() => {
  if (originalVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = originalVercel;
  for (const key of storageKeys) {
    const value = originalStorage[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function store(finishedAt: string): CrawlStore {
  return {
    deals: [{ dealPrice: { amount: 10_000 }, trend: { rising: true } } as Deal],
    priceSnapshots: [],
    clicks: [],
    clickAggregates: [],
    runs: [{
      id: "crawl_1",
      startedAt: finishedAt,
      finishedAt,
      totalCollected: 1,
      status: "completed",
      sources: SOURCE_IDS.map((source) => ({
        source,
        mode: "public_page",
        status: "success",
        count: 1,
        startedAt: finishedAt,
        finishedAt,
        message: "ok"
      }))
    }]
  };
}

describe("backendHealth", () => {
  it("reports a recent local crawl as ready", () => {
    delete process.env.VERCEL;
    const now = Date.parse("2026-08-24T00:00:00.000Z");
    const health = backendHealth(store("2026-08-23T23:30:00.000Z"), now);

    expect(health).toMatchObject({
      ok: true,
      status: "ready",
      storage: { backend: "local_file", ready: true },
      crawl: { ageMinutes: 30, stale: false },
      data: { deals: 1, pricedDeals: 1, risingDeals: 1 }
    });
  });

  it("fails health when a production store is not configured", () => {
    process.env.VERCEL = "1";
    for (const key of storageKeys) delete process.env[key];
    const now = Date.parse("2026-08-24T00:00:00.000Z");
    const health = backendHealth(store("2026-08-23T23:30:00.000Z"), now);

    expect(health.ok).toBe(false);
    expect(health.status).toBe("storage_misconfigured");
  });

  it("uses Redis when Vercel KV credentials are configured", () => {
    process.env.VERCEL = "1";
    process.env.KV_REST_API_URL = "https://redis.example.com";
    process.env.KV_REST_API_TOKEN = "token";
    const now = Date.parse("2026-08-24T00:00:00.000Z");

    expect(backendHealth(store("2026-08-23T23:30:00.000Z"), now)).toMatchObject({
      ok: true,
      storage: { backend: "upstash_redis", ready: true }
    });
  });
});
