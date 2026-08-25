import { describe, expect, it } from "vitest";
import type { CrawlStore, Deal, RawDeal } from "@/lib/deals/types";
import { clickCount, crawlRunStatus, isCrawlLeaseActive, isDisplayableDeal, mergeRawDeal } from "./file-store";

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

  it("marks a run failed when every source is unavailable", () => {
    expect(crawlRunStatus([{ status: "error" }, { status: "needs_credentials" }])).toBe("failed");
    expect(crawlRunStatus([{ status: "error" }, { status: "success" }])).toBe("completed");
  });

  it("hides explicitly ended deals and expired deals", () => {
    const now = Date.parse("2026-08-23T02:00:00.000Z");
    expect(isDisplayableDeal({ ...raw, title: "❌️라이브 끝❌️ 한우 특가" }, now)).toBe(false);
    expect(isDisplayableDeal({ ...raw, title: "네이버 푸드페스타 선착순 ❌️소진❌️" }, now)).toBe(false);
    expect(isDisplayableDeal({ ...raw, title: "Re: 페이코도됨" }, now)).toBe(false);
    expect(isDisplayableDeal({ ...raw, expiresAt: "2026-08-23T01:59:59.000Z" }, now)).toBe(false);
    expect(isDisplayableDeal({ ...raw, title: "품절풀림 베트남 그린망고 1,490원" }, now)).toBe(true);
    expect(isDisplayableDeal(raw, now)).toBe(true);
  });
});
