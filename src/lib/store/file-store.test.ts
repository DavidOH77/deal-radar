import { describe, expect, it } from "vitest";
import type { CrawlStore, Deal, RawDeal } from "@/lib/deals/types";
import { clickCount, isCrawlLeaseActive, mergeRawDeal } from "./file-store";

const raw: RawDeal = {
  source: "fmkorea",
  sourceMode: "public_page",
  sourceDealId: "123",
  title: "핫딜 9,900원",
  sourceUrl: "https://www.fmkorea.com/best/123",
  publishedAt: "2026-08-23T00:00:00.000Z",
  reactions: { likes: 12 },
  collectedAt: "2026-08-23T01:00:00.000Z"
};

describe("mergeRawDeal", () => {
  it("keeps previously collected optional metadata when a later list response omits it", () => {
    const previous = {
      ...raw,
      id: "fmkorea_123",
      canonicalKey: "key",
      normalizedTitle: "title",
      imageUrl: "https://image.fmkorea.com/product.jpg",
      productUrl: "https://seller.example/product",
      reactions: { views: 1000, likes: 10 },
      baseline: { kind: "unknown", confidence: "unknown", sampleSize: 0, label: "수집 중" },
      score: { total: 0, price: 0, reaction: 0, trust: 0, urgency: 0, tier: "WATCH" },
      outboundUrl: "/go/fmkorea_123"
    } satisfies Deal;

    expect(mergeRawDeal(previous, raw)).toMatchObject({
      imageUrl: "https://image.fmkorea.com/product.jpg",
      productUrl: "https://seller.example/product",
      reactions: { views: 1000, likes: 12 }
    });
  });

  it("counts compacted and legacy clicks during migration", () => {
    const store = {
      clicks: [{ dealId: "fmkorea_123", source: "fmkorea", clickedAt: raw.collectedAt, affiliate: false }],
      clickAggregates: [{
        key: "2026-08-23:fmkorea_123:affiliate",
        dealId: "fmkorea_123",
        source: "fmkorea",
        date: "2026-08-23",
        affiliate: true,
        count: 4,
        lastClickedAt: raw.collectedAt
      }]
    } satisfies Pick<CrawlStore, "clicks" | "clickAggregates">;

    expect(clickCount(store)).toBe(5);
  });

  it("treats an expired crawl lease as inactive", () => {
    expect(isCrawlLeaseActive({
      id: "crawl_1",
      startedAt: "2026-08-23T00:00:00.000Z",
      expiresAt: "2026-08-23T00:08:00.000Z",
      trigger: "cron"
    }, Date.parse("2026-08-23T00:09:00.000Z"))).toBe(false);
  });
});
