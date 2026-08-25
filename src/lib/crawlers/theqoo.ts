import * as cheerio from "cheerio";
import type { RawDeal, SourceConnector } from "@/lib/deals/types";
import { absoluteUrl, fetchWithPolicy, numberValue } from "./http";
import { errorMessage, sourceResult } from "./result";

const SOURCE_ORIGIN = "https://theqoo.net";
const HOT_SOURCE_URL = `${SOURCE_ORIGIN}/theqdeal?filter_mode=hot`;
const LATEST_SOURCE_URL = `${SOURCE_ORIGIN}/theqdeal`;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DETAIL_CONCURRENCY = 4;

interface TheqooDetail {
  imageUrl?: string;
  productUrl?: string;
  dealPrice?: RawDeal["dealPrice"];
  publishedAt?: string;
}

function kstDateParts(value: string): { year: number; month: number; day: number } {
  const shifted = new Date(new Date(value).getTime() + KST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate()
  };
}

function kstIso(year: number, month: number, day: number, hour = 0, minute = 0): string {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - KST_OFFSET_MS).toISOString();
}

function parsePublishedAt(value: string, collectedAt: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  const current = kstDateParts(collectedAt);

  const dateTime = normalized.match(/^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})$/);
  if (dateTime) {
    return kstIso(Number(dateTime[1]), Number(dateTime[2]), Number(dateTime[3]), Number(dateTime[4]), Number(dateTime[5]));
  }

  const shortDate = normalized.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (shortDate) return kstIso(2000 + Number(shortDate[1]), Number(shortDate[2]), Number(shortDate[3]));

  const monthDay = normalized.match(/^(\d{2})\.(\d{2})$/);
  if (monthDay) {
    let result = kstIso(current.year, Number(monthDay[1]), Number(monthDay[2]));
    if (new Date(result).getTime() > new Date(collectedAt).getTime() + 7 * 24 * 60 * 60 * 1000) {
      result = kstIso(current.year - 1, Number(monthDay[1]), Number(monthDay[2]));
    }
    return result;
  }

  const time = normalized.match(/^(\d{2}):(\d{2})$/);
  if (time) {
    let result = kstIso(current.year, current.month, current.day, Number(time[1]), Number(time[2]));
    if (new Date(result).getTime() > new Date(collectedAt).getTime() + 5 * 60_000) {
      result = new Date(new Date(result).getTime() - 24 * 60 * 60 * 1000).toISOString();
    }
    return result;
  }

  return collectedAt;
}

function wonValue(value: string): number | undefined {
  const match = value.match(/(\d{1,3}(?:,\d{3})+|\d{4,})\s*원/);
  return match ? numberValue(match[1]) : undefined;
}

export function parseTheqoo(html: string, collectedAt = new Date().toISOString()): RawDeal[] {
  const $ = cheerio.load(html);
  const deals: RawDeal[] = [];

  $("tbody.hide_notice > tr").not(".notice, .notice_expand").each((_, element) => {
    const row = $(element);
    const titleCell = row.find("td.title").first();
    const titleLink = titleCell.find("a").filter((_, link) => {
      const href = $(link).attr("href") ?? "";
      return /^\/theqdeal\/\d+(?:\?|$)/.test(href) && !href.includes("#");
    }).first();
    const href = titleLink.attr("href");
    const sourceDealId = href?.match(/\/theqdeal\/(\d+)/)?.[1];
    const productTitle = titleLink.text().replace(/\s+/g, " ").trim();
    const category = row.find("td.cate").first().text().replace(/\s+/g, " ").trim();
    if (!href || !sourceDealId || !productTitle || ["잡담/질문", "후기", "알림/결과"].includes(category)) return;

    const seller = titleCell.find("a.preface").first().text().replace(/[)\s]+$/g, "").trim();
    const priceText = titleCell.find(":scope > span").toArray()
      .map((span) => $(span).text().trim())
      .find((text) => /원/.test(text));
    const price = priceText ? wonValue(priceText) : undefined;
    if (!seller && !price) return;

    deals.push({
      source: "theqoo",
      sourceMode: "public_page",
      sourceDealId,
      title: `${seller ? `[${seller}] ` : ""}${productTitle}${priceText ? ` ${priceText}` : ""}`,
      sourceUrl: absoluteUrl(href, SOURCE_ORIGIN) ?? LATEST_SOURCE_URL,
      category: category || undefined,
      publishedAt: parsePublishedAt(row.find("td.time").first().text(), collectedAt),
      dealPrice: price ? { amount: price, currency: "KRW" } : undefined,
      reactions: {
        comments: numberValue(titleCell.find("a.replyNum").first().text()),
        views: numberValue(row.find("td.m_no").last().text())
      },
      collectedAt
    });
  });

  return deals;
}

function tableValue($: cheerio.CheerioAPI, label: string) {
  const row = $("table.et_vars tr").filter((_, element) => $(element).find("th").text().replace(/\s+/g, " ").trim().startsWith(label)).first();
  return row.length ? row.find("td").first() : undefined;
}

export function parseTheqooDetail(html: string): TheqooDetail {
  const $ = cheerio.load(html);
  const productCell = tableValue($, "상품링크");
  const price = wonValue(tableValue($, "가격")?.text() ?? "");
  const publishedAtText = $(".rd_hd .btm_area .side.fr span").first().text().trim();

  return {
    imageUrl: absoluteUrl($("article .xe_content img").first().attr("src"), SOURCE_ORIGIN),
    productUrl: absoluteUrl(productCell?.find("a").first().attr("href"), SOURCE_ORIGIN),
    dealPrice: price ? { amount: price, currency: "KRW" } : undefined,
    publishedAt: /^\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2}$/.test(publishedAtText)
      ? parsePublishedAt(publishedAtText, new Date().toISOString())
      : undefined
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
        const detail = parseTheqooDetail(await response.text());
        enriched[index] = {
          ...deal,
          imageUrl: detail.imageUrl,
          productUrl: detail.productUrl,
          dealPrice: detail.dealPrice ?? deal.dealPrice,
          publishedAt: detail.publishedAt ?? deal.publishedAt
        };
      } catch {
        enriched[index] = deal;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(DETAIL_CONCURRENCY, deals.length) }, () => worker()));
  return enriched;
}

export const theqooConnector: SourceConnector = {
  id: "theqoo",
  mode: "public_page",
  async collect() {
    const startedAt = new Date().toISOString();
    try {
      const listed: RawDeal[] = [];
      for (const sourceUrl of [HOT_SOURCE_URL, LATEST_SOURCE_URL]) {
        const response = await fetchWithPolicy(sourceUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        listed.push(...parseTheqoo(await response.text()));
      }
      const listedDeals = [...new Map(listed.map((deal) => [deal.sourceDealId, deal])).values()];
      const deals = await enrichDeals(listedDeals);
      return sourceResult({
        source: this.id,
        mode: this.mode,
        status: "success",
        startedAt,
        deals,
        message: `공개 덬딜 HOT·최신 목록에서 중복 제거 후 ${deals.length}건 수집`
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
