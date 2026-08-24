import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CrawlLease, CrawlRun } from "@/lib/deals/types";

const mocks = vi.hoisted(() => ({
  acquireCrawlLease: vi.fn(),
  releaseCrawlLease: vi.fn(),
  saveCrawlResults: vi.fn(),
  saveFailedCrawlRun: vi.fn(),
  collectSources: vi.fn()
}));

vi.mock("@/lib/store/file-store", () => ({
  acquireCrawlLease: mocks.acquireCrawlLease,
  releaseCrawlLease: mocks.releaseCrawlLease,
  saveCrawlResults: mocks.saveCrawlResults,
  saveFailedCrawlRun: mocks.saveFailedCrawlRun
}));

vi.mock("./index", () => ({ collectSources: mocks.collectSources }));

import { CrawlAlreadyRunningError, runCrawl } from "./run";

const existingLease: CrawlLease = {
  id: "crawl_existing",
  startedAt: "2026-08-24T00:00:00.000Z",
  expiresAt: "2026-08-24T00:08:00.000Z",
  trigger: "cron"
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runCrawl", () => {
  it("rejects a crawl when another instance owns the store lease", async () => {
    mocks.acquireCrawlLease.mockResolvedValue({ acquired: false, lease: existingLease });

    await expect(runCrawl(undefined, { trigger: "cron" }))
      .rejects.toBeInstanceOf(CrawlAlreadyRunningError);
    expect(mocks.collectSources).not.toHaveBeenCalled();
  });

  it("persists a completed run with its trigger and request id", async () => {
    mocks.acquireCrawlLease.mockImplementation(async (input) => ({
      acquired: true,
      lease: { ...existingLease, id: input.id }
    }));
    mocks.collectSources.mockResolvedValue([]);
    mocks.saveCrawlResults.mockImplementation(async (_results, startedAt, context) => ({
      id: context.id,
      startedAt,
      finishedAt: startedAt,
      sources: [],
      totalCollected: 0,
      status: "completed",
      trigger: context.trigger,
      requestId: context.requestId
    } satisfies CrawlRun));

    const run = await runCrawl(["ppomppu"], { trigger: "manual", requestId: "request_1" });

    expect(run).toMatchObject({ status: "completed", trigger: "manual", requestId: "request_1" });
    expect(mocks.collectSources).toHaveBeenCalledWith(["ppomppu"]);
  });
});
