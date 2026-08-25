export const SOURCE_IDS = [
  "algumon",
  "eomisae",
  "theqoo",
  "womencity",
  "fmkorea",
  "ppomppu",
  "quasarzone",
  "naver",
  "elevenst",
  "coupang",
  "gmarket",
  "auction",
  "ssg",
  "oliveyoung"
] as const;

export type SourceId = (typeof SOURCE_IDS)[number];
export type SourceMode = "public_page" | "official_api" | "approved_feed";
export type SourceStatus =
  | "success"
  | "needs_credentials"
  | "blocked"
  | "disabled"
  | "error";
export type DealTier = "S" | "A" | "B" | "WATCH";
export type CrawlTrigger = "cron" | "manual" | "bootstrap" | "development";
export type CrawlRunStatus = "completed" | "failed";
export type Confidence = "high" | "medium" | "low" | "unknown";
export type CommerceProvider = "coupang" | "elevenst" | "gmarket" | "auction" | "naver" | "ssg" | "oliveyoung";
export type AffiliateMethod = "provided_url" | "coupang_api" | "query" | "template" | "direct";
export type BaselineKind =
  | "history_90d"
  | "market_median"
  | "seller_reference"
  | "unknown";

export interface Money {
  amount: number;
  currency: "KRW";
}

export interface RawDeal {
  source: SourceId;
  sourceMode: SourceMode;
  sourceDealId: string;
  title: string;
  sourceUrl: string;
  productUrl?: string;
  affiliateUrl?: string;
  imageUrl?: string;
  category?: string;
  publishedAt: string;
  expiresAt?: string;
  dealPrice?: Money;
  sellerReferencePrice?: Money;
  shippingPrice?: Money;
  freeShipping?: boolean;
  optionPrice?: boolean;
  reactions: {
    likes?: number;
    comments?: number;
    views?: number;
    purchases?: number;
  };
  collectedAt: string;
}

export interface Baseline {
  amount?: number;
  kind: BaselineKind;
  confidence: Confidence;
  sampleSize: number;
  label: string;
}

export interface DealScore {
  total: number;
  price: number;
  reaction: number;
  trust: number;
  urgency: number;
  tier: DealTier;
  discountRate?: number;
}

export interface DealTrend {
  windowMinutes: number;
  viewsDelta: number;
  likesDelta: number;
  commentsDelta: number;
  purchasesDelta: number;
  velocity: number;
  rising: boolean;
  measuredAt: string;
}

export interface Deal extends RawDeal {
  id: string;
  canonicalKey: string;
  normalizedTitle: string;
  baseline: Baseline;
  score: DealScore;
  trend?: DealTrend;
  unitPriceLabel?: string;
  outboundUrl: string;
}

export interface PriceSnapshot {
  canonicalKey: string;
  source: SourceId;
  sourceDealId: string;
  amount: number;
  observedAt: string;
}

export interface CrawlSourceResult {
  source: SourceId;
  mode: SourceMode;
  status: SourceStatus;
  count: number;
  startedAt: string;
  finishedAt: string;
  message: string;
  deals: RawDeal[];
}

export type SourceHealth = Omit<CrawlSourceResult, "deals">;

export interface CrawlRun {
  id: string;
  startedAt: string;
  finishedAt: string;
  sources: SourceHealth[];
  totalCollected: number;
  status?: CrawlRunStatus;
  trigger?: CrawlTrigger;
  requestId?: string;
  durationMs?: number;
  error?: string;
}

export interface CrawlLease {
  id: string;
  startedAt: string;
  expiresAt: string;
  trigger: CrawlTrigger;
  requestId?: string;
  sourceIds?: SourceId[];
}

export interface ClickEvent {
  dealId: string;
  source: SourceId;
  clickedAt: string;
  affiliate: boolean;
  destinationProvider?: CommerceProvider;
  affiliateMethod?: AffiliateMethod;
}

export interface ClickAggregate {
  key: string;
  dealId: string;
  source: SourceId;
  date: string;
  affiliate: boolean;
  destinationProvider?: CommerceProvider;
  affiliateMethod?: AffiliateMethod;
  count: number;
  lastClickedAt: string;
}

export interface CrawlStore {
  deals: Deal[];
  priceSnapshots: PriceSnapshot[];
  runs: CrawlRun[];
  clicks: ClickEvent[];
  clickAggregates?: ClickAggregate[];
  crawlLease?: CrawlLease;
}

export interface SourceConnector {
  id: SourceId;
  mode: SourceMode;
  collect(): Promise<CrawlSourceResult>;
}
