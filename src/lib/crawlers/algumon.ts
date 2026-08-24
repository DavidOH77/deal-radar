import * as cheerio from "cheerio";
import type { RawDeal, SourceConnector } from "@/lib/deals/types";
import { absoluteUrl, fetchWithPolicy, numberValue } from "./http";
import { errorMessage, sourceResult } from "./result";

const SOURCE_URL = "https://www.algumon.com/n/deal";

interface JsonLdItem {
  url?: string;
  item?: {
    name?: string;
    url?: string;
    image?: string;
    dateCreated?: string;
    commentCount?: number;
    interactionStatistic?: Array<{
      interactionType?: string;
      userInteractionCount?: number;
    }>;
  };
}

export function parseAlgumon(html: string, collectedAt = new Date().toISOString()): RawDeal[] {
  const $ = cheerio.load(html);
  const deals: RawDeal[] = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const json = JSON.parse($(element).text()) as {
        mainEntity?: { itemListElement?: JsonLdItem[] };
      };
      for (const entry of json.mainEntity?.itemListElement ?? []) {
        const item = entry.item;
        if (!item?.name || !item.url) continue;
        const sourceDealId = item.url.split("/").filter(Boolean).at(-1);
        if (!sourceDealId) continue;

        const interactions = item.interactionStatistic ?? [];
        const likes = interactions.find((value) => value.interactionType?.endsWith("WantAction"));
        const comments = interactions.find((value) => value.interactionType?.endsWith("CommentAction"));

        deals.push({
          source: "algumon",
          sourceMode: "public_page",
          sourceDealId,
          title: item.name,
          sourceUrl: item.url,
          imageUrl: absoluteUrl(item.image, SOURCE_URL),
          publishedAt: item.dateCreated ?? collectedAt,
          reactions: {
            likes: numberValue(String(likes?.userInteractionCount ?? 0)),
            comments: numberValue(String(comments?.userInteractionCount ?? item.commentCount ?? 0))
          },
          collectedAt
        });
      }
    } catch {
      // Other JSON-LD blocks are allowed to use unrelated schemas.
    }
  });

  return deals;
}

export const algumonConnector: SourceConnector = {
  id: "algumon",
  mode: "public_page",
  async collect() {
    const startedAt = new Date().toISOString();
    try {
      const response = await fetchWithPolicy(SOURCE_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const deals = parseAlgumon(await response.text());
      return sourceResult({
        source: this.id,
        mode: this.mode,
        status: "success",
        startedAt,
        deals,
        message: `공개 JSON-LD에서 ${deals.length}건 수집`
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
