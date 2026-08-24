import { describe, expect, it } from "vitest";
import { displayCategory, presentDeal } from "./presentation";
import type { Deal } from "./types";

function deal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: "ppomppu_1",
    canonicalKey: "key",
    normalizedTitle: "title",
    source: "ppomppu",
    sourceMode: "public_page",
    sourceDealId: "1",
    title: "[롯데온]가평잣막걸리맛 제로 750mlx5 무알콜(9,730원/무배)",
    sourceUrl: "https://example.com/source",
    publishedAt: "2026-08-23T00:00:00.000Z",
    reactions: {},
    collectedAt: "2026-08-23T00:00:00.000Z",
    baseline: { kind: "unknown", confidence: "unknown", sampleSize: 0, label: "기준가 수집 중" },
    score: { total: 0, price: 0, reaction: 0, trust: 0, urgency: 0, tier: "WATCH" },
    outboundUrl: "/go/ppomppu_1",
    ...overrides
  };
}

describe("deal presentation", () => {
  it("separates seller, product title, shipping, and category", () => {
    expect(presentDeal(deal())).toEqual({
      seller: "롯데온",
      title: "가평잣막걸리맛 제로 750ml 5개 무알콜",
      shippingLabel: "무료배송",
      category: "식품"
    });
  });

  it("uses product categories instead of community-specific categories", () => {
    expect(displayCategory({ title: "나이키 러닝화", category: "패션국내" })).toBe("패션");
    expect(displayCategory({ title: "욕실 세제", category: "기타국내" })).toBe("생활");
    expect(displayCategory({ title: "닌텐도 젤다의 전설", category: "네이버" })).toBe("게임/취미");
  });

  it("extracts a paid shipping amount from the trailing price block", () => {
    expect(presentDeal(deal({ title: "[네이버]반건조오징어 10미 (21,400원/3500원)" }))).toMatchObject({
      seller: "네이버",
      title: "반건조오징어 10미",
      shippingLabel: "배송 3,500원"
    });
  });

  it("normalizes multiplier quantities without duplicating Korean units", () => {
    expect(presentDeal(deal({ title: "현미밥 195gx24개" })).title).toBe("현미밥 195g 24개");
    expect(presentDeal(deal({ title: "탄산수 190mlx30캔" })).title).toBe("탄산수 190mlx30캔");
  });

  it("removes a trailing won price from the displayed product name", () => {
    expect(presentDeal(deal({ title: "뿌리는 락스세제 500ml 4개 9900원" })).title)
      .toBe("뿌리는 락스세제 500ml 4개");
  });

  it("removes price ranges and inline price tokens from the displayed title", () => {
    expect(presentDeal(deal({ title: "데이 니트 5,900~8,900원" })).title).toBe("데이 니트");
    expect(presentDeal(deal({ title: "사발면 6개 8980원 재입고 쿠팡" })).title).toBe("사발면 6개 재입고 쿠팡");
    expect(presentDeal(deal({ title: "트라이 드로즈 5장 7870원, 8400원 무배" })).title).toBe("트라이 드로즈 5장");
  });
});
