import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CrawlStore, Deal } from "@/lib/deals/types";

const mocks = vi.hoisted(() => ({
  readStore: vi.fn(),
  runCrawl: vi.fn(),
  selectFeedDeals: vi.fn(),
  canViewAdminData: vi.fn(() => false),
  requestId: vi.fn(() => "request_test")
}));

vi.mock("@/lib/crawlers/health", () => ({ latestSourceHealth: () => [] }));
vi.mock("@/lib/crawlers/run", () => ({
  CrawlAlreadyRunningError: class CrawlAlreadyRunningError extends Error {},
  requestId: mocks.requestId,
  runCrawl: mocks.runCrawl
}));
vi.mock("@/lib/crawlers/schedule", () => ({
  isCrawlDue: () => false,
  isRequestCrawlEnabled: () => false,
  latestCompletedFullRun: () => undefined
}));
vi.mock("@/lib/store/file-store", () => ({
  clickCount: () => 0,
  readStore: mocks.readStore
}));
vi.mock("@/lib/server/log", () => ({
  logEvent: vi.fn(),
  operationalError: () => ({ name: "Error" })
}));
vi.mock("@/lib/server/auth", () => ({ canViewAdminData: mocks.canViewAdminData }));
vi.mock("@/lib/deals/feed", () => ({ selectFeedDeals: mocks.selectFeedDeals }));

import { GET } from "./route";

function deal(id: string): Deal {
  return {
    id,
    canonicalKey: `${id}_key`,
    normalizedTitle: id,
    source: "eomisae",
    sourceMode: "public_page",
    sourceDealId: id,
    title: id,
    sourceUrl: `https://example.com/${id}`,
    publishedAt: "2026-08-29T00:00:00.000Z",
    collectedAt: "2026-08-29T01:00:00.000Z",
    reactions: {},
    baseline: { kind: "unknown", confidence: "unknown", sampleSize: 0, label: "수집 중" },
    score: { total: 0, price: 0, reaction: 0, trust: 0, urgency: 0, tier: "WATCH" },
    outboundUrl: `/go/${id}`
  };
}

const store: CrawlStore = {
  deals: [deal("eomisae_1"), deal("eomisae_2")],
  priceSnapshots: [],
  runs: [],
  clicks: [],
  clickAggregates: []
};

beforeEach(() => {
  mocks.readStore.mockReset();
  mocks.readStore.mockResolvedValue(store);
  mocks.runCrawl.mockReset();
  mocks.selectFeedDeals.mockReset();
  mocks.selectFeedDeals.mockImplementation((deals) => deals);
  mocks.canViewAdminData.mockReset();
  mocks.canViewAdminData.mockReturnValue(false);
});

describe("GET /api/deals", () => {
  it("does not expose admin telemetry in the public feed", async () => {
    const response = await GET(new Request("https://dealradar.example/api/deals"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("public");
    expect(body).not.toHaveProperty("sources");
    expect(body).not.toHaveProperty("clickCount");
    expect(mocks.selectFeedDeals).toHaveBeenCalledWith(store.deals, { now: expect.any(Number) });
  });

  it("keeps targeted archive reads private without exposing admin telemetry", async () => {
    const response = await GET(new Request(
      "https://dealradar.example/api/deals?scope=archive&id=eomisae_2"
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(body.deals.map((item: Deal) => item.id)).toEqual(["eomisae_2"]);
    expect(body).not.toHaveProperty("sources");
    expect(body).not.toHaveProperty("clickCount");
  });

  it("returns full telemetry only for an authorized archive request", async () => {
    const denied = await GET(new Request("https://dealradar.example/api/deals?scope=archive"));
    expect(denied.status).toBe(401);

    mocks.canViewAdminData.mockReturnValue(true);
    const allowed = await GET(new Request("https://dealradar.example/api/deals?scope=archive"));
    const body = await allowed.json();

    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("cache-control")).toBe("private, no-store");
    expect(body).toMatchObject({ sources: [], clickCount: 0 });
  });
});
