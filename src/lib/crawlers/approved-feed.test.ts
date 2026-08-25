import { describe, expect, it } from "vitest";
import { parseApprovedFeed } from "./approved-feed";
import { COMMERCE_MIN_DISCOUNT_RATE } from "./commerce-policy";

const collectedAt = "2026-08-25T03:00:00.000Z";

describe("approved commerce feeds", () => {
  it("keeps only reliable 40 percent marketplace discounts", () => {
    const deals = parseApprovedFeed("ssg", { items: [
      { id: "40", title: "40% 할인 상품", url: "https://www.ssg.com/item/40", price: 60_000, originalPrice: 100_000 },
      { id: "20", title: "20% 할인 상품", url: "https://www.ssg.com/item/20", price: 80_000, originalPrice: 100_000 },
      { id: "none", title: "정상가 없는 상품", url: "https://www.ssg.com/item/none", price: 10_000 }
    ] }, collectedAt, { minimumDiscountRate: COMMERCE_MIN_DISCOUNT_RATE });

    expect(deals.map((deal) => deal.sourceDealId)).toEqual(["40"]);
  });

  it("accepts an explicitly curated marketplace hot-deal item", () => {
    const [deal] = parseApprovedFeed("auction", [{
      id: "allkill",
      title: "올킬 편성 상품",
      url: "https://itempage3.auction.co.kr/DetailView.aspx?itemno=allkill",
      price: 79_000,
      originalPrice: 100_000,
      curatedHotdeal: true
    }], collectedAt, { minimumDiscountRate: COMMERCE_MIN_DISCOUNT_RATE });

    expect(deal.sourceDealId).toBe("allkill");
  });

  it("treats an approved Olive Young Oteuk feed as a curated section", () => {
    const [deal] = parseApprovedFeed("oliveyoung", [{
      id: "beauty-1",
      title: "마데카소사이드 흔적 리페어 세럼",
      url: "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=beauty-1",
      price: 19_900,
      originalPrice: 36_900
    }], collectedAt, {
      minimumDiscountRate: COMMERCE_MIN_DISCOUNT_RATE,
      curatedByDefault: true,
      defaultCategory: "뷰티"
    });

    expect(deal).toMatchObject({ source: "oliveyoung", category: "뷰티" });
  });
});
