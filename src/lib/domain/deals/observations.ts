import type { RawDeal, SourceId, SourceMode } from "@/lib/deals/types";

export interface ReactionObservation {
  recommendations?: number;
  comments?: number;
  views?: number;
  purchases?: number;
}

export interface SourcePostObservation {
  idempotencyKey: string;
  sourcePostId: string;
  crawlRunId: string;
  source: SourceId;
  sourceMode: SourceMode;
  sourceDealId: string;
  sourceUrl: string;
  productUrl?: string;
  destinationHost?: string;
  title: string;
  normalizedTitle: string;
  categoryHint?: string;
  imageUrl?: string;
  publishedAt: string;
  observedAt: string;
  expiresAt?: string;
  listedPriceAmount?: number;
  sellerReferenceAmount?: number;
  shippingAmount?: number;
  freeShipping: boolean;
  optionPrice: boolean;
  reactions: ReactionObservation;
  rawPayload: RawDeal;
}

export interface ObservationWriteResult {
  attempted: number;
  inserted: number;
}

export interface ObservationWriter {
  write(observations: SourcePostObservation[]): Promise<ObservationWriteResult>;
}
