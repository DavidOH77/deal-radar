import * as cheerio from "cheerio";
import { parsePriceFromTitle } from "@/lib/deals/normalize";
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

interface CardMetadata {
  seller?: string;
  imageUrl?: string;
  price?: number;
  shippingPrice?: number;
  freeShipping?: boolean;
}

function cardMetadata($: cheerio.CheerioAPI): Map<string, CardMetadata> {
  const cards = new Map<string, CardMetadata>();
  $(".deal-feed-card").each((_, element) => {
    const card = $(element);
    const detailPath = card.find('a[href^="/n/deal/"]').first().attr("href");
    const sourceDealId = detailPath?.match(/^\/n\/deal\/([^/?#]+)/)?.[1];
    if (!sourceDealId) return;

    const seller = card.find("a.badge").first().text().replace(/[\[\]]/g, "").replace(/\s+/g, " ").trim().slice(0, 24);
    const priceLabel = card.find(".deal-price-text").first().text().replace(/\s+/g, " ").trim();
    const cardText = card.text().replace(/\s+/g, " ").trim();
    const freeShipping = /배송\s*(?:무료|무배)/i.test(cardText);
    const shippingLabel = cardText.match(/배송\s*(\d{1,3}(?:,\d{3})+|\d{3,})\s*원?/i)?.[1];

    cards.set(sourceDealId, {
      seller: seller || undefined,
      imageUrl: absoluteUrl(card.find("img[src]").first().attr("src"), SOURCE_URL),
      price: parsePriceFromTitle(priceLabel),
      shippingPrice: freeShipping || !shippingLabel ? undefined : Number(shippingLabel.replaceAll(",", "")),
      freeShipping: freeShipping || undefined
    });
  });
  return cards;
}

export function parseAlgumon(html: string, collectedAt = new Date().toISOString()): RawDeal[] {
  const $ = cheerio.load(html);
  const deals: RawDeal[] = [];
  const cards = cardMetadata($);

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
        const card = cards.get(sourceDealId);

        const interactions = item.interactionStatistic ?? [];
        const likes = interactions.find((value) => value.interactionType?.endsWith("WantAction"));
        const comments = interactions.find((value) => value.interactionType?.endsWith("CommentAction"));

        deals.push({
          source: "algumon",
          sourceMode: "public_page",
          sourceDealId,
          title: card?.seller ? `[${card.seller}] ${item.name}` : item.name,
          sourceUrl: item.url,
          imageUrl: absoluteUrl(item.image, SOURCE_URL) ?? card?.imageUrl,
          publishedAt: item.dateCreated ?? collectedAt,
          dealPrice: card?.price ? { amount: card.price, currency: "KRW" } : undefined,
          shippingPrice: card?.shippingPrice ? { amount: card.shippingPrice, currency: "KRW" } : undefined,
          freeShipping: card?.freeShipping,
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
