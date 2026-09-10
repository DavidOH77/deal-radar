import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Deal } from "@/lib/deals/types";

const mocks = vi.hoisted(() => ({
  findDeal: vi.fn()
}));

vi.mock("@/lib/store/file-store", () => ({ findDeal: mocks.findDeal }));

import { GET } from "./route";

function deal(sourceUrl: string): Deal {
  return {
    id: "ppomppu_123",
    canonicalKey: "key",
    normalizedTitle: "테스트 딜",
    source: "ppomppu",
    sourceMode: "public_page",
    sourceDealId: "123",
    title: "테스트 딜",
    sourceUrl,
    publishedAt: "2026-09-10T00:00:00.000Z",
    collectedAt: "2026-09-10T00:01:00.000Z",
    reactions: {},
    baseline: { kind: "unknown", confidence: "unknown", sampleSize: 0, label: "수집 중" },
    score: { total: 0, price: 0, reaction: 0, trust: 0, urgency: 0, tier: "WATCH" },
    outboundUrl: "/go/ppomppu_123"
  };
}

beforeEach(() => {
  mocks.findDeal.mockReset();
});

describe("GET /original/[id]", () => {
  it("redirects to the stored source post without affiliate transformation", async () => {
    const sourceUrl = "https://www.ppomppu.co.kr/zboard/view.php?id=ppomppu&no=123";
    mocks.findDeal.mockResolvedValue(deal(sourceUrl));

    const response = await GET(
      new Request("https://dealradar.example/original/ppomppu_123"),
      { params: Promise.resolve({ id: "ppomppu_123" }) }
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(sourceUrl);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("returns to the feed when the deal is missing or the source URL is unsafe", async () => {
    mocks.findDeal.mockResolvedValue(undefined);
    const missing = await GET(
      new Request("https://dealradar.example/original/missing"),
      { params: Promise.resolve({ id: "missing" }) }
    );

    mocks.findDeal.mockResolvedValue(deal("http://127.0.0.1/private"));
    const unsafe = await GET(
      new Request("https://dealradar.example/original/ppomppu_123"),
      { params: Promise.resolve({ id: "ppomppu_123" }) }
    );

    expect(missing.headers.get("location")).toBe("https://dealradar.example/");
    expect(unsafe.headers.get("location")).toBe("https://dealradar.example/");
  });
});
