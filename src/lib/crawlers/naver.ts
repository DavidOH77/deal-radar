import * as cheerio from "cheerio";
import type { RawDeal, SourceConnector } from "@/lib/deals/types";
import { fetchWithPolicy, numberValue } from "./http";
import { errorMessage, sourceResult } from "./result";
import { parseApprovedFeed, type ApprovedFeedItem } from "./approved-feed";
import { COMMERCE_MIN_DISCOUNT_RATE, filterCommerceDeals } from "./commerce-policy";

const API_URL = "https://openapi.naver.com/v1/search/shop.json";

interface NaverShoppingItem {
  title?: string;
  link?: string;
  image?: string;
  lprice?: string;
  mallName?: string;
  productId?: string;
  category1?: string;
  category2?: string;
}

function shoppingQueries(): string[] {
  return (process.env.NAVER_SHOPPING_QUERIES ?? process.env.CRAWL_KEYWORDS ?? "생수,휴지,커피,SSD,모니터,운동화,선크림,로션,마스크팩,향수")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function parseNaverShopping(
  payload: { items?: NaverShoppingItem[] },
  collectedAt = new Date().toISOString()
): RawDeal[] {
  return (payload.items ?? []).flatMap((item) => {
    const sourceDealId = String(item.productId ?? "");
    const title = cheerio.load(item.title ?? "").text().replace(/\s+/g, " ").trim();
    const price = numberValue(item.lprice);
    if (!sourceDealId || !title || !item.link || !price) return [];

    return [{
      source: "naver" as const,
      sourceMode: "official_api" as const,
      sourceDealId,
      title,
      sourceUrl: item.link,
      productUrl: item.link,
      imageUrl: item.image,
      category: [item.category1, item.category2].filter(Boolean).join(" · ") || item.mallName,
      publishedAt: collectedAt,
      dealPrice: { amount: price, currency: "KRW" as const },
      reactions: {},
      collectedAt
    }];
  });
}

export const naverConnector: SourceConnector = {
  id: "naver",
  mode: "official_api",
  async collect() {
    const startedAt = new Date().toISOString();
    const promotionFeedUrl = process.env.NAVER_PROMOTION_FEED_URL;
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    if (!promotionFeedUrl && (!clientId || !clientSecret)) {
      return sourceResult({
        source: this.id,
        mode: this.mode,
        status: "needs_credentials",
        startedAt,
        message: "네이버 프로모션 승인 피드 또는 쇼핑 검색 API 인증값이 필요합니다. 검색 API 최저가는 할인 기준가로 쓰지 않습니다."
      });
    }

    try {
      if (promotionFeedUrl) {
        const response = await fetchWithPolicy(promotionFeedUrl, {
          headers: process.env.NAVER_PROMOTION_FEED_TOKEN
            ? { authorization: `Bearer ${process.env.NAVER_PROMOTION_FEED_TOKEN}` }
            : undefined
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const deals = parseApprovedFeed(
          "naver",
          (await response.json()) as ApprovedFeedItem[] | { items?: ApprovedFeedItem[] },
          undefined,
          { minimumDiscountRate: COMMERCE_MIN_DISCOUNT_RATE }
        );
        return sourceResult({
          source: this.id,
          mode: "approved_feed",
          status: "success",
          startedAt,
          deals,
          message: `승인된 프로모션 피드에서 특가 편성 또는 40% 이상 ${deals.length}건 수집`
        });
      }
      if (!clientId || !clientSecret) throw new Error("네이버 쇼핑 API 인증값이 없습니다.");

      const results = await Promise.all(shoppingQueries().map(async (query) => {
        const url = new URL(API_URL);
        url.searchParams.set("query", query);
        url.searchParams.set("display", "20");
        url.searchParams.set("sort", "sim");
        url.searchParams.set("exclude", "used:rental");
        const response = await fetchWithPolicy(url.toString(), {
          headers: {
            "X-Naver-Client-Id": clientId,
            "X-Naver-Client-Secret": clientSecret
          }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return parseNaverShopping((await response.json()) as { items?: NaverShoppingItem[] });
      }));
      const candidates = [...new Map(results.flat().map((deal) => [deal.sourceDealId, deal])).values()];
      const deals = filterCommerceDeals(candidates);
      return sourceResult({
        source: this.id,
        mode: this.mode,
        status: "success",
        startedAt,
        deals,
        message: `공식 쇼핑 검색 ${candidates.length}건 확인, 정상가 근거를 갖춘 40% 이상 상품 ${deals.length}건 공개`
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
