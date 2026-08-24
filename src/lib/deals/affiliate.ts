import type { Deal, SourceId } from "./types";

interface AffiliateConfig {
  id?: string;
  template?: string;
}

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^\[?::1\]?$/
];

export function isSafeOutboundUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    if (url.username || url.password) return false;
    return !PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(url.hostname));
  } catch {
    return false;
  }
}

function configFor(source: SourceId): AffiliateConfig {
  if (source === "elevenst") {
    return { id: process.env.AFFILIATE_11ST_ID, template: process.env.AFFILIATE_11ST_TEMPLATE };
  }
  if (source === "gmarket") {
    return { id: process.env.AFFILIATE_GMARKET_ID, template: process.env.AFFILIATE_GMARKET_TEMPLATE };
  }
  if (source === "naver") {
    return { id: process.env.AFFILIATE_NAVER_ID, template: process.env.AFFILIATE_NAVER_TEMPLATE };
  }
  if (source === "ssg") {
    return { id: process.env.AFFILIATE_SSG_ID, template: process.env.AFFILIATE_SSG_TEMPLATE };
  }
  return {};
}

export function buildAffiliateUrl(deal: Pick<Deal, "source" | "sourceUrl" | "productUrl" | "affiliateUrl">): {
  url: string;
  affiliate: boolean;
} {
  if (deal.affiliateUrl && isSafeOutboundUrl(deal.affiliateUrl)) {
    return { url: deal.affiliateUrl, affiliate: true };
  }

  const destination = deal.productUrl ?? deal.sourceUrl;
  if (!isSafeOutboundUrl(destination)) return { url: deal.sourceUrl, affiliate: false };
  const config = configFor(deal.source);
  if (!config.template || !config.id) return { url: destination, affiliate: false };

  const url = config.template
    .replaceAll("{url}", encodeURIComponent(destination))
    .replaceAll("{id}", encodeURIComponent(config.id));
  return isSafeOutboundUrl(url)
    ? { url, affiliate: true }
    : { url: destination, affiliate: false };
}
