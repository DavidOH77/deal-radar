import { describe, expect, it } from "vitest";
import { isExplicitlyEndedTitle, isNonDealListingTitle, normalizeRawDeal, parsePriceFromTitle } from "./normalize";

describe("parsePriceFromTitle", () => {
  it("parses community prices written immediately after parentheses", () => {
    expect(parsePriceFromTitle("[네이버] 생수 2L 12병 (10,900원/무료)")).toBe(10_900);
  });

  it("parses compact ten-thousand-won notation", () => {
    expect(parsePriceFromTitle("운동화 9.6만원")).toBe(96_000);
  });

  it("prefers the trailing sale price over a gift-card denomination", () => {
    expect(parsePriceFromTitle("[지마켓] 컬쳐랜드 5만원권 (46,500원) (무료)")).toBe(46_500);
  });

  it("does not confuse shipping, conditional prices, or product specs with the sale price", () => {
    expect(parsePriceFromTitle("키보드형 계산기 (5,000원) (유료3,000원)")).toBe(5_000);
    expect(parsePriceFromTitle("백진미채 (14,900원(첫구매시 12,665원)/무료)")).toBe(14_900);
    expect(parsePriceFromTitle("400만화소 홈캠 (45,012원/무료)")).toBe(45_012);
    expect(parsePriceFromTitle("12,880원 (2 x 6,440원)")).toBe(12_880);
  });

  it("keeps an explicitly labelled discount price ahead of a trailing comparison price", () => {
    expect(parsePriceFromTitle("외장하드 할인가25.9만 (278,490원/무배)")).toBe(259_000);
  });

  it("repairs a previously inferred community price from the structured suffix", () => {
    const normalized = normalizeRawDeal({
      source: "fmkorea",
      sourceMode: "public_page",
      sourceDealId: "1",
      title: "[지마켓] 컬쳐랜드 5만원권 (46,500원) (무료)",
      sourceUrl: "https://example.com/deal",
      publishedAt: "2026-09-01T00:00:00.000Z",
      collectedAt: "2026-09-01T00:00:00.000Z",
      dealPrice: { amount: 50_000, currency: "KRW" },
      reactions: {}
    });

    expect(normalized.dealPrice?.amount).toBe(46_500);
  });
});

describe("isExplicitlyEndedTitle", () => {
  it("detects decorated sold-out prefixes", () => {
    expect(isExplicitlyEndedTitle("XXX품절!! 베키아에누보 샌드위치 12개")).toBe(true);
    expect(isExplicitlyEndedTitle("[품절] 무선 이어폰")).toBe(true);
  });

  it("detects a decorated standalone end marker", () => {
    expect(isExplicitlyEndedTitle("❌️끝❌️제니쿠키 640g / 2믹스")).toBe(true);
  });

  it("extracts prices prefixed by a won symbol", () => {
    expect(parsePriceFromTitle("청정원 파스타소스 600g 3개 + 면 500g / ￦7,060")).toBe(7_060);
  });

  it("keeps restocked deals and promotions whose coupon alone ended", () => {
    expect(isExplicitlyEndedTitle("품절풀림 베트남 그린망고 1,490원")).toBe(false);
    expect(isExplicitlyEndedTitle("망고 라방 쿠폰마감 가격 동일 5,490원")).toBe(false);
  });
});

describe("isNonDealListingTitle", () => {
  it("detects daily Naver point-link posts", () => {
    expect(isNonDealListingTitle("9/8 네이버포인트")).toBe(true);
    expect(isNonDealListingTitle("[9월 8일] 네이버페이 포인트 받기")).toBe(true);
  });

  it("keeps discounted point products", () => {
    expect(isNonDealListingTitle("[네이버] 네이버페이 포인트 5만원권 10% 할인")).toBe(false);
  });
});
