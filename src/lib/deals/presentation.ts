import type { Deal, RawDeal, SourceId } from "./types";

export const SOURCE_LABELS: Record<SourceId, string> = {
  algumon: "알구몬",
  eomisae: "어미새",
  fmkorea: "펨코",
  ppomppu: "뽐뿌",
  quasarzone: "퀘이사존",
  naver: "네이버쇼핑",
  elevenst: "11번가",
  coupang: "쿠팡",
  gmarket: "G마켓",
  ssg: "SSG"
};

export const DISPLAY_CATEGORIES = [
  "디지털",
  "가전",
  "식품",
  "패션",
  "뷰티",
  "생활",
  "홈/가구",
  "육아",
  "스포츠/레저",
  "게임/취미",
  "기타"
] as const;

export type DisplayCategory = (typeof DISPLAY_CATEGORIES)[number];

const SELLER_PREFIX = /^\s*\[([^\]]{1,24})\]\s*/;
const PRICE_SUFFIX = /\s*[([]\s*([^()[\]]*(?:원|무료|무배|배송)[^()[\]]*)\s*[)\]]\s*$/i;

function formatShipping(raw: Pick<RawDeal, "freeShipping" | "shippingPrice">, suffix?: string): string | undefined {
  if (raw.freeShipping) return "무료배송";
  if (raw.shippingPrice?.amount) return `배송 ${raw.shippingPrice.amount.toLocaleString("ko-KR")}원`;
  if (!suffix) return undefined;
  if (/무배|무료(?:배송)?/i.test(suffix)) return "무료배송";
  const shippingPart = suffix.split(/[\/|]/).slice(1).join(" ");
  const amount = shippingPart.match(/(\d{1,3}(?:,\d{3})+|\d{3,})\s*원?/);
  return amount ? `배송 ${Number(amount[1].replaceAll(",", "")).toLocaleString("ko-KR")}원` : undefined;
}

function cleanProductTitle(value: string): string {
  return value
    .replace(/(\d+(?:\.\d+)?)\s*(ml|l|g|kg)\s*[x×]\s*(\d+)(?!\d)(?:\s*개)?(?![가-힣])/gi, "$1$2 $3개")
    .replace(/\d+(?:,\d{3})*(?:\.\d+)?(?:\s*[~–-]\s*\d+(?:,\d{3})*(?:\.\d+)?)?\s*(?:만\s*)?원(?![가-힣])/gi, " ")
    .replace(/(?:무료배송|무배)/gi, " ")
    .replace(/\s*(?:[-–·|/]\s*)?(?:\d{1,3}(?:,\d{3})+|\d{4,})\s*원(?:\s*(?:무료배송|무배))?\s*$/i, "")
    .replace(/\s*[([]\s*\.{2,}\s*$/g, "")
    .replace(/\s+/g, " ")
    .replace(/[·,\-\s]+$/, "")
    .trim();
}

export function displayCategory(raw: Pick<RawDeal, "title" | "category">): DisplayCategory {
  const value = `${raw.category ?? ""} ${raw.title}`.normalize("NFKC").toLowerCase();
  if (/노트북|스마트폰|ssd|모니터|키보드|마우스|이어폰|헤드폰|태블릿|충전기|디지털/.test(value)) return "디지털";
  if (/냉장고|세탁기|건조기|에어컨|청소기|다리미|가전/.test(value)) return "가전";
  if (/식품|건강|먹거리|생수|음료|사이다|콜라|두유|커피|김치|고기|삼겹|오징어|라면|과자|쌀|과일|순대|피자|막걸리|무알콜|주류|마카롱|떡|전복|꽃게/.test(value)) return "식품";
  if (/패션|의류|잡화|신발|운동화|티셔츠|셔츠|팬츠|자켓|니트|가방|모자/.test(value)) return "패션";
  if (/뷰티|화장품|로션|크림|향수|립밤|메이크업/.test(value)) return "뷰티";
  if (/가구|침대|매트리스|소파|책상|의자|인테리어|홈/.test(value)) return "홈/가구";
  if (/육아|유아|아동|기저귀|분유|키즈/.test(value)) return "육아";
  if (/스포츠|레저|캠핑|등산|러닝|골프|자전거|수영/.test(value)) return "스포츠/레저";
  if (/게임|닌텐도|플레이스테이션|xbox|보드게임|취미/.test(value)) return "게임/취미";
  if (/생활|세제|휴지|화장지|샴푸|워셔|키친타월|마스크|주방|욕실|수세미|수건/.test(value)) return "생활";
  return "기타";
}

export interface DealPresentation {
  category: DisplayCategory;
  seller: string;
  shippingLabel?: string;
  title: string;
}

export function presentDeal(deal: Pick<Deal, "title" | "category" | "source" | "freeShipping" | "shippingPrice">): DealPresentation {
  const sellerMatch = deal.title.match(SELLER_PREFIX);
  const seller = sellerMatch?.[1].trim() || SOURCE_LABELS[deal.source];
  let title = sellerMatch ? deal.title.slice(sellerMatch[0].length) : deal.title;
  const suffixMatch = title.match(PRICE_SUFFIX);
  const suffix = suffixMatch?.[1];
  if (suffixMatch) title = title.slice(0, suffixMatch.index).trim();
  return {
    category: displayCategory(deal),
    seller,
    shippingLabel: formatShipping(deal, suffix),
    title: cleanProductTitle(title) || deal.title
  };
}

export function formatMetric(value?: number): string {
  if (!value) return "0";
  if (value >= 10_000) return `${(value / 10_000).toFixed(1)}만`;
  return value.toLocaleString("ko-KR");
}

export function relativeTime(value: string, referenceTime: string): string {
  const diff = new Date(referenceTime).getTime() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60_000));
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}
