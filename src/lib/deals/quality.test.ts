import { describe, expect, it } from "vitest";
import type { Deal } from "./types";
import {
  dedupeDealsForDisplay,
  isLikelySameProduct,
  measureDealQuality,
  prioritizePricedFeatured,
  relatedDealsForDisplay
} from "./quality";

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

  it("groups noisy cross-source titles for the same product", () => {
    const community = deal("community", {
      source: "ppomppu",
      title: "[스토브](무료배포) 이쁜 게 죄냐? - 3D 병맛 무쌍 아케이드",
      reactions: { likes: 8 }
    });
    const aggregator = deal("aggregator", {
      source: "algumon",
      title: "[스토브] 이쁜 게 죄냐? - 3D 병맛 무쌍 아케이드",
      reactions: { likes: 2 }
    });

    expect(isLikelySameProduct(community, aggregator)).toBe(true);
    expect(dedupeDealsForDisplay([community, aggregator])).toEqual([community]);
  });

  it("keeps the strongest reaction metrics on the most complete representative", () => {
    const reacting = deal("reacting", {
      publishedAt: "2026-08-23T11:00:00.000Z",
      reactions: { likes: 18, comments: 3, views: 900 }
    });
    const complete = deal("complete", {
      source: "theqoo",
      publishedAt: "2026-08-23T10:00:00.000Z",
      reactions: { comments: 12, views: 500 },
      dealPrice: { amount: 10_000, currency: "KRW" },
      imageUrl: "https://example.com/product.jpg",
      productUrl: "https://example.com/product"
    });

    expect(dedupeDealsForDisplay([reacting, complete])[0]).toMatchObject({
      id: "complete",
      publishedAt: "2026-08-23T11:00:00.000Z",
      reactions: { likes: 18, comments: 12, views: 900 }
    });
  });

  it("keeps different capacities and model variants separate", () => {
    const small = deal("small", { title: "도브 바디워시 1L 2개" });
    const large = deal("large", { title: "도브 바디워시 1L 3개" });

    expect(isLikelySameProduct(small, large)).toBe(false);
    expect(dedupeDealsForDisplay([small, large])).toHaveLength(2);
  });

  it("does not hide a named bundle behind the base product", () => {
    const consoleOnly = deal("console", { title: "닌텐도 스위치 2" });
    const gameBundle = deal("bundle", { title: "닌텐도 스위치2 + 포코피아" });

    expect(isLikelySameProduct(consoleOnly, gameBundle)).toBe(false);
  });

  it("shows one current related deal per other source", () => {
    const now = new Date("2026-08-23T12:00:00.000Z").getTime();
    const current = deal("current", { source: "ppomppu", publishedAt: "2026-08-23T11:00:00.000Z" });
    const olderMirror = deal("older-mirror", {
      source: "algumon",
      publishedAt: "2026-08-23T10:00:00.000Z",
      reactions: { likes: 1 }
    });
    const strongerMirror = deal("stronger-mirror", {
      source: "algumon",
      publishedAt: "2026-08-23T11:30:00.000Z",
      reactions: { likes: 8 }
    });
    const community = deal("community", {
      source: "theqoo",
      publishedAt: "2026-08-23T11:20:00.000Z",
      reactions: { comments: 5 }
    });
    const sameSource = deal("same-source", { source: "ppomppu", publishedAt: "2026-08-23T11:40:00.000Z" });
    const stale = deal("stale", { source: "eomisae", publishedAt: "2026-08-20T11:00:00.000Z" });

    expect(relatedDealsForDisplay(current, [olderMirror, strongerMirror, community, sameSource, stale], now)
      .map((item) => item.id)).toEqual(["stronger-mirror", "community"]);
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
