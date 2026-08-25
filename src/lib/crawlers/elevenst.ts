import * as cheerio from "cheerio";
import type { RawDeal, SourceConnector } from "@/lib/deals/types";
import { absoluteUrl, fetchWithPolicy, numberValue } from "./http";
import { errorMessage, sourceResult } from "./result";
import { filterCommerceDeals } from "./commerce-policy";

const API_URL = "https://openapi.11st.co.kr/openapi/OpenApiService.tmall";

function keywords(): string[] {
  return (process.env.ELEVENST_QUERIES ?? process.env.CRAWL_KEYWORDS ?? "생수,휴지,커피,SSD,모니터,운동화,선크림,로션,마스크팩,향수")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function parseElevenstXml(xml: string, collectedAt = new Date().toISOString()): RawDeal[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const deals: RawDeal[] = [];

  $("Product").each((_, element) => {
    const product = $(element);
    const sourceDealId = product.find("ProductCode").first().text().trim();
    const title = product.find("ProductName").first().text().trim();
    const productUrl = product.find("DetailPageUrl").first().text().trim();
    const salePrice = numberValue(product.find("SalePrice").first().text());
    const referencePrice = numberValue(product.find("ProductPrice").first().text());
    if (!sourceDealId || !title || !productUrl || !salePrice) return;

    deals.push({
      source: "elevenst",
      sourceMode: "official_api",
      sourceDealId,
      title,
      sourceUrl: productUrl,
      productUrl,
      imageUrl: absoluteUrl(product.find("BasicImage").first().text().trim(), API_URL),
      category: product.find("CategoryName").last().text().trim() || undefined,
      publishedAt: collectedAt,
      dealPrice: { amount: salePrice, currency: "KRW" },
      sellerReferencePrice: referencePrice && referencePrice > salePrice
        ? { amount: referencePrice, currency: "KRW" }
        : undefined,
      reactions: {},
      collectedAt
    });
  });

  return deals;
}

export const elevenstConnector: SourceConnector = {
  id: "elevenst",
  mode: "official_api",
  async collect() {
    const startedAt = new Date().toISOString();
    const apiKey = process.env.ELEVENST_API_KEY;
    if (!apiKey) {
      return sourceResult({
        source: this.id,
        mode: this.mode,
        status: "needs_credentials",
        startedAt,
        message: "ELEVENST_API_KEY가 필요합니다. 공개 쇼킹딜 페이지는 robots.txt상 수집하지 않습니다."
      });
    }

    try {
      const results = await Promise.all(
        keywords().map(async (keyword) => {
          const url = new URL(API_URL);
          url.searchParams.set("key", apiKey);
          url.searchParams.set("apiCode", "ProductSearch");
          url.searchParams.set("keyword", keyword);
          url.searchParams.set("pageNum", "1");
          url.searchParams.set("pageSize", "10");
          const response = await fetchWithPolicy(url.toString());
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return parseElevenstXml(await response.text());
        })
      );
      const candidates = [...new Map(results.flat().map((deal) => [deal.sourceDealId, deal])).values()];
      const deals = filterCommerceDeals(candidates);
      return sourceResult({
        source: this.id,
        mode: this.mode,
        status: "success",
        startedAt,
        deals,
        message: `공식 상품 검색 ${candidates.length}건 중 정상가 대비 40% 이상 ${deals.length}건 수집`
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
