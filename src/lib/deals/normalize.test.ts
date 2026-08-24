import { describe, expect, it } from "vitest";
import { parsePriceFromTitle } from "./normalize";

describe("parsePriceFromTitle", () => {
  it("parses community prices written immediately after parentheses", () => {
    expect(parsePriceFromTitle("[네이버] 생수 2L 12병 (10,900원/무료)")).toBe(10_900);
  });

  it("parses compact ten-thousand-won notation", () => {
    expect(parsePriceFromTitle("운동화 9.6만원")).toBe(96_000);
  });
});
