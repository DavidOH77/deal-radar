import { describe, expect, it } from "vitest";
import { selectFeedDeals } from "./feed";
import type { Deal } from "./types";

const NOW = new Date("2026-08-28T00:00:00.000Z").getTime();

function makeDeal(
  id: string,
  publishedAt: number,
  options: {
    title?: string;
    likes?: number;
    comments?: number;
    views?: number;
    price?: number;
    productUrl?: string;
  } = {}
): Deal {
  const title = options.title ?? `상품 ${id}`;
  return {
    id,
    source: "ppomppu",
    sourceMode: "public_page",
    sourceDealId: id,
    title,
    normalizedTitle: title.toLowerCase(),
    sourceUrl: `https://example.com/deals/${id}`,
    productUrl: options.productUrl,
    category: "기타",
    publishedAt: new Date(publishedAt).toISOString(),
    dealPrice: options.price ? { amount: options.price, currency: "KRW" } : undefined,
    reactions: {
      likes: options.likes,
      comments: options.comments,
      views: options.views
    },
    collectedAt: new Date(NOW).toISOString(),
    canonicalKey: id,
    baseline: { kind: "unknown", confidence: "unknown", sampleSize: 0, label: "기준가 수집 중" },
    score: { total: 20, price: 0, reaction: 20, trust: 20, urgency: 20, tier: "WATCH" },
    outboundUrl: `/go/${id}`
  };
}

describe("selectFeedDeals", () => {
  it("bounds the feed while retaining both newest and strongly reacting deals", () => {
    const deals = Array.from({ length: 80 }, (_, index) => makeDeal(
      `deal-${index}`,
      NOW - index * 30 * 60 * 1_000,
      index === 70 ? { likes: 800 } : { comments: index % 5 }
    ));
    deals.push(makeDeal("stale-hit", NOW - 49 * 60 * 60 * 1_000, { likes: 10_000 }));
    deals.push(makeDeal("future", NOW + 16 * 60 * 1_000, { likes: 10_000 }));

    const selected = selectFeedDeals(deals, { now: NOW, windowHours: 48, limit: 20 });

    expect(selected).toHaveLength(20);
    expect(selected.map((deal) => deal.id)).toContain("deal-0");
    expect(selected.map((deal) => deal.id)).toContain("deal-70");
    expect(selected.map((deal) => deal.id)).not.toContain("stale-hit");
    expect(selected.map((deal) => deal.id)).not.toContain("future");
  });

  it("deduplicates exact product titles and keeps the more complete deal", () => {
    const sparse = makeDeal("sparse", NOW - 60_000, { title: "동일 상품" });
    const complete = makeDeal("complete", NOW - 120_000, {
      title: "동일 상품",
      price: 9_900,
      productUrl: "https://example.com/products/complete"
    });

    const selected = selectFeedDeals([sparse, complete], { now: NOW });

    expect(selected).toHaveLength(1);
    expect(selected[0].id).toBe("complete");
  });
});
