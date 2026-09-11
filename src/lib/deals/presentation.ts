import type { Deal, RawDeal, SourceId } from "./types";

export const SOURCE_LABELS: Record<SourceId, string> = {
  algumon: "알구몬",
  eomisae: "어미새",
  theqoo: "덬딜",
  womencity: "여성시대",
  fmkorea: "에펨코리아",
  ppomppu: "뽐뿌",
  quasarzone: "퀘이사존",
  naver: "네이버쇼핑",
  elevenst: "11번가",
  coupang: "쿠팡",
  gmarket: "G마켓",
  auction: "옥션",
  ssg: "SSG",
  oliveyoung: "올리브영"
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
const SLASH_SELLER_PREFIX = /^\s*(쿠팡|11번가|지마켓|g마켓|옥션|ssg|롯데온|네이버(?:멤버십)?|알리(?:익스프레스)?|오늘의집)\s*\/\s*/i;
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
    .replace(/(\d+(?:\.\d+)?\s*(?:ml|l|g|kg)\s+\d+\s*개)\s*,\s*\d+(?:\.\d+)?\s*(?:ml|l|g|kg)\s*,\s*\d+\s*개/gi, "$1")
    .replace(/\d+(?:,\d{3})*(?:\.\d+)?(?:\s*[~–-]\s*\d+(?:,\d{3})*(?:\.\d+)?)?\s*(?:만\s*)?원(?![가-힣])/gi, " ")
    .replace(/(?:무료(?:배송)?|무배)/gi, " ")
    .replace(/[([]\s*개당\s*[)\]]/gi, " ")
    .replace(/\s*(?:[-–·|/]\s*)?[₩￦]\s*\d{1,3}(?:,\d{3})+(?:\s*(?:무료배송|무배))?\s*$/i, "")
    .replace(/\s*(?:[-–·|/]\s*)?(?:\d{1,3}(?:,\d{3})+|\d{4,})\s*원(?:\s*(?:무료배송|무배))?\s*$/i, "")
    .replace(/\(\s*이상[^)]*\)/gi, " ")
    .replace(/\(\s*[/|·-]*\s*\)|\[\s*[/|·-]*\s*\]/g, " ")
    .replace(/\s*[([]\s*\.{2,}\s*$/g, "")
    .replace(/\s+/g, " ")
    .replace(/[·,/\-\s]+$/, "")
    .trim();
}

export function displayCategory(raw: Pick<RawDeal, "title" | "category">): DisplayCategory {
  const title = raw.title.normalize("NFKC").toLowerCase();
  const category = (raw.category ?? "").normalize("NFKC").toLowerCase();

  // Product nouns in the title outrank noisy source categories and brand fragments.
  if (/노트북|스마트폰|ssd|모니터|키보드|마우스|이어폰|헤드폰|태블릿|충전기|그래픽카드|메모리|공유기|스피커/.test(title)) return "디지털";
  if (/냉장고|세탁기|건조기|에어컨|청소기|다리미|공기청정기|제습기|식기세척기|전자레인지|헤어드라이어|드라이기|고데기/.test(title)) return "가전";
  if (/(?<!추)가구|침대|매트리스|토퍼|소파|책상|의자|식탁|서랍장|행거|인테리어/.test(title)) return "홈/가구";
  if (/생수|음료|주스|쥬스|스파클링\s*워터|탄산수|사이다|콜라(?!보)|두유|커피|김치|고기|삼겹|오징어|라면|사발면|과자|쿠키|초코|시리얼|쌀|과일|사과|복숭아|포도|샤인머스켓|양파|감자|순대|피자|빵|치즈|버터|올리브유|막걸리|무알콜|주류|마카롱|떡볶이|떡국|찹쌀떡|인절미|송편|백설기|전복|꽃게|아이스크림|계란|구운란|견과|마카다미아|해장국|곰탕|국밥|찌개|전골|짜장|짬뽕|국수|우동|파스타|스파게티|파스타소스|냉면|칼국수|비타민|영양제|프로틴|단백질|홍삼/.test(title)) return "식품";
  if (/의류|잡화|신발|운동화|러닝화|티셔츠|셔츠|블라우스|팬츠|바지|슬랙스|청바지|데님|자켓|재킷|니트|가디건|원피스|스커트|코트|후드|후디|맨투맨|점퍼|패딩|경량다운|다운재킷|바람막이|반팔|긴팔|드로즈|브라|양말|가방|모자|샌들|로퍼|부츠|키링/.test(title)) return "패션";
  if (/미용티슈|각티슈|두루마리|화장지|휴지|키친타월|세탁세제|주방세제|섬유유연제/.test(title)) return "생활";
  if (/화장품|스킨케어|토너|에센스|세럼|앰플|로션|선크림|선스틱|아이크림|수분크림|재생크림|마데카크림|크림|향수|립밤|립스틱|립글로스|립펜슬|틴트|쿠션|파운데이션|마스카라|아이섀도|아이브로우|아이라이너|컨실러|블러셔|파우더|픽서|메이크업|클렌징|클렌저|마스크팩|네일|샴푸|린스|트리트먼트|헤어팩|헤어토닉|헤어오일|두피|바디\s*(?:로션|워시|미스트)|괄사|속눈썹|화장솜|아토팜|클리오|마녀공장|네이처리퍼블릭|세타필|수려한/.test(title)) return "뷰티";
  if (/육아|유아|아동|기저귀|분유|키즈|유모차|카시트/.test(title)) return "육아";
  if (/스포츠|레저|캠핑|등산|러닝|골프|자전거|수영|텐트|낚시/.test(title)) return "스포츠/레저";
  if (/게임|닌텐도|플레이스테이션|xbox|보드게임|피규어|레고/.test(title)) return "게임/취미";
  if (/생활|세제|휴지|화장지|샴푸|린스|트리트먼트|워셔|키친타월|마스크|주방|욕실|수세미|수건|칫솔|치약|청소|클리너|락스|탈취제|섬유유연제/.test(title)) return "생활";

  if (/디지털|pc|컴퓨터/.test(category)) return "디지털";
  if (/가전/.test(category)) return "가전";
  if (/식품|건강|먹거리/.test(category)) return "식품";
  if (/패션|의류|잡화/.test(category)) return "패션";
  if (/뷰티|화장품/.test(category)) return "뷰티";
  if (/가구|인테리어|홈/.test(category)) return "홈/가구";
  if (/육아|유아|아동/.test(category)) return "육아";
  if (/스포츠|레저/.test(category)) return "스포츠/레저";
  if (/게임|취미/.test(category)) return "게임/취미";
  if (/생활|주방|욕실/.test(category)) return "생활";
  return "기타";
}

export interface DealPresentation {
  category: DisplayCategory;
  seller?: string;
  shippingLabel?: string;
  title: string;
}

export function presentDeal(deal: Pick<Deal, "title" | "category" | "source" | "freeShipping" | "shippingPrice">): DealPresentation {
  const sellerMatch = deal.title.match(SELLER_PREFIX) ?? deal.title.match(SLASH_SELLER_PREFIX);
  const seller = sellerMatch?.[1].trim();
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
