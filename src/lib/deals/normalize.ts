import { createHash } from "node:crypto";
import type { RawDeal, SourceId } from "./types";

const PROMO_WORDS = /\b(핫딜|특가|최저가|단독|오늘만|무료배송|쿠폰|카드할인)\b/gi;
const SPACE = /\s+/g;
const ENDED_TITLE_PREFIX = /^[\s\[\]xX❌️🚫⛔]*(?:종료(?:됨|완료)?|품절(?!\s*풀림)|마감(?:됨|완료)?|라이브\s*끝)(?=$|[\s:;!?.~)\]】❌️🚫⛔])/i;
const ENDED_TITLE_SUFFIX = /(?:쿠폰\s*)?(?:소진|판매\s*종료|행사\s*종료|종료(?:됨|완료)?|품절|마감(?:됨|완료)?)[\s❌️🚫⛔!?.~)\]】]*$/i;
const DECORATED_ENDED_MARKER = /[❌🚫⛔]\ufe0f?\s*(?:소진|종료|품절|마감)\s*[❌🚫⛔]/i;
const TITLE_DERIVED_PRICE_SOURCES = new Set<SourceId>(["eomisae", "womencity", "fmkorea", "ppomppu"]);

export function normalizeTitle(title: string): string {
  return title
    .normalize("NFKC")
    .replace(PROMO_WORDS, " ")
    .replace(/[\[\](){},/|+]/g, " ")
    .replace(SPACE, " ")
    .trim()
    .toLowerCase();
}

export function isExplicitlyEndedTitle(title: string): boolean {
  const normalized = title.normalize("NFKC").trim();
  return ENDED_TITLE_PREFIX.test(normalized)
    || ENDED_TITLE_SUFFIX.test(normalized)
    || DECORATED_ENDED_MARKER.test(normalized);
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

function parseMoneyText(value: string): number | undefined {
  const manwon = value.match(/(\d+(?:\.\d+)?)\s*만(?:\s*원|(?![가-힣]))/);
  if (manwon) return Math.round(Number(manwon[1]) * 10_000);

  const won = value.match(/(\d{1,3}(?:,\d{3})+|\d{4,})\s*원/);
  if (!won) return undefined;
  return Number(won[1].replaceAll(",", ""));
}

function labelledPriceFromTitle(title: string): number | undefined {
  const labels = [...title.matchAll(/(?:최종가?|판매가|딜가|할인가|쿠폰가)\s*[:：]?\s*((?:\d+(?:\.\d+)?\s*만(?:\s*원|(?![가-힣])))|(?:\d{1,3}(?:,\d{3})+|\d{4,})\s*원)/gi)];
  return labels.length ? parseMoneyText(labels.at(-1)?.[1] ?? "") : undefined;
}

function structuredPriceFromTitle(title: string): number | undefined {
  const groups = [...title.matchAll(/[([]\s*([^()[\]]+)\s*[)\]]/g)];
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const value = groups[index][1];
    if (/(?:배송|유료|착불|첫\s*구매|신규|카드|적립|체감)/i.test(value)
      || /\d+\s*[x×]\s*\d/i.test(value)) continue;
    const amount = parseMoneyText(value);
    if (amount) return amount;
  }
  return undefined;
}

export function parsePriceFromTitle(title: string): number | undefined {
  return labelledPriceFromTitle(title) ?? structuredPriceFromTitle(title) ?? parseMoneyText(title);
}

export function inferCategory(raw: Pick<RawDeal, "title" | "category">): string {
  if (raw.category?.trim()) return raw.category.trim();
  const title = raw.title.toLowerCase();
  if (/생수|음료|커피|김치|과자|고기|식품|라면/.test(title)) return "식품";
  if (/ssd|모니터|노트북|키보드|마우스|이어폰|스마트폰|게임/.test(title)) return "디지털";
  if (/냉장고|세탁기|건조기|에어컨|청소기|공기청정기|제습기|식기세척기|전자레인지|헤어드라이어|드라이기|고데기/.test(title)) return "가전";
  if (/신발|운동화|티셔츠|셔츠|팬츠|자켓|니트|나이키|아디다스/.test(title)) return "패션";
  if (/화장품|스킨케어|토너|에센스|세럼|앰플|로션|선크림|선스틱|아이크림|수분크림|재생크림|마데카크림|향수|립밤|립스틱|립글로스|립펜슬|틴트|쿠션|파운데이션|마스카라|아이섀도|아이브로우|아이라이너|컨실러|블러셔|메이크업|클렌징|클렌저|마스크팩|네일|샴푸|린스|트리트먼트|헤어팩|헤어토닉|헤어오일|두피|바디\s*(?:로션|워시|미스트)|괄사|속눈썹|화장솜/.test(title)) return "뷰티";
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
  const preferredTitlePrice = labelledPriceFromTitle(raw.title) ?? structuredPriceFromTitle(raw.title);
  const parsedPrice = TITLE_DERIVED_PRICE_SOURCES.has(raw.source) && preferredTitlePrice
    ? preferredTitlePrice
    : raw.dealPrice?.amount ?? parsePriceFromTitle(raw.title);
  return {
    ...raw,
    title: raw.title.replace(SPACE, " ").trim(),
    category: inferCategory(raw),
    dealPrice: parsedPrice ? { amount: parsedPrice, currency: "KRW" } : undefined
  };
}
