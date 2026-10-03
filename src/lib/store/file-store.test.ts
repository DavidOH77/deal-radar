import { afterEach, describe, expect, it } from "vitest";
import type { CrawlStore, Deal, RawDeal } from "@/lib/deals/types";
import {
  blobWriteEtag,
  clickCount,
  crawlRunStatus,
  isCrawlLeaseActive,
  isDisplayableDeal,
  mergeRawDeal,
  repairStoredDealPrice,
  storageBackend
} from "./file-store";

const storageEnvironment = [
  "VERCEL",
  "USE_CLOUD_STORE",
  "DEAL_STORE_BACKEND",
  "BLOB_READ_WRITE_TOKEN",
  "BLOB_STORE_ID",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN"
] as const;
const originalStorageEnvironment = Object.fromEntries(
  storageEnvironment.map((key) => [key, process.env[key]])
);

afterEach(() => {
  for (const key of storageEnvironment) {
    const value = originalStorageEnvironment[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

const raw: RawDeal = {
  source: "fmkorea",
  sourceMode: "public_page",
  sourceDealId: "123",
  title: "핫딜 9,900원",
  sourceUrl: "https://www.fmkorea.com/best/123",
  publishedAt: "2026-08-23T00:00:00.000Z",
  reactions: { likes: 12 },
  collectedAt: "2026-08-23T01:00:00.000Z"
};

describe("mergeRawDeal", () => {
  it("converts Blob read ETags into the strong value required by conditional writes", () => {
    expect(blobWriteEtag('W/"c4a101a5-1"')).toBe('"c4a101a5-1"');
    expect(blobWriteEtag('"c4a101a5-1"')).toBe('"c4a101a5-1"');
  });

  it("keeps previously collected optional metadata when a later list response omits it", () => {
    const previous = {
      ...raw,
      id: "fmkorea_123",
      canonicalKey: "key",
      normalizedTitle: "title",
      imageUrl: "https://image.fmkorea.com/product.jpg",
      productUrl: "https://seller.example/product",
      reactions: { views: 1000, likes: 10 },
      baseline: { kind: "unknown", confidence: "unknown", sampleSize: 0, label: "수집 중" },
      score: { total: 0, price: 0, reaction: 0, trust: 0, urgency: 0, tier: "WATCH" },
      outboundUrl: "/go/fmkorea_123"
    } satisfies Deal;

    expect(mergeRawDeal(previous, raw)).toMatchObject({
      imageUrl: "https://image.fmkorea.com/product.jpg",
      productUrl: "https://seller.example/product",
      reactions: { views: 1000, likes: 12 }
    });
  });

  it("keeps an exact Women's Generation time when a later crawl only exposes the date", () => {
    const previous = {
      ...raw,
      source: "womencity",
      sourceDealId: "24032",
      sourceUrl: "https://m.cafe.daum.net/subdued20club/WSmj/24032",
      publishedAt: "2026-09-10T06:32:00.000Z",
      id: "womencity_24032",
      canonicalKey: "key",
      normalizedTitle: "title",
      baseline: { kind: "unknown", confidence: "unknown", sampleSize: 0, label: "수집 중" },
      score: { total: 0, price: 0, reaction: 0, trust: 0, urgency: 0, tier: "WATCH" },
      outboundUrl: "/go/womencity_24032"
    } satisfies Deal;
    const dateOnly = {
      ...previous,
      publishedAt: "2026-09-10T03:00:00.000Z",
      publishedAtPrecision: "day",
      collectedAt: "2026-09-10T18:00:00.000Z"
    } satisfies RawDeal;

    expect(mergeRawDeal(previous, dateOnly)).toMatchObject({
      publishedAt: "2026-09-10T06:32:00.000Z",
      publishedAtPrecision: "minute"
    });
  });

  it("repairs a stored title-derived price without retaining an invalid baseline", () => {
    const repaired = repairStoredDealPrice({
      ...raw,
      title: "[지마켓] 컬쳐랜드 5만원권 (46,500원) (무료)",
      dealPrice: { amount: 50_000, currency: "KRW" },
      id: "fmkorea_123",
      canonicalKey: "key",
      normalizedTitle: "title",
      baseline: { amount: 50_000, kind: "history_90d", confidence: "high", sampleSize: 4, label: "최근 기준가" },
      score: { total: 80, price: 90, reaction: 50, trust: 70, urgency: 60, tier: "A" },
      outboundUrl: "/go/fmkorea_123"
    });

    expect(repaired.dealPrice?.amount).toBe(46_500);
    expect(repaired.baseline).toMatchObject({ kind: "unknown", confidence: "unknown", sampleSize: 0 });
    expect(repaired.score.discountRate).toBeUndefined();
  });

  it("keeps local development on the file store unless cloud storage is explicitly enabled", () => {
    delete process.env.VERCEL;
    delete process.env.USE_CLOUD_STORE;
    process.env.BLOB_READ_WRITE_TOKEN = "available-but-disabled";
    process.env.KV_REST_API_URL = "https://redis.example";
    process.env.KV_REST_API_TOKEN = "available-but-disabled";

    expect(storageBackend()).toBe("local_file");
  });

  it("allows an explicitly enabled local worker to use the configured cloud store", () => {
    delete process.env.VERCEL;
    process.env.USE_CLOUD_STORE = "1";
    process.env.BLOB_READ_WRITE_TOKEN = "enabled";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;

    expect(storageBackend()).toBe("vercel_blob");
  });

  it("lets operators choose Blob when Redis credentials are also configured", () => {
    process.env.VERCEL = "1";
    process.env.DEAL_STORE_BACKEND = "vercel_blob";
    process.env.BLOB_READ_WRITE_TOKEN = "blob-enabled";
    process.env.KV_REST_API_URL = "https://redis.example";
    process.env.KV_REST_API_TOKEN = "redis-enabled";

    expect(storageBackend()).toBe("vercel_blob");
  });

  it("reports a selected backend as misconfigured when its credentials are missing", () => {
    process.env.VERCEL = "1";
    process.env.DEAL_STORE_BACKEND = "vercel_blob";
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_STORE_ID;
    process.env.KV_REST_API_URL = "https://redis.example";
    process.env.KV_REST_API_TOKEN = "redis-enabled";

    expect(storageBackend()).toBe("misconfigured");
  });

  it("counts compacted and legacy clicks during migration", () => {
    const store = {
      clicks: [{ dealId: "fmkorea_123", source: "fmkorea", clickedAt: raw.collectedAt, affiliate: false }],
      clickAggregates: [{
        key: "2026-08-23:fmkorea_123:affiliate",
        dealId: "fmkorea_123",
        source: "fmkorea",
        date: "2026-08-23",
        affiliate: true,
        count: 4,
        lastClickedAt: raw.collectedAt
      }]
    } satisfies Pick<CrawlStore, "clicks" | "clickAggregates">;

    expect(clickCount(store)).toBe(5);
  });

  it("treats an expired crawl lease as inactive", () => {
    expect(isCrawlLeaseActive({
      id: "crawl_1",
      startedAt: "2026-08-23T00:00:00.000Z",
      expiresAt: "2026-08-23T00:08:00.000Z",
      trigger: "cron"
    }, Date.parse("2026-08-23T00:09:00.000Z"))).toBe(false);
  });

  it("marks a run failed when every source is unavailable", () => {
    expect(crawlRunStatus([{ status: "error" }, { status: "needs_credentials" }])).toBe("failed");
    expect(crawlRunStatus([{ status: "error" }, { status: "success" }])).toBe("completed");
  });

  it("hides explicitly ended deals and expired deals", () => {
    const now = Date.parse("2026-08-23T02:00:00.000Z");
    expect(isDisplayableDeal({ ...raw, title: "❌️라이브 끝❌️ 한우 특가" }, now)).toBe(false);
    expect(isDisplayableDeal({ ...raw, title: "네이버 푸드페스타 선착순 ❌️소진❌️" }, now)).toBe(false);
    expect(isDisplayableDeal({ ...raw, title: "Re: 페이코도됨" }, now)).toBe(false);
    expect(isDisplayableDeal({ ...raw, title: "list_ad_link" }, now)).toBe(false);
    expect(isDisplayableDeal({ ...raw, expiresAt: "2026-08-23T01:59:59.000Z" }, now)).toBe(false);
    expect(isDisplayableDeal({ ...raw, title: "품절풀림 베트남 그린망고 1,490원" }, now)).toBe(true);
    expect(isDisplayableDeal(raw, now)).toBe(true);
  });
});
