import type { RawDeal } from "@/lib/deals/types";

export const COMMERCE_MIN_DISCOUNT_RATE = 0.4;

export function sellerDiscountRate(
  deal: Pick<RawDeal, "dealPrice" | "sellerReferencePrice">
): number | undefined {
  const price = deal.dealPrice?.amount;
  const referencePrice = deal.sellerReferencePrice?.amount;
  if (!price || !referencePrice || referencePrice <= price) return undefined;
  return (referencePrice - price) / referencePrice;
}

export function qualifiesCommerceDiscount(
  deal: Pick<RawDeal, "dealPrice" | "sellerReferencePrice">,
  minimumDiscountRate = COMMERCE_MIN_DISCOUNT_RATE
): boolean {
  const discountRate = sellerDiscountRate(deal);
  return discountRate !== undefined && discountRate + Number.EPSILON >= minimumDiscountRate;
}

export function filterCommerceDeals<T extends Pick<RawDeal, "dealPrice" | "sellerReferencePrice">>(
  deals: T[],
  minimumDiscountRate = COMMERCE_MIN_DISCOUNT_RATE
): T[] {
  return deals.filter((deal) => qualifiesCommerceDiscount(deal, minimumDiscountRate));
}
