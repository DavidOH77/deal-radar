import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Deal } from "@/lib/deals/types";
import { DealCard } from "./deal-card";

function deal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: "ppomppu_123",
    source: "ppomppu",
    sourceMode: "public_page",
    sourceDealId: "123",
    title: "[쿠팡] 테스트 생수 2L 12개 (9,900원/무료배송)",
    normalizedTitle: "테스트 생수 2l 12개",
    sourceUrl: "https://www.ppomppu.co.kr/123",
    productUrl: "https://www.coupang.com/vp/products/456",
    category: "식품",
    publishedAt: "2026-09-07T00:00:00.000Z",
    collectedAt: "2026-09-07T01:00:00.000Z",
    dealPrice: { amount: 9_900, currency: "KRW" },
    freeShipping: true,
    reactions: { likes: 12, comments: 3, views: 1_200 },
    canonicalKey: "key",
    baseline: { amount: 19_800, kind: "seller_reference", confidence: "low", sampleSize: 1, label: "판매처 표시가" },
    score: { total: 40, price: 20, reaction: 40, trust: 20, urgency: 50, tier: "WATCH", discountRate: 0.5 },
    outboundUrl: "/go/ppomppu_123",
    ...overrides
  };
}

describe("DealCard", () => {
  it("keeps the community source private while showing the seller and outbound row link", () => {
    const markup = renderToStaticMarkup(
      <DealCard deal={deal()} referenceTime="2026-09-07T02:00:00.000Z" rank={1} />
    );

    expect(markup).toContain("쿠팡");
    expect(markup).not.toContain("뽐뿌");
    expect(markup).toContain('href="/go/ppomppu_123"');
    expect(markup).toContain("추천 12");
  });

  it("does not display a discount derived from low-confidence seller reference data", () => {
    const markup = renderToStaticMarkup(
      <DealCard deal={deal()} referenceTime="2026-09-07T02:00:00.000Z" rank={2} />
    );

    expect(markup).not.toContain("-50%");
  });
});
