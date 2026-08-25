import type { RawDeal, SourceConnector, SourceId } from "@/lib/deals/types";
import { fetchWithPolicy, numberValue } from "./http";
import { errorMessage, sourceResult } from "./result";
import { qualifiesCommerceDiscount } from "./commerce-policy";

export interface ApprovedFeedItem {
  id?: string | number;
  title?: string;
  url?: string;
  productUrl?: string;
  affiliateUrl?: string;
  imageUrl?: string;
  category?: string;
  price?: number | string;
  originalPrice?: number | string;
  curatedHotdeal?: boolean;
  publishedAt?: string;
  expiresAt?: string;
  reactions?: {
    likes?: number | string;
    comments?: number | string;
    views?: number | string;
    purchases?: number | string;
  };
}

export function parseApprovedFeed(
  source: SourceId,
  payload: ApprovedFeedItem[] | { items?: ApprovedFeedItem[] },
  collectedAt = new Date().toISOString(),
  policy: { minimumDiscountRate?: number; curatedByDefault?: boolean; defaultCategory?: string } = {}
): RawDeal[] {
  const items = Array.isArray(payload) ? payload : payload.items ?? [];
  return items.flatMap((item) => {
    const sourceDealId = String(item.id ?? "");
    const title = item.title?.replace(/\s+/g, " ").trim();
    const sourceUrl = item.url ?? item.productUrl;
    if (!sourceDealId || !title || !sourceUrl) return [];
    const price = numberValue(String(item.price ?? ""));
    const originalPrice = numberValue(String(item.originalPrice ?? ""));

    const deal: RawDeal = {
      source,
      sourceMode: "approved_feed" as const,
      sourceDealId,
      title,
      sourceUrl,
      productUrl: item.productUrl,
      affiliateUrl: item.affiliateUrl,
      imageUrl: item.imageUrl,
      category: item.category ?? policy.defaultCategory,
      publishedAt: item.publishedAt ?? collectedAt,
      expiresAt: item.expiresAt,
      dealPrice: price ? { amount: price, currency: "KRW" as const } : undefined,
      sellerReferencePrice: price && originalPrice && originalPrice > price
        ? { amount: originalPrice, currency: "KRW" as const }
        : undefined,
      reactions: {
        likes: numberValue(String(item.reactions?.likes ?? "")),
        comments: numberValue(String(item.reactions?.comments ?? "")),
        views: numberValue(String(item.reactions?.views ?? "")),
        purchases: numberValue(String(item.reactions?.purchases ?? ""))
      },
      collectedAt
    };
    if (
      policy.minimumDiscountRate !== undefined
      && !policy.curatedByDefault
      && !item.curatedHotdeal
      && !qualifiesCommerceDiscount(deal, policy.minimumDiscountRate)
    ) return [];
    return [deal];
  });
}

export function createApprovedFeedConnector(config: {
  id: SourceId;
  feedUrlEnv: string;
  feedTokenEnv: string;
  missingMessage: string;
  minimumDiscountRate?: number;
  curatedByDefault?: boolean;
  defaultCategory?: string;
}): SourceConnector {
  return {
    id: config.id,
    mode: "approved_feed",
    async collect() {
      const startedAt = new Date().toISOString();
      const feedUrl = process.env[config.feedUrlEnv];
      const token = process.env[config.feedTokenEnv];
      if (!feedUrl) {
        return sourceResult({
          source: config.id,
          mode: "approved_feed",
          status: "needs_credentials",
          startedAt,
          message: config.missingMessage
        });
      }

      try {
        const response = await fetchWithPolicy(feedUrl, {
          headers: token ? { authorization: `Bearer ${token}` } : undefined
        });
        if (response.status === 403 || response.status === 429) {
          return sourceResult({
            source: config.id,
            mode: "approved_feed",
            status: "blocked",
            startedAt,
            message: `승인 피드 접근 차단: HTTP ${response.status}`
          });
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const deals = parseApprovedFeed(
          config.id,
          (await response.json()) as ApprovedFeedItem[] | { items?: ApprovedFeedItem[] },
          undefined,
          {
            minimumDiscountRate: config.minimumDiscountRate,
            curatedByDefault: config.curatedByDefault,
            defaultCategory: config.defaultCategory
          }
        );
        return sourceResult({
          source: config.id,
          mode: "approved_feed",
          status: "success",
          startedAt,
          deals,
          message: `승인된 피드에서 ${deals.length}건 수집`
        });
      } catch (error) {
        return sourceResult({
          source: config.id,
          mode: "approved_feed",
          status: "error",
          startedAt,
          message: errorMessage(error)
        });
      }
    }
  };
}
