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

  it("lets the product noun override misleading beauty fragments and source categories", () => {
    expect(displayCategory({ title: "뷰티레스트 올로 클래식 킹오브킹 침대", category: "뷰티" })).toBe("홈/가구");
    expect(displayCategory({ title: "첵스초코 쿠키앤크림 시리얼 420g 4개", category: "뷰티" })).toBe("식품");
    expect(displayCategory({ title: "블랙크림 고글후드 바람막이", category: "뷰티" })).toBe("패션");
    expect(displayCategory({ title: "여성 린넨 가디건", category: "뷰티" })).toBe("패션");
  });

  it("keeps actual beauty products in the beauty category", () => {
    expect(displayCategory({ title: "마데카크림 시즌7 기획세트", category: "기타" })).toBe("뷰티");
    expect(displayCategory({ title: "수분 세럼과 로션 세트", category: "세일정보" })).toBe("뷰티");
    expect(displayCategory({ title: "약산성 두피 샴푸 300ml", category: "생활" })).toBe("뷰티");
    expect(displayCategory({ title: "퍼퓸 바디 미스트 250ml", category: "기타" })).toBe("뷰티");
    expect(displayCategory({ title: "노글루 속눈썹 6종", category: "잡화" })).toBe("뷰티");
  });

  it("keeps electric hair tools in appliances", () => {
    expect(displayCategory({ title: "파나소닉 헤어드라이어와 고데기 세트", category: "뷰티" })).toBe("가전");
  });

  it("avoids incidental noun collisions found in the live feed", () => {
    expect(displayCategory({ title: "오끼뜨 하말넘많 떡과사전 반팔티", category: "세일정보" })).toBe("패션");
    expect(displayCategory({ title: "도량 철가방요리사 임태훈 셰프 짜장면 짬뽕 택2", category: "먹거리" })).toBe("식품");
    expect(displayCategory({ title: "아스토니쉬 클리너 1+1+1", category: "기타국내" })).toBe("생활");
    expect(displayCategory({ title: "스투시 미공홈 준야 콜라보", category: "패션해외" })).toBe("패션");
    expect(displayCategory({ title: "얌 크림단팥빵 12입", category: "식품/건강" })).toBe("식품");
    expect(displayCategory({ title: "잘풀리는집 보습로션 미용티슈", category: "생활용품" })).toBe("생활");
    expect(displayCategory({ title: "Hamster 키링", category: "뷰티" })).toBe("패션");
  });

  it("does not expose a community source as a seller fallback", () => {
    expect(presentDeal(deal({ title: "현미밥 24개 16,400원" })).seller).toBeUndefined();
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

  it("removes empty punctuation left after extracting a trailing price", () => {
    expect(presentDeal(deal({ title: "[지마켓] 컬쳐랜드 5만원권 (46,500원) (무료)" })).title)
      .toBe("컬쳐랜드 5만원권");
    expect(presentDeal(deal({
      title: "[지마켓] 누룽제비 10,920원/투움바 파스타 10,300원(2만원 이상 카드 10% 추가할인) (10,920원)"
    })).title).toBe("누룽제비 /투움바 파스타");
  });
});
