import * as cheerio from "cheerio";
import type { RawDeal, SourceConnector } from "@/lib/deals/types";
import { createApprovedFeedConnector } from "./approved-feed";
import { fetchWithPolicy, numberValue } from "./http";
import { errorMessage, sourceResult } from "./result";

const NAVER_WEB_SEARCH_URL = "https://openapi.naver.com/v1/search/webkr.json";
const QUASARZONE_HOTDEAL_ORIGIN = "https://quasarzone.com";
const QUASARZONE_HOTDEAL_PATH = /^\/bbs\/qb_saleinfo\/views\/(\d+)\/?$/;

interface NaverWebSearchItem {
  title?: string;
  link?: string;
  description?: string;
}

interface NaverWebSearchPayload {
  items?: NaverWebSearchItem[];
}

function plainText(value?: string): string {
  return cheerio.load(value ?? "").text().replace(/\s+/g, " ").trim();
}

function quasarzonePostUrl(value?: string): { id: string; url: string } | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.hostname !== "quasarzone.com" && url.hostname !== "www.quasarzone.com") return undefined;
    const match = url.pathname.match(QUASARZONE_HOTDEAL_PATH);
    if (!match) return undefined;
    return {
      id: match[1],
      url: `${QUASARZONE_HOTDEAL_ORIGIN}/bbs/qb_saleinfo/views/${match[1]}`
    };
  } catch {
    return undefined;
  }
}

function parsePublishedAt(value: string): string | undefined {
  const match = value.match(/(20\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})\s+(\d{1,2}):(\d{2})/);
  if (!match) return undefined;
  const [, year, month, day, hour, minute] = match;
  const parsed = new Date(
    `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:00+09:00`
  );
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function cleanTitle(value: string): string {
  return value
    .replace(/\s*>\s*핫딜\s*\|\s*퀘이사존(?:\s+QUASARZONE)?\s*$/i, "")
    .replace(/^진행중\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseQuasarzoneWebSearch(
  payload: NaverWebSearchPayload,
  collectedAt = new Date().toISOString()
): RawDeal[] {
  return (payload.items ?? []).flatMap((item) => {
    const post = quasarzonePostUrl(item.link);
    const title = cleanTitle(plainText(item.title));
    const description = plainText(item.description);
    const publishedAt = parsePublishedAt(`${title} ${description}`);
    if (!post || !title || !publishedAt || /^종료\b/i.test(title)) return [];

    const comments = description.match(/댓글\s*:?\s*([\d,]+)\s*개?/i);
    const price = description.match(/(?:^|\s)가격\s*:?\s*(?:₩|￦)?\s*([\d,]+)(?:\s*원|\s*\(KRW\))?/i);
    const priceAmount = numberValue(price?.[1]);
    const freeShipping = /(?:배송비\/직배|배송)\s*:?\s*(?:무료|무배)(?=\s|$)/i.test(description);
    return [{
      source: "quasarzone" as const,
      sourceMode: "official_api" as const,
      sourceDealId: post.id,
      title,
      sourceUrl: post.url,
      publishedAt,
      dealPrice: priceAmount ? { amount: priceAmount, currency: "KRW" as const } : undefined,
      freeShipping: freeShipping || undefined,
      reactions: {
        comments: numberValue(comments?.[1])
      },
      collectedAt
    }];
  });
}

const approvedFeedConnector = createApprovedFeedConnector({
  id: "quasarzone",
  feedUrlEnv: "QUASARZONE_FEED_URL",
  feedTokenEnv: "QUASARZONE_FEED_TOKEN",
  missingMessage: "퀘이사존 승인 피드 URL이 필요합니다."
});

export const quasarzoneConnector: SourceConnector = {
  id: "quasarzone",
  mode: "official_api",
  async collect() {
    if (process.env.QUASARZONE_FEED_URL) return approvedFeedConnector.collect();

    const startedAt = new Date().toISOString();
    const clientId = process.env.NAVER_SEARCH_CLIENT_ID ?? process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET ?? process.env.NAVER_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return sourceResult({
        source: this.id,
        mode: this.mode,
        status: "needs_credentials",
        startedAt,
        message: "Cloudflare 우회 없이 수집하려면 퀘이사존 승인 피드 또는 네이버 웹문서 검색 API 인증값이 필요합니다."
      });
    }

    try {
      const url = new URL(NAVER_WEB_SEARCH_URL);
      url.searchParams.set("query", "site:quasarzone.com/bbs/qb_saleinfo/views/");
      url.searchParams.set("display", "100");
      url.searchParams.set("start", "1");
      const response = await fetchWithPolicy(url.toString(), {
        headers: {
          "X-Naver-Client-Id": clientId,
          "X-Naver-Client-Secret": clientSecret
        }
      });
      if (response.status === 403 || response.status === 429) {
        return sourceResult({
          source: this.id,
          mode: this.mode,
          status: "blocked",
          startedAt,
          message: `네이버 웹문서 검색 API 접근 차단: HTTP ${response.status}`
        });
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const deals = parseQuasarzoneWebSearch((await response.json()) as NaverWebSearchPayload);
      return sourceResult({
        source: this.id,
        mode: this.mode,
        status: "success",
        startedAt,
        deals,
        message: `네이버 공식 웹문서 검색에서 게시 시각이 확인된 퀘이사존 핫딜 ${deals.length}건 수집`
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
