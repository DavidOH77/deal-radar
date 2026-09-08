import { dedupeDealsForDisplay } from "./quality";
import { isExplicitlyEndedTitle } from "./normalize";
import { calculateDisplayRankingScore } from "./scoring";
import type { Deal } from "./types";

const HOUR_MS = 60 * 60 * 1_000;
const FUTURE_TOLERANCE_MS = 15 * 60 * 1_000;

export const FEED_WINDOW_HOURS = 48;
export const FEED_DEAL_LIMIT = 600;

interface FeedSelectionOptions {
  now?: number;
  windowHours?: number;
  limit?: number;
}

export function reactionSignal(deal: Pick<Deal, "reactions">): number {
  const recommendations = Math.max(0, deal.reactions.likes ?? 0);
  const secondary = (deal.reactions.comments ?? 0) * 3
    + (deal.reactions.purchases ?? 0) * 2
    + Math.min(8, (deal.reactions.views ?? 0) / 1_000);
  const boundedSecondary = Math.min(999, Math.max(0, secondary));
  return recommendations > 0
    ? 1_000_000 + recommendations * 1_000 + boundedSecondary
    : boundedSecondary;
}

export function compareRecommendations(a: Deal, b: Deal): number {
  return (b.reactions.likes ?? 0) - (a.reactions.likes ?? 0)
    || b.publishedAt.localeCompare(a.publishedAt)
    || b.score.total - a.score.total;
}

function publishedAtTime(deal: Pick<Deal, "publishedAt">): number {
  return new Date(deal.publishedAt).getTime();
}

function hotComparison(now: number) {
  return (a: Deal, b: Deal) => calculateDisplayRankingScore(b, now) - calculateDisplayRankingScore(a, now)
    || b.score.total - a.score.total
    || b.publishedAt.localeCompare(a.publishedAt);
}

/**
 * Bounds the public feed while preserving three distinct discovery paths:
 * hot deals, the newest deals, and deals with the strongest raw reaction.
 * Archive views still receive the complete retained store.
 */
export function selectFeedDeals(
  deals: Deal[],
  { now = Date.now(), windowHours = FEED_WINDOW_HOURS, limit = FEED_DEAL_LIMIT }: FeedSelectionOptions = {}
): Deal[] {
  if (limit <= 0 || windowHours <= 0) return [];

  const cutoff = now - windowHours * HOUR_MS;
  const freshDeals = deals.filter((deal) => {
    const publishedAt = publishedAtTime(deal);
    const expiresAt = deal.expiresAt ? new Date(deal.expiresAt).getTime() : undefined;
    return Number.isFinite(publishedAt)
      && publishedAt >= cutoff
      && publishedAt <= now + FUTURE_TOLERANCE_MS
      && !isExplicitlyEndedTitle(deal.title)
      && (!expiresAt || expiresAt > now);
  });

  const compareHot = hotComparison(now);
  const byHot = dedupeDealsForDisplay([...freshDeals].sort(compareHot), now);
  if (byHot.length <= limit) return byHot;

  const byNewest = [...byHot].sort((a, b) => publishedAtTime(b) - publishedAtTime(a));
  const byReaction = [...byHot].sort((a, b) => reactionSignal(b) - reactionSignal(a) || compareHot(a, b));
  const selected = new Map<string, Deal>();

  const addUnique = (candidates: Deal[], quota: number) => {
    if (quota <= 0 || selected.size >= limit) return;
    let added = 0;
    for (const deal of candidates) {
      if (selected.has(deal.id)) continue;
      selected.set(deal.id, deal);
      added += 1;
      if (added >= quota || selected.size >= limit) break;
    }
  };

  const hotQuota = Math.ceil(limit * 0.55);
  const newestQuota = Math.ceil(limit * 0.3);
  addUnique(byHot, hotQuota);
  addUnique(byNewest, newestQuota);
  addUnique(byReaction, Math.max(0, limit - hotQuota - newestQuota));
  addUnique(byHot, limit - selected.size);

  return [...selected.values()].sort(compareHot);
}
