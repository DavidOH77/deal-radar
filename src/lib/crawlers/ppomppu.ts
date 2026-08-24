import * as cheerio from "cheerio";
import iconv from "iconv-lite";
import type { RawDeal, SourceConnector } from "@/lib/deals/types";
import { absoluteUrl, fetchWithPolicy, numberValue } from "./http";
import { errorMessage, sourceResult } from "./result";

const SOURCE_URL = "https://www.ppomppu.co.kr/zboard/zboard.php?id=ppomppu";

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

export const ppomppuConnector: SourceConnector = {
  id: "ppomppu",
  mode: "public_page",
  async collect() {
    const startedAt = new Date().toISOString();
    try {
      const response = await fetchWithPolicy(SOURCE_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = iconv.decode(Buffer.from(await response.arrayBuffer()), "euc-kr");
      const deals = parsePpomppu(html);
      return sourceResult({
        source: this.id,
        mode: this.mode,
        status: "success",
        startedAt,
        deals,
        message: `공개 뽐뿌 목록에서 ${deals.length}건 수집`
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
