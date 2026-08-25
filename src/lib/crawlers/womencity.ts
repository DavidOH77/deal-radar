import * as cheerio from "cheerio";
import type { RawDeal, SourceConnector } from "@/lib/deals/types";
import { isExplicitlyEndedTitle } from "@/lib/deals/normalize";
import { absoluteUrl, fetchWithPolicy, numberValue } from "./http";
import { errorMessage, sourceResult } from "./result";

const SOURCE_ORIGIN = "https://m.cafe.daum.net";
const SOURCE_URL = `${SOURCE_ORIGIN}/subdued20club/WSmj`;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DETAIL_CONCURRENCY = 3;
const SELLER_PREFIX = /^(쿠팡|네이버(?:스토어)?|G마켓|지마켓|11번가|카카오(?:톡)?|오늘의집|SSG|이마트|롯데온|올리브영|무신사|컬리|자사몰|29CM|W컨셉|토스)\)\s*/i;

interface WomencityDetail {
  imageUrl?: string;
  productUrl?: string;
  publishedAt?: string;
  reactions: RawDeal["reactions"];
}

function kstParts(value: string): { year: number; month: number; day: number } {
  const shifted = new Date(new Date(value).getTime() + KST_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

function kstIso(year: number, month: number, day: number, hour = 0, minute = 0): string {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - KST_OFFSET_MS).toISOString();
}

function parsePublishedAt(value: string, collectedAt: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  const collectedTime = new Date(collectedAt).getTime();
  const relative = normalized.match(/^(?:(\d+)시간\s*)?(?:(\d+)분\s*)?전$/);
  if (relative && (relative[1] || relative[2])) {
    return new Date(collectedTime - (Number(relative[1] ?? 0) * 60 + Number(relative[2] ?? 0)) * 60_000).toISOString();
  }

  const current = kstParts(collectedAt);
  const time = normalized.match(/^(\d{2}):(\d{2})$/);
  if (time) {
    let result = kstIso(current.year, current.month, current.day, Number(time[1]), Number(time[2]));
    if (new Date(result).getTime() > collectedTime + 5 * 60_000) {
      result = new Date(new Date(result).getTime() - 24 * 60 * 60 * 1000).toISOString();
    }
    return result;
  }

  const shortDate = normalized.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (shortDate) return kstIso(2000 + Number(shortDate[1]), Number(shortDate[2]), Number(shortDate[3]));
  return collectedAt;
}

function propertyString(block: string, key: string): string | undefined {
  const match = block.match(new RegExp(`${key}:\\s*("(?:\\\\.|[^"\\\\])*")`));
  if (!match) return undefined;
  try {
    return JSON.parse(match[1]) as string;
  } catch {
    return undefined;
  }
}

function propertyNumber(block: string, key: string): number | undefined {
  const match = block.match(new RegExp(`${key}:\\s*(?:Number\\()?"?(\\d[\\d,]*)`));
  return numberValue(match?.[1]);
}

function normalizeSeller(title: string): string {
  const match = title.match(SELLER_PREFIX);
  return match ? `[${match[1]}] ${title.slice(match[0].length)}` : title;
}

function cleanTitle(value: string): string {
  return cheerio.load(value, null, false).text().replace(/\s+/g, " ").trim();
}

export function parseWomencity(html: string, collectedAt = new Date().toISOString()): RawDeal[] {
  const deals: RawDeal[] = [];
  for (const match of html.matchAll(/articles\.push\(\s*\{([\s\S]*?)\}\s*\);/g)) {
    const block = match[1];
    const sourceDealId = String(propertyNumber(block, "dataid") ?? "");
    const titleValue = propertyString(block, "title");
    const title = titleValue ? cleanTitle(titleValue) : undefined;
    const fldid = propertyString(block, "fldid");
    if (!sourceDealId || !title || fldid !== "WSmj") continue;

    const imageUrl = propertyString(block, "thumbnailImageUrl");
    const elapsed = propertyString(block, "articleElapsedTime") ?? "";
    deals.push({
      source: "womencity",
      sourceMode: "public_page",
      sourceDealId,
      title: normalizeSeller(title),
      sourceUrl: `${SOURCE_URL}/${sourceDealId}`,
      imageUrl: imageUrl ? absoluteUrl(imageUrl, SOURCE_ORIGIN) : undefined,
      category: "세일정보",
      publishedAt: parsePublishedAt(elapsed, collectedAt),
      expiresAt: /^re\s*:/i.test(title) || isExplicitlyEndedTitle(title) ? collectedAt : undefined,
      reactions: {
        comments: propertyNumber(block, "commentCount"),
        views: propertyNumber(block, "viewCount")
      },
      collectedAt
    });
  }
  return deals;
}

function isExternalArticleLink(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value, SOURCE_ORIGIN);
    return !/(^|\.)daum\.net$/i.test(url.hostname);
  } catch {
    return false;
  }
}

export function parseWomencityDetail(html: string, collectedAt = new Date().toISOString()): WomencityDetail {
  const $ = cheerio.load(html);
  const subjectText = $("#mArticle .txt_subject").first().text().replace(/\s+/g, " ").trim();
  const publishedText = subjectText.match(/작성시간\s*(.*?)\s*\|\s*조회수/)?.[1] ?? "";
  const articleLink = $("#article a[href]").toArray()
    .map((element) => $(element).attr("href"))
    .find(isExternalArticleLink);

  return {
    imageUrl: absoluteUrl(
      $('meta[property="og:image"]').attr("content") ?? $("#article img").first().attr("src"),
      SOURCE_ORIGIN
    ),
    productUrl: absoluteUrl(articleLink, SOURCE_ORIGIN),
    publishedAt: publishedText ? parsePublishedAt(publishedText, collectedAt) : undefined,
    reactions: {
      comments: numberValue($("a.link_cmt .num_cmt").first().text()),
      views: numberValue(subjectText.match(/조회수\s*([\d,]+)/)?.[1])
    }
  };
}

async function enrichDeals(deals: RawDeal[]): Promise<RawDeal[]> {
  const enriched = new Array<RawDeal>(deals.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < deals.length) {
      const index = cursor;
      cursor += 1;
      const deal = deals[index];
      try {
        const response = await fetchWithPolicy(deal.sourceUrl);
        if (!response.ok) {
          enriched[index] = deal;
          continue;
        }
        const detail = parseWomencityDetail(await response.text(), deal.collectedAt);
        enriched[index] = {
          ...deal,
          imageUrl: detail.imageUrl ?? deal.imageUrl,
          productUrl: detail.productUrl,
          publishedAt: detail.publishedAt ?? deal.publishedAt,
          reactions: {
            comments: detail.reactions.comments ?? deal.reactions.comments,
            views: detail.reactions.views ?? deal.reactions.views
          }
        };
      } catch {
        enriched[index] = deal;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(DETAIL_CONCURRENCY, deals.length) }, () => worker()));
  return enriched;
}

export const womencityConnector: SourceConnector = {
  id: "womencity",
  mode: "public_page",
  async collect() {
    const startedAt = new Date().toISOString();
    try {
      const response = await fetchWithPolicy(SOURCE_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const listedDeals = parseWomencity(await response.text());
      const deals = await enrichDeals(listedDeals);
      return sourceResult({
        source: this.id,
        mode: this.mode,
        status: "success",
        startedAt,
        deals,
        message: `공개 여성시대 세일정보 목록에서 ${deals.length}건 수집`
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
