import * as cheerio from "cheerio";
import type { RawDeal, SourceConnector } from "@/lib/deals/types";
import { fetchWithPolicy, numberValue } from "./http";
import { errorMessage, sourceResult } from "./result";

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
  return (process.env.NAVER_SHOPPING_QUERIES ?? process.env.CRAWL_KEYWORDS ?? "생수,휴지,커피,SSD,모니터,운동화")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 8);
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
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return sourceResult({
        source: this.id,
        mode: this.mode,
        status: "needs_credentials",
        startedAt,
        message: "네이버 쇼핑 검색 API의 NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET이 필요합니다."
      });
    }

    try {
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
      const deals = [...new Map(results.flat().map((deal) => [deal.sourceDealId, deal])).values()];
      return sourceResult({
        source: this.id,
        mode: this.mode,
        status: "success",
        startedAt,
        deals,
        message: `공식 쇼핑 검색 API에서 ${deals.length}건 수집`
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
