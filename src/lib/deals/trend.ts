import type { Deal, DealTrend, RawDeal } from "./types";

const MIN_TREND_WINDOW_MINUTES = 10;
const RISING_VELOCITY = 12;

function delta(current?: number, previous?: number): number {
  if (current === undefined || previous === undefined) return 0;
  return Math.max(0, current - previous);
}

export function calculateDealTrend(
  previous: Pick<Deal, "collectedAt" | "reactions" | "trend"> | undefined,
  current: Pick<RawDeal, "collectedAt" | "reactions">
): DealTrend | undefined {
  if (!previous) return undefined;
  const windowMinutes = Math.round(
    (new Date(current.collectedAt).getTime() - new Date(previous.collectedAt).getTime()) / 60_000
  );
  if (!Number.isFinite(windowMinutes) || windowMinutes < MIN_TREND_WINDOW_MINUTES) return previous.trend;

  const viewsDelta = delta(current.reactions.views, previous.reactions.views);
  const likesDelta = delta(current.reactions.likes, previous.reactions.likes);
  const commentsDelta = delta(current.reactions.comments, previous.reactions.comments);
  const purchasesDelta = delta(current.reactions.purchases, previous.reactions.purchases);
  const activeEngagement = likesDelta * 14 + commentsDelta * 4 + purchasesDelta * 3;
  const hasActiveGrowth = likesDelta > 0 || commentsDelta >= 2 || purchasesDelta >= 2;
  const viewSupport = hasActiveGrowth ? Math.min(6, Math.log10(1 + viewsDelta) * 2) : 0;
  const engagement = activeEngagement + viewSupport;
  const velocity = Math.round((engagement / Math.max(1, windowMinutes / 60)) * 10) / 10;

  return {
    windowMinutes,
    viewsDelta,
    likesDelta,
    commentsDelta,
    purchasesDelta,
    velocity,
    rising: hasActiveGrowth && velocity >= RISING_VELOCITY,
    measuredAt: current.collectedAt
  };
}

export function trendReason(trend?: DealTrend): string | undefined {
  if (!trend?.rising) return undefined;
  const parts = [
    trend.likesDelta ? `추천 +${trend.likesDelta.toLocaleString("ko-KR")}` : undefined,
    trend.commentsDelta ? `댓글 +${trend.commentsDelta.toLocaleString("ko-KR")}` : undefined,
    trend.purchasesDelta ? `구매 +${trend.purchasesDelta.toLocaleString("ko-KR")}` : undefined,
    trend.viewsDelta ? `조회 +${trend.viewsDelta.toLocaleString("ko-KR")}` : undefined
  ].filter(Boolean);
  const window = trend.windowMinutes < 60 ? `${trend.windowMinutes}분` : `${Math.round(trend.windowMinutes / 60)}시간`;
  return parts.length ? `최근 ${window} ${parts.slice(0, 2).join(" · ")}` : undefined;
}
