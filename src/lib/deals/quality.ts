import { normalizeTitle } from "./normalize";
import { presentDeal } from "./presentation";
import { calculateDisplayRankingScore } from "./scoring";
import type { Deal, SourceId } from "./types";

export interface SourceQuality {
  source: SourceId;
  total: number;
  priced: number;
  missingImage: number;
}

export interface DealQualitySummary {
  total: number;
  priced: number;
  duplicateCount: number;
  missingImage: number;
  titlePriceResidue: number;
  sources: SourceQuality[];
}

const WON_IN_TITLE = /(?:\d{1,3}(?:,\d{3})+|\d{4,})\s*원/i;

export function productTitleKey(deal: Deal): string {
  return normalizeTitle(presentDeal(deal).title);
}

function completenessScore(deal: Deal): number {
  return (deal.dealPrice?.amount ? 8 : 0) +
    (deal.imageUrl ? 4 : 0) +
    (deal.productUrl || deal.affiliateUrl ? 2 : 0) +
    (["high", "medium"].includes(deal.baseline.confidence) ? 1 : 0);
}

export function dedupeDealsForDisplay(deals: Deal[], now = Date.now()): Deal[] {
  const groups = new Map<string, { deal: Deal; position: number }>();

  deals.forEach((deal, position) => {
    const key = productTitleKey(deal) || deal.id;
    const current = groups.get(key);
    if (!current) {
      groups.set(key, { deal, position });
      return;
    }

    const qualityDifference = completenessScore(deal) - completenessScore(current.deal);
    const rankingDifference = calculateDisplayRankingScore(deal, now) - calculateDisplayRankingScore(current.deal, now);
    if (qualityDifference > 0 || (qualityDifference === 0 && rankingDifference > 0)) {
      groups.set(key, { deal, position: current.position });
    }
  });

  return [...groups.values()]
    .sort((a, b) => a.position - b.position)
    .map((entry) => entry.deal);
}

export function prioritizePricedFeatured(deals: Deal[], searchDepth = 12): Deal[] {
  if (deals[0]?.dealPrice?.amount) return deals;
  const candidateIndex = deals.slice(0, searchDepth).findIndex((deal) => Boolean(deal.dealPrice?.amount));
  if (candidateIndex <= 0) return deals;
  return [deals[candidateIndex], ...deals.slice(0, candidateIndex), ...deals.slice(candidateIndex + 1)];
}

export function measureDealQuality(deals: Deal[]): DealQualitySummary {
  const keyCounts = new Map<string, number>();
  const sourceMap = new Map<SourceId, SourceQuality>();
  let priced = 0;
  let missingImage = 0;
  let titlePriceResidue = 0;

  for (const deal of deals) {
    const key = productTitleKey(deal) || deal.id;
    keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
    if (deal.dealPrice?.amount) priced += 1;
    if (!deal.imageUrl) missingImage += 1;
    if (WON_IN_TITLE.test(presentDeal(deal).title)) titlePriceResidue += 1;

    const source = sourceMap.get(deal.source) ?? {
      source: deal.source,
      total: 0,
      priced: 0,
      missingImage: 0
    };
    source.total += 1;
    if (deal.dealPrice?.amount) source.priced += 1;
    if (!deal.imageUrl) source.missingImage += 1;
    sourceMap.set(deal.source, source);
  }

  return {
    total: deals.length,
    priced,
    duplicateCount: [...keyCounts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0),
    missingImage,
    titlePriceResidue,
    sources: [...sourceMap.values()].sort((a, b) => b.total - a.total)
  };
}
