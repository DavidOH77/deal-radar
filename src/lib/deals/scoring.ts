import type { Baseline, Confidence, DealScore, DealTrend, PriceSnapshot, RawDeal } from "./types";
import { trendReason } from "./trend";

const confidenceWeight: Record<Confidence, number> = {
  high: 1,
  medium: 0.78,
  low: 0.48,
  unknown: 0.2
};

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
export const HOT_RANKING_HALF_LIFE_HOURS = 6;

function ageInHours(publishedAt: string, now: number): number {
  return Math.max(0, (now - new Date(publishedAt).getTime()) / 3_600_000);
}

function freshnessMultiplier(ageHours: number): number {
  return Math.pow(2, -ageHours / HOT_RANKING_HALF_LIFE_HOURS);
}

export function calculateRankingScore(
  deal: Pick<RawDeal, "publishedAt" | "reactions">,
  now = Date.now()
): number {
  const ageHours = ageInHours(deal.publishedAt, now);
  const views = Math.max(0, deal.reactions.views ?? 0);
  const recommendations = Math.max(0, deal.reactions.likes ?? 0);
  const comments = Math.max(0, deal.reactions.comments ?? 0);
  const purchases = Math.max(0, deal.reactions.purchases ?? 0);

  const recommendationScore = Math.log1p(recommendations) * 10;
  const commentScore = Math.log1p(comments) * 3;
  const purchaseScore = Math.log1p(purchases) * 2;
  const hasActiveReaction = recommendations + comments + purchases > 0;
  const viewSupport = hasActiveReaction
    ? Math.min(2, Math.log1p(views) * 0.25)
    : Math.min(0.25, Math.log1p(views) * 0.025);

  const engagement = recommendationScore + commentScore + purchaseScore + viewSupport + (hasActiveReaction ? 0 : 0.05);
  return engagement * freshnessMultiplier(ageHours);
}

export function calculateDisplayRankingScore(
  deal: Pick<RawDeal, "publishedAt" | "reactions"> & { trend?: DealTrend },
  now = Date.now()
): number {
  const base = calculateRankingScore(deal, now);
  if (!deal.trend?.rising) return base;
  const trendBoost = Math.min(18, Math.log1p(deal.trend.velocity) * 4);
  return base + trendBoost * freshnessMultiplier(ageInHours(deal.publishedAt, now));
}

export function explainRanking(
  deal: Pick<RawDeal, "publishedAt" | "reactions"> & { baseline?: Baseline; score?: DealScore; trend?: DealTrend },
  peers: Array<Pick<RawDeal, "publishedAt" | "reactions">>,
  now = Date.now()
): string {
  if (
    deal.baseline?.amount &&
    ["high", "medium"].includes(deal.baseline.confidence) &&
    deal.score?.discountRate &&
    deal.score.discountRate > 0
  ) {
    return `최근 기준가보다 ${Math.round(deal.score.discountRate * 100)}% 저렴`;
  }

  const risingReason = trendReason(deal.trend);
  if (risingReason) return risingReason;

  if (peers.length >= 10) {
    const scores = peers.map((peer) => calculateRankingScore(peer, now)).sort((a, b) => b - a);
    const score = calculateRankingScore(deal, now);
    const position = Math.max(0, scores.findIndex((value) => value <= score));
    const percentile = Math.max(5, Math.ceil((((position + 1) / peers.length) * 100) / 5) * 5);
    const ageHours = Math.max(1, Math.ceil((now - new Date(deal.publishedAt).getTime()) / 3_600_000));
    if (percentile <= 20) {
      return `${ageHours}시간 내 ${deal.reactions.likes ? "추천 반응" : "반응"} 상위 ${percentile}%`;
    }
  }

  const metrics = [
    deal.reactions.likes !== undefined ? `추천 ${formatCount(deal.reactions.likes)}` : undefined,
    deal.reactions.comments !== undefined ? `댓글 ${formatCount(deal.reactions.comments)}` : undefined,
    deal.reactions.views !== undefined ? `조회 ${formatCount(deal.reactions.views)}` : undefined
  ].filter(Boolean);
  return metrics.join(" · ") || "새로 등록된 딜";
}

function formatCount(value: number): string {
  return value >= 10_000 ? `${(value / 10_000).toFixed(1)}만` : value.toLocaleString("ko-KR");
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function calculateBaseline(
  deal: RawDeal,
  canonicalKey: string,
  snapshots: PriceSnapshot[],
  now = Date.now()
): Baseline {
  const cutoff = now - 90 * 24 * 60 * 60 * 1000;
  const observations = snapshots
    .filter((snapshot) => snapshot.canonicalKey === canonicalKey)
    .filter((snapshot) => new Date(snapshot.observedAt).getTime() >= cutoff)
    .filter((snapshot) => snapshot.amount > 0)
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  const history = observations.map((snapshot) => snapshot.amount);
  const observationSpan = observations.length > 1
    ? new Date(observations.at(-1)!.observedAt).getTime() - new Date(observations[0].observedAt).getTime()
    : 0;

  if (history.length >= 3 && observationSpan >= 24 * 60 * 60 * 1000) {
    return {
      amount: Math.round(median(history)),
      kind: "history_90d",
      confidence: history.length >= 8 && observationSpan >= 7 * 24 * 60 * 60 * 1000 ? "high" : "medium",
      sampleSize: history.length,
      label: "90일 관측 중앙가"
    };
  }

  if (deal.sellerReferencePrice?.amount && deal.sellerReferencePrice.amount > 0) {
    return {
      amount: deal.sellerReferencePrice.amount,
      kind: "seller_reference",
      confidence: "low",
      sampleSize: 1,
      label: "판매처 표시가"
    };
  }

  return {
    kind: "unknown",
    confidence: "unknown",
    sampleSize: history.length,
    label: "기준가 수집 중"
  };
}

function reactionScore(deal: RawDeal): number {
  const likes = deal.reactions.likes ?? 0;
  const comments = deal.reactions.comments ?? 0;
  const views = deal.reactions.views ?? 0;
  const purchases = deal.reactions.purchases ?? 0;
  const activeSignal = likes * 12 + comments * 3 + purchases * 2;
  const viewSupport = activeSignal > 0 ? Math.min(10, views / 1_000) : Math.min(2, views / 10_000);
  const signal = activeSignal + viewSupport;
  return clamp(Math.log10(1 + signal) * 34);
}

function urgencyScore(deal: RawDeal, now = Date.now()): number {
  const ageHours = Math.max(0, (now - new Date(deal.publishedAt).getTime()) / 3_600_000);
  const freshness = clamp(100 - ageHours * 2.5);
  if (!deal.expiresAt) return freshness;
  const hoursLeft = (new Date(deal.expiresAt).getTime() - now) / 3_600_000;
  if (hoursLeft <= 0) return 0;
  return clamp(freshness * 0.55 + (hoursLeft <= 12 ? 100 : 50) * 0.45);
}

export function scoreDeal(deal: RawDeal, baseline: Baseline, now = Date.now()): DealScore {
  const current = deal.dealPrice?.amount;
  const discountRate = current && baseline.amount && baseline.amount > current
    ? (baseline.amount - current) / baseline.amount
    : undefined;
  const price = discountRate
    ? clamp(discountRate * 310) * confidenceWeight[baseline.confidence]
    : 0;
  const reaction = reactionScore(deal);
  const trust = clamp(
    confidenceWeight[baseline.confidence] * 70 +
      (deal.optionPrice ? -18 : 12) +
      (deal.productUrl || deal.affiliateUrl ? 12 : 0)
  );
  const urgency = urgencyScore(deal, now);
  let total = Math.round(price * 0.45 + reaction * 0.3 + trust * 0.15 + urgency * 0.1);

  if (baseline.kind === "seller_reference") total = Math.min(total, 64);
  if (baseline.kind === "unknown") total = Math.min(total, 49);

  const tier = baseline.kind === "unknown"
    ? "WATCH"
    : total >= 82 && baseline.confidence === "high"
      ? "S"
      : total >= 68 && baseline.confidence !== "low"
        ? "A"
        : total >= 50
          ? "B"
          : "WATCH";

  return {
    total,
    price: Math.round(price),
    reaction: Math.round(reaction),
    trust: Math.round(trust),
    urgency: Math.round(urgency),
    tier,
    discountRate
  };
}
