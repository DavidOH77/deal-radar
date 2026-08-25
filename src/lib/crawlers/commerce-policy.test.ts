import { describe, expect, it } from "vitest";
import { filterCommerceDeals, qualifiesCommerceDiscount, sellerDiscountRate } from "./commerce-policy";

function candidate(price: number, referencePrice?: number) {
  return {
    dealPrice: { amount: price, currency: "KRW" as const },
    sellerReferencePrice: referencePrice
      ? { amount: referencePrice, currency: "KRW" as const }
      : undefined
  };
}

describe("commerce deal qualification", () => {
  it("accepts a marketplace item at exactly 40 percent off", () => {
    expect(sellerDiscountRate(candidate(60_000, 100_000))).toBeCloseTo(0.4);
    expect(qualifiesCommerceDiscount(candidate(60_000, 100_000))).toBe(true);
  });

  it("rejects weak discounts and prices without a seller reference", () => {
    expect(qualifiesCommerceDiscount(candidate(61_000, 100_000))).toBe(false);
    expect(qualifiesCommerceDiscount(candidate(10_900))).toBe(false);
  });

  it("filters a generic marketplace candidate list", () => {
    const deals = [candidate(50_000, 100_000), candidate(80_000, 100_000), candidate(10_000)];
    expect(filterCommerceDeals(deals)).toEqual([deals[0]]);
  });
});
