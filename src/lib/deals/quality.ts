import { isExplicitlyEndedTitle, normalizeTitle } from "./normalize";
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
const RELATED_WINDOW_MS = 48 * 60 * 60 * 1_000;
const RELATED_LIMIT = 8;
const PRODUCT_TOKEN = /[a-z0-9]+(?:\.[a-z0-9]+)?|[가-힣]+/g;
const PRODUCT_NOISE = new Set([
  "event",
  "이벤트",
  "무료배포",
  "농할",
  "핫딜",
  "특가",
  "역대급특가",
  "오늘만",
  "단독"
]);

interface ProductIdentity {
  hasBundleMarker: boolean;
  key: string;
  tokens: Set<string>;
  numericTokens: Set<string>;
}

function productIdentity(deal: Deal): ProductIdentity {
  const title = presentDeal(deal).title
    .normalize("NFKC")
    .toLowerCase();
  const tokens = (title.match(PRODUCT_TOKEN) ?? [])
    .filter((token) => !PRODUCT_NOISE.has(token));
  const uniqueTokens = new Set(tokens);
  return {
    hasBundleMarker: /\s\+\s|(?:추가\s*)?증정|세트|번들|묶음|골라담기/.test(title),
    key: [...uniqueTokens].join(" "),
    tokens: uniqueTokens,
    numericTokens: new Set(tokens.filter((token) => /\d/.test(token)))
  };
}

function sameTokenSet(a: Set<string>, b: Set<string>): boolean {
  return a.size === b.size && [...a].every((token) => b.has(token));
}

function isTokenSubset(smaller: Set<string>, larger: Set<string>): boolean {
  return [...smaller].every((token) => larger.has(token));
}

function sameProductIdentity(a: ProductIdentity, b: ProductIdentity): boolean {
  if (!a.key || !b.key) return false;
  if (a.key === b.key || sameTokenSet(a.tokens, b.tokens)) return true;

  // Conflicting capacities, counts, or model numbers are different variants. A concise
  // title may omit a unit size that a richer cross-source title includes for the same pack.
  if (a.numericTokens.size && b.numericTokens.size
    && !isTokenSubset(a.numericTokens, b.numericTokens)
    && !isTokenSubset(b.numericTokens, a.numericTokens)) {
    return false;
  }

  const [smaller, larger] = a.tokens.size <= b.tokens.size
    ? [a.tokens, b.tokens]
    : [b.tokens, a.tokens];
  if (smaller.size < 3) return false;
  if (a.hasBundleMarker !== b.hasBundleMarker && smaller.size <= 3) return false;

  const shared = [...smaller].filter((token) => larger.has(token)).length;
  const containment = shared / smaller.size;
  const union = new Set([...smaller, ...larger]).size;
  const jaccard = shared / union;

  return (containment === 1 && jaccard >= 0.4)
    || (shared >= 3 && jaccard >= 0.72);
}

export function productTitleKey(deal: Deal): string {
  return productIdentity(deal).key || normalizeTitle(presentDeal(deal).title);
}

export function isLikelySameProduct(a: Deal, b: Deal): boolean {
  return sameProductIdentity(productIdentity(a), productIdentity(b));
}

export function relatedDealsForDisplay(deal: Deal, candidates: Deal[], now = Date.now()): Deal[] {
  const cutoff = now - RELATED_WINDOW_MS;
  const bySource = new Map<SourceId, Deal>();

  for (const candidate of candidates) {
    const publishedAt = new Date(candidate.publishedAt).getTime();
    const expiresAt = candidate.expiresAt ? new Date(candidate.expiresAt).getTime() : undefined;
    if (candidate.id === deal.id || candidate.source === deal.source) continue;
    if (!Number.isFinite(publishedAt) || publishedAt < cutoff || publishedAt > now + 15 * 60 * 1_000) continue;
    if (isExplicitlyEndedTitle(candidate.title) || (expiresAt && expiresAt <= now)) continue;
    if (!isLikelySameProduct(candidate, deal)) continue;

    const current = bySource.get(candidate.source);
    if (!current) {
      bySource.set(candidate.source, candidate);
      continue;
    }

    const completeness = completenessScore(candidate) - completenessScore(current);
    const ranking = calculateDisplayRankingScore(candidate, now) - calculateDisplayRankingScore(current, now);
    if (completeness > 0 || (completeness === 0 && ranking > 0)) {
      bySource.set(candidate.source, candidate);
    }
  }

  return [...bySource.values()]
    .sort((a, b) => calculateDisplayRankingScore(b, now) - calculateDisplayRankingScore(a, now))
    .slice(0, RELATED_LIMIT);
}

function completenessScore(deal: Deal): number {
  return (deal.dealPrice?.amount ? 8 : 0) +
    (deal.imageUrl ? 4 : 0) +
    (deal.productUrl || deal.affiliateUrl ? 2 : 0) +
    (["high", "medium"].includes(deal.baseline.confidence) ? 1 : 0);
}

function maxMetric(deals: Deal[], metric: keyof Deal["reactions"]): number | undefined {
  const values = deals
    .map((deal) => deal.reactions[metric])
    .filter((value): value is number => value !== undefined);
  return values.length ? Math.max(...values) : undefined;
}

function latestTimestamp(values: string[]): string {
  return values.reduce((latest, value) => (
    new Date(value).getTime() > new Date(latest).getTime() ? value : latest
  ));
}

function mergeGroupDeal(representative: Deal, members: Deal[]): Deal {
  if (members.length === 1) return representative;
  const directMembers = members.filter((deal) => deal.source !== "algumon");
  const publicationMembers = directMembers.length ? directMembers : members;
  const trend = members
    .map((deal) => deal.trend)
    .filter((value) => value !== undefined)
    .sort((a, b) => b.velocity - a.velocity)[0];

  return {
    ...representative,
    publishedAt: latestTimestamp(publicationMembers.map((deal) => deal.publishedAt)),
    collectedAt: latestTimestamp(members.map((deal) => deal.collectedAt)),
    reactions: {
      likes: maxMetric(members, "likes"),
      comments: maxMetric(members, "comments"),
      views: maxMetric(members, "views"),
      purchases: maxMetric(members, "purchases")
    },
    trend
  };
}

export function dedupeDealsForDisplay(deals: Deal[], now = Date.now()): Deal[] {
  const groups: Array<{ deal: Deal; identity: ProductIdentity; members: Deal[]; position: number }> = [];
  const exactGroups = new Map<string, number>();

  deals.forEach((deal, position) => {
    const identity = productIdentity(deal);
    let groupIndex = exactGroups.get(identity.key);
    if (groupIndex === undefined) {
      groupIndex = groups.findIndex((group) => sameProductIdentity(identity, group.identity));
    }

    if (groupIndex < 0 || groupIndex === undefined) {
      exactGroups.set(identity.key, groups.length);
      groups.push({ deal, identity, members: [deal], position });
      return;
    }

    exactGroups.set(identity.key, groupIndex);
    const current = groups[groupIndex];
    current.members.push(deal);
    const qualityDifference = completenessScore(deal) - completenessScore(current.deal);
    const rankingDifference = calculateDisplayRankingScore(deal, now) - calculateDisplayRankingScore(current.deal, now);
    if (qualityDifference > 0 || (qualityDifference === 0 && rankingDifference > 0)) {
      groups[groupIndex] = {
        deal,
        identity: current.identity.tokens.size >= identity.tokens.size ? current.identity : identity,
        members: current.members,
        position: current.position
      };
    }
  });

  return groups
    .sort((a, b) => a.position - b.position)
    .map((entry) => mergeGroupDeal(entry.deal, entry.members));
}

export function prioritizePricedFeatured(deals: Deal[], searchDepth = 12): Deal[] {
  if (deals[0]?.dealPrice?.amount) return deals;
  const candidateIndex = deals.slice(0, searchDepth).findIndex((deal) => Boolean(deal.dealPrice?.amount));
  if (candidateIndex <= 0) return deals;
  return [deals[candidateIndex], ...deals.slice(0, candidateIndex), ...deals.slice(candidateIndex + 1)];
}

export function measureDealQuality(deals: Deal[]): DealQualitySummary {
  const sourceMap = new Map<SourceId, SourceQuality>();
  let priced = 0;
  let missingImage = 0;
  let titlePriceResidue = 0;

  for (const deal of deals) {
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
    duplicateCount: deals.length - dedupeDealsForDisplay(deals).length,
    missingImage,
    titlePriceResidue,
    sources: [...sourceMap.values()].sort((a, b) => b.total - a.total)
  };
}
