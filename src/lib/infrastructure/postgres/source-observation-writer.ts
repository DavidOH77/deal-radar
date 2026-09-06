import "server-only";
import type {
  ObservationWriteResult,
  ObservationWriter,
  SourcePostObservation
} from "@/lib/domain/deals/observations";
import { domainSql } from "./client";

const WRITE_BATCH_SIZE = 40;

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

export class PostgresSourceObservationWriter implements ObservationWriter {
  async write(observations: SourcePostObservation[]): Promise<ObservationWriteResult> {
    if (!observations.length) return { attempted: 0, inserted: 0 };
    const sql = domainSql();
    let inserted = 0;

    for (const batch of chunks(observations, WRITE_BATCH_SIZE)) {
      const queries = batch.flatMap((observation) => [
        sql`
          insert into source_posts (
            id, source, source_deal_id, source_mode, source_url, latest_product_url,
            destination_host, latest_title, normalized_title, category_hint, latest_image_url,
            published_at, first_observed_at, last_observed_at
          ) values (
            ${observation.sourcePostId}, ${observation.source}, ${observation.sourceDealId},
            ${observation.sourceMode}, ${observation.sourceUrl}, ${observation.productUrl ?? null},
            ${observation.destinationHost ?? null}, ${observation.title}, ${observation.normalizedTitle},
            ${observation.categoryHint ?? null}, ${observation.imageUrl ?? null},
            ${observation.publishedAt}, ${observation.observedAt}, ${observation.observedAt}
          )
          on conflict (source, source_deal_id) do update set
            source_mode = excluded.source_mode,
            source_url = excluded.source_url,
            latest_product_url = coalesce(excluded.latest_product_url, source_posts.latest_product_url),
            destination_host = coalesce(excluded.destination_host, source_posts.destination_host),
            latest_title = excluded.latest_title,
            normalized_title = excluded.normalized_title,
            category_hint = coalesce(excluded.category_hint, source_posts.category_hint),
            latest_image_url = coalesce(excluded.latest_image_url, source_posts.latest_image_url),
            published_at = excluded.published_at,
            last_observed_at = excluded.last_observed_at
          where source_posts.last_observed_at <= excluded.last_observed_at
        `,
        sql`
          insert into source_post_observations (
            idempotency_key, source_post_id, crawl_run_id, observed_at, expires_at,
            listed_price_amount, seller_reference_amount, shipping_amount, currency,
            free_shipping, option_price, recommendations, comments, views, purchases,
            raw_payload
          ) values (
            ${observation.idempotencyKey}, ${observation.sourcePostId}, ${observation.crawlRunId},
            ${observation.observedAt}, ${observation.expiresAt ?? null},
            ${observation.listedPriceAmount ?? null}, ${observation.sellerReferenceAmount ?? null},
            ${observation.shippingAmount ?? null}, 'KRW', ${observation.freeShipping},
            ${observation.optionPrice}, ${observation.reactions.recommendations ?? null},
            ${observation.reactions.comments ?? null}, ${observation.reactions.views ?? null},
            ${observation.reactions.purchases ?? null}, ${JSON.stringify(observation.rawPayload)}::jsonb
          )
          on conflict do nothing
          returning idempotency_key
        `
      ]);
      const results: unknown[] = await sql.transaction(queries);
      inserted += results
        .filter((_, index) => index % 2 === 1)
        .reduce<number>((total, rows) => total + (Array.isArray(rows) ? rows.length : 0), 0);
    }

    return { attempted: observations.length, inserted };
  }
}
