import * as cheerio from "cheerio";
import { isListingPlaceholderTitle } from "@/lib/deals/normalize";
import type { RawDeal, SourceConnector } from "@/lib/deals/types";
import { absoluteUrl, fetchWithPolicy, numberValue } from "./http";
import { errorMessage, sourceResult } from "./result";

const SOURCE_URL = "https://eomisae.co.kr/fs";
const KOREA_OFFSET_MS = 9 * 60 * 60 * 1_000;
const MAX_THUMBNAIL_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
const DETAIL_REQUEST_INTERVAL_MS = 5_000;
const MAX_DETAIL_TITLE_REQUESTS = 6;

function normalizedText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isTruncatedTitle(value: string): boolean {
  return /(?:\.\.\.|…)$/.test(value.trim());
}

export function parseEomisaeDetail(html: string): string | undefined {
  const $ = cheerio.load(html);
  const headingTitle = normalizedText($(".rd_hd h2 a.pjax").first().text());
  const metaTitle = normalizedText($("meta[property='og:title']").attr("content") ?? "")
    .replace(/\s+-\s+(?:인기정보|패션정보|기타정보|래플정보|이벤트정보)\s+-\s+어미새$/, "");
  const title = headingTitle || metaTitle;
  return title && !isListingPlaceholderTitle(title) ? title : undefined;
}

export function completeEomisaeTitle(listingTitle: string, detailTitle: string | undefined): string {
  const listingStem = listingTitle.replace(/(?:\.\.\.|…)$/, "").trim();
  return detailTitle && !isTruncatedTitle(detailTitle) && detailTitle.startsWith(listingStem)
    ? detailTitle
    : listingTitle;
}

async function waitForDetailRequest(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, DETAIL_REQUEST_INTERVAL_MS));
}

async function enrichTruncatedTitles(deals: RawDeal[]): Promise<RawDeal[]> {
  const enriched: RawDeal[] = [];
  let detailRequests = 0;

  for (const deal of deals) {
    if (!isTruncatedTitle(deal.title) || detailRequests >= MAX_DETAIL_TITLE_REQUESTS) {
      enriched.push(deal);
      continue;
    }

    await waitForDetailRequest();
    detailRequests += 1;
    try {
      const response = await fetchWithPolicy(deal.sourceUrl);
      if (!response.ok) {
        enriched.push(deal);
        continue;
      }
      const detailTitle = parseEomisaeDetail(await response.text());
      const title = completeEomisaeTitle(deal.title, detailTitle);
      enriched.push(title === deal.title ? deal : { ...deal, title });
    } catch {
      enriched.push(deal);
    }
  }

  return enriched;
}

function parseShortDate(value: string, fallback: string): string {
  const match = value.match(/(\d{2})\.(\d{2})\.(\d{2})/);
  if (!match) return fallback;
  return new Date(`20${match[1]}-${match[2]}-${match[3]}T12:00:00+09:00`).toISOString();
}

function koreaShortDate(time: number): string {
  const date = new Date(time + KOREA_OFFSET_MS);
  const year = String(date.getUTCFullYear()).slice(-2);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function parsePublishedAt(dateText: string, rawImage: string | undefined, fallback: string): string {
  const fallbackTime = new Date(fallback).getTime();
  try {
    const value = rawImage ? new URL(rawImage, SOURCE_URL).searchParams.get("t") : undefined;
    const numeric = Number(value);
    const timestamp = numeric < 10_000_000_000 ? numeric * 1_000 : numeric;
    const plausible = Number.isFinite(timestamp)
      && Number.isFinite(fallbackTime)
      && timestamp <= fallbackTime + 15 * 60 * 1_000
      && timestamp >= fallbackTime - MAX_THUMBNAIL_AGE_MS;
    if (plausible && koreaShortDate(timestamp) === dateText) return new Date(timestamp).toISOString();
  } catch {
    // Keep the date-only fallback when the cache-buster is malformed.
  }
  return parseShortDate(dateText, fallback);
}

export function parseEomisae(html: string, collectedAt = new Date().toISOString()): RawDeal[] {
  const $ = cheerio.load(html);
  const deals: RawDeal[] = [];

  $(".card_el").each((_, element) => {
    const card = $(element);
    const link = card.find("a.hx").attr("href") ?? card.find("h3 a").attr("href");
    const title = card.find("h3 a").text().replace(/\s+/g, " ").trim();
    const sourceDealId = link?.match(/\/fs\/(\d+)/)?.[1];
    if (!link || !title || !sourceDealId) return;
    if (isListingPlaceholderTitle(title) || link.includes("/adlink_")) return;

    const info = card.find(".infos");
    const metric = (iconClass: string) => {
      const span = info.find(`.${iconClass}`).closest("span");
      return numberValue(span.text());
    };
    const metaText = card.find(".card_content > p").text().replace(/\s+/g, " ");
    const dateText = metaText.match(/\d{2}\.\d{2}\.\d{2}/)?.[0] ?? "";
    const category = card.find(".cate").first().text().replace(",", "").trim();

    const rawImage = card.find("img.tmb").attr("src");
    const imageUrl = rawImage?.includes("/images/sub.png")
      ? undefined
      : absoluteUrl(rawImage, SOURCE_URL);

    deals.push({
      source: "eomisae",
      sourceMode: "public_page",
      sourceDealId,
      title,
      sourceUrl: absoluteUrl(link, SOURCE_URL) ?? `${SOURCE_URL}/${sourceDealId}`,
      imageUrl,
      category,
      publishedAt: parsePublishedAt(dateText, rawImage, collectedAt),
      reactions: {
        views: metric("ion-ios-eye"),
        comments: metric("ion-ios-chatbubble"),
        likes: metric("ion-ios-heart")
      },
      collectedAt
    });
  });

  return deals;
}

export const eomisaeConnector: SourceConnector = {
  id: "eomisae",
  mode: "public_page",
  async collect() {
    const startedAt = new Date().toISOString();
    try {
      const response = await fetchWithPolicy(SOURCE_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const listedDeals = parseEomisae(await response.text());
      const deals = await enrichTruncatedTitles(listedDeals);
      return sourceResult({
        source: this.id,
        mode: this.mode,
        status: "success",
        startedAt,
        deals,
        message: `공개 목록에서 ${deals.length}건 수집 (요청 간격 5초 정책)`
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
