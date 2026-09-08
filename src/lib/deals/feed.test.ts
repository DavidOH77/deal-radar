import { describe, expect, it } from "vitest";
import { compareRecommendations, selectFeedDeals } from "./feed";
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
    expiresAt?: string;
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
    expiresAt: options.expiresAt,
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

  it("deduplicates cross-source promo variants of the same product", () => {
    const community = makeDeal("community", NOW - 60_000, {
      title: "[네이버]메가MGC커피 (ICE)아메리카노 (1,550원/무료)",
      likes: 4,
      price: 1_550
    });
    const aggregator = makeDeal("aggregator", NOW - 120_000, {
      title: "(event) 메가MGC커피 (ICE)아메리카노 1,550원",
      likes: 33,
      price: 1_550
    });
    aggregator.source = "eomisae";

    const selected = selectFeedDeals([community, aggregator], { now: NOW });

    expect(selected).toHaveLength(1);
    expect(selected[0].id).toBe("aggregator");
  });

  it("excludes expired and explicitly ended deals from the public feed", () => {
    const active = makeDeal("active", NOW - 60_000, { title: "판매 중인 상품" });
    const soldOut = makeDeal("sold-out", NOW - 60_000, { title: "XXX품절!! 판매 종료 상품" });
    const expired = makeDeal("expired", NOW - 60_000, {
      expiresAt: new Date(NOW - 1).toISOString()
    });
    const restocked = makeDeal("restocked", NOW - 60_000, { title: "품절풀림 재입고 상품" });

    expect(selectFeedDeals([active, soldOut, expired, restocked], { now: NOW }).map((deal) => deal.id))
      .toEqual(["active", "restocked"]);
  });

  it("ranks one recommendation above extreme views and comments", () => {
    const recommended = makeDeal("recommended", NOW - 47 * 60 * 60 * 1_000, { likes: 1 });
    const passive = makeDeal("passive", NOW, { views: 10_000_000, comments: 100_000 });

    expect(selectFeedDeals([passive, recommended], { now: NOW, limit: 1 })[0].id)
      .toBe("recommended");
  });

  it("excludes daily point-link posts without hiding discounted point products", () => {
    const dailyLink = makeDeal("daily-link", NOW, { title: "9/8 네이버포인트", likes: 84 });
    const discountedProduct = makeDeal("discounted-product", NOW - 60_000, {
      title: "[네이버] 네이버페이 포인트 5만원권 10% 할인",
      likes: 2,
      price: 45_000
    });

    expect(selectFeedDeals([dailyLink, discountedProduct], { now: NOW }).map((deal) => deal.id))
      .toEqual(["discounted-product"]);
  });
});

describe("compareRecommendations", () => {
  it("sorts only by recommendation count before tie breakers", () => {
    const moreRecommended = makeDeal("more-recommended", NOW - 2 * 60 * 60 * 1_000, {
      likes: 10
    });
    const moreViewed = makeDeal("more-viewed", NOW - 60 * 60 * 1_000, {
      likes: 9,
      comments: 500,
      views: 100_000
    });

    expect([moreViewed, moreRecommended].sort(compareRecommendations).map((deal) => deal.id))
      .toEqual(["more-recommended", "more-viewed"]);
  });

  it("uses recency when recommendation counts are equal", () => {
    const older = makeDeal("older", NOW - 2 * 60 * 60 * 1_000, { likes: 10 });
    const newer = makeDeal("newer", NOW - 60 * 60 * 1_000, { likes: 10 });

    expect([older, newer].sort(compareRecommendations).map((deal) => deal.id))
      .toEqual(["newer", "older"]);
  });
});
