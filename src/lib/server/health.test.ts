import { afterEach, describe, expect, it } from "vitest";
import { SOURCE_IDS, type CrawlStore, type Deal } from "@/lib/deals/types";
import { backendHealth } from "./health";

const originalVercel = process.env.VERCEL;

afterEach(() => {
  if (originalVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = originalVercel;
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
    const now = Date.parse("2026-08-24T00:00:00.000Z");
    const health = backendHealth(store("2026-08-23T23:30:00.000Z"), now);

    expect(health.ok).toBe(false);
    expect(health.status).toBe("storage_misconfigured");
  });
});
