import * as cheerio from "cheerio";
import iconv from "iconv-lite";
import type { RawDeal, SourceConnector } from "@/lib/deals/types";
import { absoluteUrl, fetchWithPolicy, numberValue } from "./http";
import { errorMessage, sourceResult } from "./result";

const SOURCE_URL = "https://www.ppomppu.co.kr/zboard/zboard.php?id=ppomppu";
const RSS_URL = "https://www.ppomppu.co.kr/rss.php?id=ppomppu";
const DESCRIPTION_URL = /https?:\/\/[A-Za-z0-9.-]+(?::\d{2,5})?(?:\/[A-Za-z0-9._~%!$&'()*+,;=:@/?#-]*)?/g;
const REJECTED_PRODUCT_HOSTS = new Set([
  "click.linkprice.com",
  "coupa.ng",
  "link.coupang.com"
]);

function parsePublishedAt(value: string, fallback: string): string {
  const match = value.match(/(\d{2})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return fallback;
  return new Date(`20${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}+09:00`).toISOString();
}

export function parsePpomppu(html: string, collectedAt = new Date().toISOString()): RawDeal[] {
  const $ = cheerio.load(html);
  const deals: RawDeal[] = [];

  $("tr.baseList").each((_, element) => {
    const row = $(element);
    const titleLink = row.find("a.baseList-title").first();
    const link = titleLink.attr("href");
    const sourceDealId = row.find(".baseList-numb").first().text().trim();
    const title = titleLink.text().replace(/\s+/g, " ").trim();
    if (!/^\d+$/.test(sourceDealId) || !link || !title || !link.includes("id=ppomppu")) return;

    const recommendation = row.find(".baseList-rec").first().text().match(/\d+/)?.[0];
    const dateText = row.find("td[title]").filter((_, cell) => /\d{2}\.\d{2}\.\d{2}/.test($(cell).attr("title") ?? "")).attr("title") ?? "";
    const rawImage = row.find(".baseList-thumb img").first().attr("src");
    const category = row.find(".baseList-small").first().text().replace(/[\[\]]/g, "").trim();

    deals.push({
      source: "ppomppu",
      sourceMode: "public_page",
      sourceDealId,
      title,
      sourceUrl: absoluteUrl(link, SOURCE_URL) ?? SOURCE_URL,
      imageUrl: absoluteUrl(rawImage, SOURCE_URL),
      category: category || undefined,
      publishedAt: parsePublishedAt(dateText, collectedAt),
      reactions: {
        likes: numberValue(recommendation),
        comments: numberValue(row.find(".baseList-c").first().text()),
        views: numberValue(row.find(".baseList-views").first().text())
      },
      collectedAt
    });
  });

  return deals;
}

function merchantUrlFromDescription(description: string): string | undefined {
  for (const candidate of description.match(DESCRIPTION_URL) ?? []) {
    if (candidate.endsWith("...")) continue;

    try {
      const url = new URL(candidate);
      const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
      if (url.protocol !== "https:" && url.protocol !== "http:") continue;
      if (url.username || url.password) continue;
      if (hostname === "ppomppu.co.kr" || hostname.endsWith(".ppomppu.co.kr")) continue;
      if (REJECTED_PRODUCT_HOSTS.has(hostname)) continue;
      if (url.pathname === "/" && !url.search) continue;
      if (/\.(?:gif|jpe?g|png|webp)$/i.test(url.pathname)) continue;
      return url.toString();
    } catch {
      continue;
    }
  }

  return undefined;
}

function rssSourceId(sourceUrl: string): string | undefined {
  try {
    const id = new URL(sourceUrl).searchParams.get("no") ?? "";
    return /^\d+$/.test(id) ? id : undefined;
  } catch {
    return undefined;
  }
}

export function parsePpomppuRss(xml: string, collectedAt = new Date().toISOString()): RawDeal[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const deals: RawDeal[] = [];

  $("item").each((_, element) => {
    const item = $(element);
    const title = item.find("title").first().text().replace(/\s+/g, " ").trim();
    const rawSourceUrl = item.find("link").first().text().trim();
    const sourceDealId = rssSourceId(rawSourceUrl);
    if (!title || !sourceDealId) return;

    const publishedAtValue = Date.parse(item.find("pubDate").first().text().trim());
    const hits = item.find("hits").first().text().match(/\[\s*(\d+)\|(\d+)\|(\d+)\|/);
    const sourceUrl = new URL(rawSourceUrl);
    sourceUrl.protocol = "https:";

    deals.push({
      source: "ppomppu",
      sourceMode: "public_page",
      sourceDealId,
      title,
      sourceUrl: sourceUrl.toString(),
      productUrl: merchantUrlFromDescription(item.find("description").first().text()),
      publishedAt: Number.isFinite(publishedAtValue)
        ? new Date(publishedAtValue).toISOString()
        : collectedAt,
      reactions: {
        likes: numberValue(hits?.[1]),
        views: numberValue(hits?.[2]),
        comments: numberValue(hits?.[3])
      },
      collectedAt
    });
  });

  return deals;
}

export function mergePpomppuFeeds(listDeals: RawDeal[], rssDeals: RawDeal[]): RawDeal[] {
  const rssById = new Map(rssDeals.map((deal) => [deal.sourceDealId, deal]));
  const merged = listDeals.map((deal) => {
    const rssDeal = rssById.get(deal.sourceDealId);
    if (!rssDeal) return deal;
    rssById.delete(deal.sourceDealId);
    return {
      ...deal,
      productUrl: deal.productUrl ?? rssDeal.productUrl,
      reactions: {
        likes: deal.reactions.likes ?? rssDeal.reactions.likes,
        comments: deal.reactions.comments ?? rssDeal.reactions.comments,
        views: deal.reactions.views ?? rssDeal.reactions.views
      }
    };
  });

  return [...merged, ...rssById.values()];
}

async function fetchPpomppuList(): Promise<RawDeal[]> {
  const response = await fetchWithPolicy(SOURCE_URL);
  if (!response.ok) throw new Error(`목록 HTTP ${response.status}`);
  const html = iconv.decode(Buffer.from(await response.arrayBuffer()), "euc-kr");
  return parsePpomppu(html);
}

async function fetchPpomppuRss(): Promise<RawDeal[]> {
  const response = await fetchWithPolicy(RSS_URL);
  if (!response.ok) throw new Error(`RSS HTTP ${response.status}`);
  return parsePpomppuRss(await response.text());
}

export const ppomppuConnector: SourceConnector = {
  id: "ppomppu",
  mode: "public_page",
  async collect() {
    const startedAt = new Date().toISOString();
    try {
      const [listResult, rssResult] = await Promise.allSettled([
        fetchPpomppuList(),
        fetchPpomppuRss()
      ]);
      const listDeals = listResult.status === "fulfilled" ? listResult.value : [];
      const rssDeals = rssResult.status === "fulfilled" ? rssResult.value : [];
      const deals = mergePpomppuFeeds(listDeals, rssDeals);
      if (deals.length === 0) {
        const errors = [listResult, rssResult]
          .filter((result): result is PromiseRejectedResult => result.status === "rejected")
          .map((result) => errorMessage(result.reason));
        throw new Error(errors.join("; ") || "공개 목록과 RSS에 수집할 딜이 없습니다");
      }
      const directCount = deals.filter((deal) => deal.productUrl).length;
      const fallback = listDeals.length === 0 ? " · RSS 대체 수집" : "";
      return sourceResult({
        source: this.id,
        mode: this.mode,
        status: "success",
        startedAt,
        deals,
        message: `공개 뽐뿌 목록/RSS에서 ${deals.length}건 수집 · 판매처 ${directCount}건${fallback}`
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
