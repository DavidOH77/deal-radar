import * as cheerio from "cheerio";
import type { RawDeal, SourceConnector } from "@/lib/deals/types";
import { absoluteUrl, fetchWithPolicy, numberValue } from "./http";
import { errorMessage, sourceResult } from "./result";

const SOURCE_URL = "https://www.fmkorea.com/best";

interface FmkoreaDetail {
  imageUrl?: string;
  productUrl?: string;
  category?: string;
  publishedAt?: string;
  reactions: RawDeal["reactions"];
}

function parsePublishedAt(value: string): string | undefined {
  const match = value.match(/(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})/);
  if (!match) return undefined;
  return new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:00+09:00`).toISOString();
}

export function parseFmkoreaDetail(html: string): FmkoreaDetail {
  const $ = cheerio.load(html);
  const stats = $(".rd_hd .btm_area .side.fr").first().text().replace(/\s+/g, " ");
  return {
    imageUrl: absoluteUrl(
      $('meta[property="og:image"]').attr("content") ?? $("article .xe_content img").first().attr("src"),
      SOURCE_URL
    ),
    productUrl: absoluteUrl($(".hotdeal_table a.hotdeal_url").first().attr("href"), SOURCE_URL),
    category: $(".pop_more a.category").first().text().trim() || undefined,
    publishedAt: parsePublishedAt($(".rd_hd .date").first().text()),
    reactions: {
      views: numberValue(stats.match(/조회\s*수\s*([\d,]+)/)?.[1]),
      likes: numberValue(stats.match(/추천\s*수\s*([\d,]+)/)?.[1]),
      comments: numberValue(stats.match(/댓글\s*([\d,]+)/)?.[1])
    }
  };
}

export function parseFmkoreaBest(html: string, collectedAt = new Date().toISOString()): RawDeal[] {
  const $ = cheerio.load(html);
  const deals: RawDeal[] = [];

  $("li.li_best2_hotdeal1").each((_, element) => {
    const row = $(element);
    const titleLink = row.find("h3.title a").first();
    const link = titleLink.attr("href");
    const title = titleLink.find(".ellipsis-target").text().replace(/\s+/g, " ").trim();
    const sourceDealId = link?.match(/(\d{6,})/)?.[1];
    if (!link || !title || !sourceDealId) return;

    const rawImage = row.find("img.thumb").attr("data-original") ?? row.find("img.thumb").attr("src");
    deals.push({
      source: "fmkorea",
      sourceMode: "public_page",
      sourceDealId,
      title,
      sourceUrl: `https://www.fmkorea.com/best/${sourceDealId}`,
      imageUrl: absoluteUrl(rawImage, SOURCE_URL),
      category: "펨코 인기 핫딜",
      publishedAt: collectedAt,
      reactions: {
        likes: numberValue(row.find(".pc_voted_count .count").first().text()),
        comments: numberValue(row.find(".comment_count").first().text())
      },
      collectedAt
    });
  });

  return deals;
}

export const fmkoreaConnector: SourceConnector = {
  id: "fmkorea",
  mode: "public_page",
  async collect() {
    const startedAt = new Date().toISOString();
    try {
      const response = await fetchWithPolicy(SOURCE_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const listedDeals = parseFmkoreaBest(await response.text());
      const deals = await Promise.all(listedDeals.map(async (deal) => {
        try {
          const detailResponse = await fetchWithPolicy(deal.sourceUrl);
          if (!detailResponse.ok) return deal;
          const detail = parseFmkoreaDetail(await detailResponse.text());
          return {
            ...deal,
            imageUrl: detail.imageUrl ?? deal.imageUrl,
            productUrl: detail.productUrl,
            category: detail.category ?? deal.category,
            publishedAt: detail.publishedAt ?? deal.publishedAt,
            reactions: {
              views: detail.reactions.views ?? deal.reactions.views,
              likes: detail.reactions.likes ?? deal.reactions.likes,
              comments: detail.reactions.comments ?? deal.reactions.comments,
              purchases: detail.reactions.purchases ?? deal.reactions.purchases
            }
          };
        } catch {
          return deal;
        }
      }));
      return sourceResult({
        source: this.id,
        mode: this.mode,
        status: "success",
        startedAt,
        deals,
        message: `robots.txt가 허용한 베스트 목록의 핫딜 ${deals.length}건 수집`
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
