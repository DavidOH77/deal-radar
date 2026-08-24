import { presentDeal } from "./presentation";
import type { Deal } from "./types";

export function dealSlug(deal: Deal): string {
  const slug = presentDeal(deal).title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return slug || "deal";
}

export function dealDetailPath(deal: Deal): string {
  return `/deals/${encodeURIComponent(deal.id)}/${dealSlug(deal)}`;
}
