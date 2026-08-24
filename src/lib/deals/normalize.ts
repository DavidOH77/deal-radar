import { createHash } from "node:crypto";
import type { RawDeal, SourceId } from "./types";

const PROMO_WORDS = /\b(핫딜|특가|최저가|단독|오늘만|무료배송|쿠폰|카드할인)\b/gi;
const SPACE = /\s+/g;

export function normalizeTitle(title: string): string {
  return title
    .normalize("NFKC")
    .replace(PROMO_WORDS, " ")
    .replace(/[\[\](){},/|+]/g, " ")
    .replace(SPACE, " ")
    .trim()
    .toLowerCase();
}

export function canonicalKey(source: SourceId, sourceDealId: string, title: string): string {
  const normalized = normalizeTitle(title);
  return createHash("sha1")
    .update(`${source}:${sourceDealId}:${normalized}`)
    .digest("hex")
    .slice(0, 20);
}

export function dealId(source: SourceId, sourceDealId: string): string {
  return `${source}_${sourceDealId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export function parsePriceFromTitle(title: string): number | undefined {
  const manwon = title.match(/(\d+(?:\.\d+)?)\s*만\s*원?/);
  if (manwon) return Math.round(Number(manwon[1]) * 10_000);

  const won = title.match(/(\d{1,3}(?:,\d{3})+|\d{4,})\s*원/);
  if (!won) return undefined;
  return Number(won[1].replaceAll(",", ""));
}

export function inferCategory(raw: Pick<RawDeal, "title" | "category">): string {
  if (raw.category?.trim()) return raw.category.trim();
  const title = raw.title.toLowerCase();
  if (/생수|음료|커피|김치|과자|고기|식품|라면/.test(title)) return "식품";
  if (/ssd|모니터|노트북|키보드|마우스|이어폰|스마트폰|게임/.test(title)) return "디지털";
  if (/신발|운동화|티셔츠|셔츠|팬츠|자켓|니트|나이키|아디다스/.test(title)) return "패션";
  if (/휴지|세제|샴푸|워셔|키친타월|마스크/.test(title)) return "생활";
  return "기타";
}

export function inferUnitPrice(title: string, price?: number): string | undefined {
  if (!price) return undefined;
  const count = title.match(/(?:x|×)?\s*(\d+)\s*(개|병|캔|팩|롤|매|입|t)\b/i);
  if (!count) return undefined;
  const quantity = Number(count[1]);
  if (!Number.isFinite(quantity) || quantity <= 1) return undefined;
  return `개당 ${Math.round(price / quantity).toLocaleString("ko-KR")}원`;
}

export function normalizeRawDeal(raw: RawDeal): RawDeal {
  const parsedPrice = raw.dealPrice?.amount ?? parsePriceFromTitle(raw.title);
  return {
    ...raw,
    title: raw.title.replace(SPACE, " ").trim(),
    category: inferCategory(raw),
    dealPrice: parsedPrice ? { amount: parsedPrice, currency: "KRW" } : undefined
  };
}
