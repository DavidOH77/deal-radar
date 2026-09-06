import { createHash } from "node:crypto";
import { normalizeRawDeal, normalizeTitle } from "@/lib/deals/normalize";
import type { RawDeal } from "@/lib/deals/types";
import type { ReactionObservation, SourcePostObservation } from "@/lib/domain/deals/observations";

function stableId(prefix: string, value: string, length: number): string {
  return `${prefix}_${createHash("sha256").update(value).digest("hex").slice(0, length)}`;
}

function nonNegative(value?: number): number | undefined {
  if (!Number.isFinite(value)) return undefined;
  return Math.max(0, Math.trunc(value!));
}

function destinationHost(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function reactions(raw: RawDeal): ReactionObservation {
  return {
    recommendations: nonNegative(raw.reactions.likes),
    comments: nonNegative(raw.reactions.comments),
    views: nonNegative(raw.reactions.views),
    purchases: nonNegative(raw.reactions.purchases)
  };
}

export function buildSourcePostObservation(raw: RawDeal, crawlRunId: string): SourcePostObservation {
  const normalized = normalizeRawDeal(raw);
  const sourcePostId = stableId("sp", `${normalized.source}:${normalized.sourceDealId}`, 24);
  const observationFingerprint = JSON.stringify({
    sourcePostId,
    observedAt: normalized.collectedAt,
    title: normalized.title,
    price: normalized.dealPrice?.amount,
    shipping: normalized.shippingPrice?.amount,
    reactions: normalized.reactions
  });

  return {
    idempotencyKey: stableId("spo", observationFingerprint, 32),
    sourcePostId,
    crawlRunId,
    source: normalized.source,
    sourceMode: normalized.sourceMode,
    sourceDealId: normalized.sourceDealId,
    sourceUrl: normalized.sourceUrl,
    productUrl: normalized.productUrl,
    destinationHost: destinationHost(normalized.productUrl ?? normalized.sourceUrl),
    title: normalized.title,
    normalizedTitle: normalizeTitle(normalized.title),
    categoryHint: normalized.category,
    imageUrl: normalized.imageUrl,
    publishedAt: normalized.publishedAt,
    observedAt: normalized.collectedAt,
    expiresAt: normalized.expiresAt,
    listedPriceAmount: normalized.dealPrice?.amount,
    sellerReferenceAmount: normalized.sellerReferencePrice?.amount,
    shippingAmount: normalized.shippingPrice?.amount,
    freeShipping: normalized.freeShipping ?? false,
    optionPrice: normalized.optionPrice ?? false,
    reactions: reactions(normalized),
    rawPayload: normalized
  };
}
