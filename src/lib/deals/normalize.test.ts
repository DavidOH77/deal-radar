import { describe, expect, it } from "vitest";
import { isExplicitlyEndedTitle, parsePriceFromTitle } from "./normalize";

describe("parsePriceFromTitle", () => {
  it("parses community prices written immediately after parentheses", () => {
    expect(parsePriceFromTitle("[네이버] 생수 2L 12병 (10,900원/무료)")).toBe(10_900);
  });

  it("parses compact ten-thousand-won notation", () => {
    expect(parsePriceFromTitle("운동화 9.6만원")).toBe(96_000);
  });
});

describe("isExplicitlyEndedTitle", () => {
  it("detects decorated sold-out prefixes", () => {
    expect(isExplicitlyEndedTitle("XXX품절!! 베키아에누보 샌드위치 12개")).toBe(true);
    expect(isExplicitlyEndedTitle("[품절] 무선 이어폰")).toBe(true);
  });

  it("keeps restocked deals and promotions whose coupon alone ended", () => {
    expect(isExplicitlyEndedTitle("품절풀림 베트남 그린망고 1,490원")).toBe(false);
    expect(isExplicitlyEndedTitle("망고 라방 쿠폰마감 가격 동일 5,490원")).toBe(false);
  });
});
