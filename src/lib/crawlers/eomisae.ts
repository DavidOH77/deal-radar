import * as cheerio from "cheerio";
import type { RawDeal, SourceConnector } from "@/lib/deals/types";
import { absoluteUrl, fetchWithPolicy, numberValue } from "./http";
import { errorMessage, sourceResult } from "./result";

const SOURCE_URL = "https://eomisae.co.kr/fs";

function parseShortDate(value: string, fallback: string): string {
  const match = value.match(/(\d{2})\.(\d{2})\.(\d{2})/);
  if (!match) return fallback;
  return new Date(`20${match[1]}-${match[2]}-${match[3]}T12:00:00+09:00`).toISOString();
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
    if (title.toLowerCase() === "list_adsense" || link.includes("/adlink_")) return;

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
      publishedAt: parseShortDate(dateText, collectedAt),
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
      const deals = parseEomisae(await response.text());
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
