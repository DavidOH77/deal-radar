import { describe, expect, it } from "vitest";
import type { Deal } from "./types";
import { dedupeDealsForDisplay, measureDealQuality, prioritizePricedFeatured } from "./quality";

function deal(id: string, overrides: Partial<Deal> = {}): Deal {
  return {
    id,
    canonicalKey: id,
    normalizedTitle: "상품",
    source: "ppomppu",
    sourceMode: "public_page",
    sourceDealId: id,
    title: "[네이버] 같은 상품 (10,000원/무료배송)",
    sourceUrl: `https://example.com/${id}`,
    publishedAt: "2026-08-23T10:00:00.000Z",
    reactions: { views: 100 },
    collectedAt: "2026-08-23T10:00:00.000Z",
    baseline: { kind: "unknown", confidence: "unknown", sampleSize: 0, label: "수집 중" },
    score: { total: 0, price: 0, reaction: 0, trust: 0, urgency: 0, tier: "WATCH" },
    outboundUrl: `/go/${id}`,
    ...overrides
  };
}

describe("deal quality", () => {
  it("keeps one exact product and prefers the more complete record", () => {
    const sparse = deal("sparse");
    const complete = deal("complete", {
      source: "fmkorea",
      dealPrice: { amount: 10_000, currency: "KRW" },
      imageUrl: "https://example.com/product.jpg"
    });
    expect(dedupeDealsForDisplay([sparse, complete])).toEqual([complete]);
  });

  it("promotes a priced deal into the featured position", () => {
    const unpriced = deal("unpriced", { title: "가격 없는 상품" });
    const priced = deal("priced", { title: "가격 있는 상품", dealPrice: { amount: 20_000, currency: "KRW" } });
    expect(prioritizePricedFeatured([unpriced, priced])[0].id).toBe("priced");
  });

  it("measures launch-critical quality gaps", () => {
    const summary = measureDealQuality([
      deal("a"),
      deal("b", { dealPrice: { amount: 10_000, currency: "KRW" }, imageUrl: "https://example.com/a.jpg" })
    ]);
    expect(summary).toMatchObject({ total: 2, priced: 1, duplicateCount: 1, missingImage: 1, titlePriceResidue: 0 });
  });
});
