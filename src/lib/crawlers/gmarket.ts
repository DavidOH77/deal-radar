import type { RawDeal, SourceConnector } from "@/lib/deals/types";
import { fetchWithPolicy, numberValue } from "./http";
import { errorMessage, sourceResult } from "./result";

interface FeedItem {
  id?: string | number;
  title?: string;
  url?: string;
  affiliateUrl?: string;
  imageUrl?: string;
  category?: string;
  price?: number | string;
  originalPrice?: number | string;
  publishedAt?: string;
  expiresAt?: string;
}

export function parseGmarketFeed(
  payload: FeedItem[] | { items?: FeedItem[] },
  collectedAt = new Date().toISOString()
): RawDeal[] {
  const items = Array.isArray(payload) ? payload : payload.items ?? [];
  return items.flatMap((item) => {
    const sourceDealId = String(item.id ?? "");
    const title = item.title?.trim();
    const price = numberValue(String(item.price ?? ""));
    if (!sourceDealId || !title || !item.url || !price) return [];
    const originalPrice = numberValue(String(item.originalPrice ?? ""));
    return [{
      source: "gmarket" as const,
      sourceMode: "approved_feed" as const,
      sourceDealId,
      title,
      sourceUrl: item.url,
      productUrl: item.url,
      affiliateUrl: item.affiliateUrl,
      imageUrl: item.imageUrl,
      category: item.category,
      publishedAt: item.publishedAt ?? collectedAt,
      expiresAt: item.expiresAt,
      dealPrice: { amount: price, currency: "KRW" as const },
      sellerReferencePrice: originalPrice && originalPrice > price
        ? { amount: originalPrice, currency: "KRW" as const }
        : undefined,
      reactions: {},
      collectedAt
    }];
  });
}

export const gmarketConnector: SourceConnector = {
  id: "gmarket",
  mode: "approved_feed",
  async collect() {
    const startedAt = new Date().toISOString();
    const feedUrl = process.env.GMARKET_FEED_URL;
    if (!feedUrl) {
      return sourceResult({
        source: this.id,
        mode: this.mode,
        status: "needs_credentials",
        startedAt,
        message: "승인된 제휴 데이터 피드 URL이 필요합니다. 슈퍼딜 공개 페이지는 봇 확인으로 차단됩니다."
      });
    }

    try {
      const response = await fetchWithPolicy(feedUrl, {
        headers: process.env.GMARKET_FEED_TOKEN
          ? { authorization: `Bearer ${process.env.GMARKET_FEED_TOKEN}` }
          : undefined
      });
      if (response.status === 403 || response.status === 429) {
        return sourceResult({
          source: this.id,
          mode: this.mode,
          status: "blocked",
          startedAt,
          message: `피드 접근 차단: HTTP ${response.status}`
        });
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const deals = parseGmarketFeed((await response.json()) as FeedItem[] | { items?: FeedItem[] });
      return sourceResult({
        source: this.id,
        mode: this.mode,
        status: "success",
        startedAt,
        deals,
        message: `승인된 피드에서 ${deals.length}건 수집`
      });
    } catch (error) {
      return sourceResult({
        source: this.id,
        mode: this.mode,
        status: "error",
        startedAt,
        message: errorMessage(error)
      });
    }
  }
};
