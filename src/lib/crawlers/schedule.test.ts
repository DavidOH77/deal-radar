import { afterEach, describe, expect, it } from "vitest";
import { SOURCE_IDS, type CrawlRun } from "@/lib/deals/types";
import { isCrawlDue, isFullCrawlRun, latestCompletedFullRun } from "./schedule";

const originalInterval = process.env.CRAWL_INTERVAL_MINUTES;

afterEach(() => {
  if (originalInterval === undefined) delete process.env.CRAWL_INTERVAL_MINUTES;
  else process.env.CRAWL_INTERVAL_MINUTES = originalInterval;
});

function run(id: string, finishedAt: string, sources = [...SOURCE_IDS]): CrawlRun {
  return {
    id,
    startedAt: finishedAt,
    finishedAt,
    totalCollected: 1,
    status: "completed",
    sources: sources.map((source) => ({
      source,
      mode: "public_page",
      status: "success",
      count: 1,
      startedAt: finishedAt,
      finishedAt,
      message: "ok"
    }))
  };
}

describe("crawl schedule", () => {
  it("becomes due one hour after the latest full crawl", () => {
    const latest = run("full", "2026-08-24T00:00:00.000Z");

    expect(isCrawlDue([latest], Date.parse("2026-08-24T00:59:59.000Z"))).toBe(false);
    expect(isCrawlDue([latest], Date.parse("2026-08-24T01:00:00.000Z"))).toBe(true);
  });

  it("does not let a partial manual crawl postpone the full crawl", () => {
    const partial = run("partial", "2026-08-24T00:50:00.000Z", ["ppomppu"]);
    const full = run("full", "2026-08-23T23:00:00.000Z");

    expect(isFullCrawlRun(partial)).toBe(false);
    expect(latestCompletedFullRun([partial, full])?.id).toBe("full");
    expect(isCrawlDue([partial, full], Date.parse("2026-08-24T00:30:00.000Z"))).toBe(true);
  });
});
