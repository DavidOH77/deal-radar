import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { BlobPreconditionFailedError, get, put } from "@vercel/blob";
import { Redis } from "@upstash/redis";
import type {
  ClickAggregate,
  ClickEvent,
  CrawlLease,
  CrawlRun,
  CrawlSourceResult,
  CrawlStore,
  CrawlTrigger,
  Deal,
  PriceSnapshot,
  RawDeal
} from "@/lib/deals/types";
import { canonicalKey, dealId, inferUnitPrice, isExplicitlyEndedTitle, normalizeRawDeal, normalizeTitle } from "@/lib/deals/normalize";
import { calculateBaseline, calculateDisplayRankingScore, scoreDeal } from "@/lib/deals/scoring";
import { calculateDealTrend } from "@/lib/deals/trend";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "crawl-store.json");
const BLOB_STORE_PATH = "deal-radar/crawl-store.json";
const REDIS_STORE_KEY = "deal-radar:crawl-store";
const REDIS_MUTEX_KEY = "deal-radar:crawl-store:mutex";
const REDIS_MUTEX_TTL_MS = 15_000;
const EMPTY_STORE: CrawlStore = { deals: [], priceSnapshots: [], runs: [], clicks: [], clickAggregates: [] };
const DEAL_RETENTION_MS = 21 * 24 * 60 * 60 * 1000;
const SNAPSHOT_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;
const SNAPSHOT_INTERVAL_MS = 6 * 60 * 60 * 1000;
const PUBLISHED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_CRAWL_LEASE_TTL_MS = 8 * 60 * 1000;

let mutationQueue: Promise<unknown> = Promise.resolve();
let redisClient: Redis | undefined;

interface StoreSnapshot {
  store: CrawlStore;
  etag?: string;
}

function usesRedisStore(): boolean {
  const hasUrl = Boolean(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL);
  const hasToken = Boolean(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN);
  const cloudStoreEnabled = Boolean(process.env.VERCEL || process.env.USE_CLOUD_STORE === "1");
  return cloudStoreEnabled && hasUrl && hasToken;
}

function usesBlobStore(): boolean {
  const cloudStoreEnabled = Boolean(process.env.VERCEL || process.env.USE_CLOUD_STORE === "1");
  return cloudStoreEnabled && Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

function redis(): Redis {
  redisClient ??= Redis.fromEnv({ readYourWrites: true });
  return redisClient;
}

export function storageBackend(): "upstash_redis" | "vercel_blob" | "local_file" | "misconfigured" {
  if (usesRedisStore()) return "upstash_redis";
  if (usesBlobStore()) return "vercel_blob";
  if (process.env.VERCEL) return "misconfigured";
  return "local_file";
}

function normalizeStore(parsed: Partial<CrawlStore>): CrawlStore {
  return {
    deals: parsed.deals ?? [],
    priceSnapshots: parsed.priceSnapshots ?? [],
    runs: parsed.runs ?? [],
    clicks: parsed.clicks ?? [],
    clickAggregates: parsed.clickAggregates ?? [],
    crawlLease: parsed.crawlLease
  };
}

function parseStore(contents: string): CrawlStore {
  return normalizeStore(JSON.parse(contents) as Partial<CrawlStore>);
}

function parseRedisStore(value: unknown): CrawlStore {
  if (typeof value === "string") return parseStore(value);
  if (value && typeof value === "object") return normalizeStore(value as Partial<CrawlStore>);
  return structuredClone(EMPTY_STORE);
}

export function isDisplayableDeal(
  deal: Pick<RawDeal, "title" | "sourceUrl" | "publishedAt" | "expiresAt">,
  now = Date.now()
): boolean {
  const title = normalizeTitle(deal.title);
  if (!title || title === "list_adsense" || /^re\s*:/i.test(title) || deal.sourceUrl.includes("/adlink_") || isExplicitlyEndedTitle(deal.title)) return false;
  if (deal.expiresAt && new Date(deal.expiresAt).getTime() <= now) return false;
  return new Date(deal.publishedAt).getTime() >= now - PUBLISHED_RETENTION_MS;
}

async function readUnsafe(): Promise<StoreSnapshot> {
  if (usesRedisStore()) {
    return { store: parseRedisStore(await redis().get(REDIS_STORE_KEY)) };
  }

  if (usesBlobStore()) {
    const result = await get(BLOB_STORE_PATH, { access: "private", useCache: false });
    if (!result) return { store: structuredClone(EMPTY_STORE) };
    if (result.statusCode !== 200) throw new Error("Unexpected Blob response while reading the crawl store.");
    const contents = await new Response(result.stream).text();
    return { store: parseStore(contents), etag: result.blob.etag };
  }

  try {
    const contents = await readFile(STORE_PATH, "utf8");
    return { store: parseStore(contents) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { store: structuredClone(EMPTY_STORE) };
    }
    throw error;
  }
}

async function writeUnsafe(store: CrawlStore, etag?: string): Promise<void> {
  if (usesRedisStore()) {
    await redis().set(REDIS_STORE_KEY, store);
    return;
  }

  const contents = JSON.stringify(store, null, 2);
  if (usesBlobStore()) {
    await put(BLOB_STORE_PATH, contents, {
      access: "private",
      allowOverwrite: Boolean(etag),
      cacheControlMaxAge: 60,
      contentType: "application/json",
      ifMatch: etag
    });
    return;
  }
  if (process.env.VERCEL) {
    throw new Error("Persistent crawl storage is not configured. Connect a private Vercel Blob store.");
  }
  await mkdir(DATA_DIR, { recursive: true });
  const tempPath = path.join(DATA_DIR, `crawl-store.${process.pid}.${Date.now()}.tmp`);
  await writeFile(tempPath, contents, "utf8");
  await rename(tempPath, STORE_PATH);
}

async function waitForRedisMutex(attempt: number): Promise<void> {
  const delay = Math.min(50 + attempt * 15, 250);
  await new Promise((resolve) => setTimeout(resolve, delay));
}

async function withRedisMutex<T>(operation: () => Promise<T>): Promise<T> {
  const client = redis();
  const token = randomUUID();
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const acquired = await client.set(REDIS_MUTEX_KEY, token, { nx: true, px: REDIS_MUTEX_TTL_MS });
    if (acquired === "OK") {
      try {
        return await operation();
      } finally {
        await client.eval(
          "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
          [REDIS_MUTEX_KEY],
          [token]
        ).catch(() => undefined);
      }
    }
    await waitForRedisMutex(attempt);
  }
  throw new Error("Timed out waiting for the crawl store mutex.");
}

function mutateStore<T>(mutator: (store: CrawlStore) => T | Promise<T>): Promise<T> {
  const mutation = mutationQueue.then(async () => {
    if (usesRedisStore()) {
      return withRedisMutex(async () => {
        const { store } = await readUnsafe();
        const result = await mutator(store);
        await writeUnsafe(store);
        return result;
      });
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { store, etag } = await readUnsafe();
      const result = await mutator(store);
      try {
        await writeUnsafe(store, etag);
        return result;
      } catch (error) {
        if (error instanceof BlobPreconditionFailedError && attempt < 2) continue;
        throw error;
      }
    }
    throw new Error("Could not update the crawl store after concurrent writes.");
  });
  mutationQueue = mutation.catch(() => undefined);
  return mutation;
}

function crawlLeaseTtlMs(): number {
  const configured = Number(process.env.CRAWL_LEASE_TTL_MS);
  if (!Number.isFinite(configured)) return DEFAULT_CRAWL_LEASE_TTL_MS;
  return Math.min(Math.max(configured, 60_000), 15 * 60_000);
}

export function isCrawlLeaseActive(lease: CrawlLease | undefined, now = Date.now()): boolean {
  return Boolean(lease && new Date(lease.expiresAt).getTime() > now);
}

function expiredLeaseRun(lease: CrawlLease, finishedAt: string): CrawlRun {
  return {
    id: lease.id,
    startedAt: lease.startedAt,
    finishedAt,
    sources: [],
    totalCollected: 0,
    status: "failed",
    trigger: lease.trigger,
    requestId: lease.requestId,
    durationMs: Math.max(0, new Date(finishedAt).getTime() - new Date(lease.startedAt).getTime()),
    error: "crawl_lease_expired"
  };
}

export async function acquireCrawlLease(input: {
  id: string;
  startedAt: string;
  trigger: CrawlTrigger;
  requestId?: string;
  sourceIds?: CrawlLease["sourceIds"];
}): Promise<{ acquired: boolean; lease: CrawlLease }> {
  return mutateStore((store) => {
    const now = Date.now();
    if (isCrawlLeaseActive(store.crawlLease, now)) {
      return { acquired: false, lease: store.crawlLease! };
    }

    if (store.crawlLease) {
      const abandoned = expiredLeaseRun(store.crawlLease, new Date(now).toISOString());
      store.runs = [abandoned, ...store.runs.filter((run) => run.id !== abandoned.id)].slice(0, 100);
    }

    const lease: CrawlLease = {
      id: input.id,
      startedAt: input.startedAt,
      expiresAt: new Date(now + crawlLeaseTtlMs()).toISOString(),
      trigger: input.trigger,
      requestId: input.requestId,
      sourceIds: input.sourceIds
    };
    store.crawlLease = lease;
    return { acquired: true, lease };
  });
}

export async function releaseCrawlLease(id: string): Promise<void> {
  await mutateStore((store) => {
    if (store.crawlLease?.id === id) delete store.crawlLease;
  });
}

function shouldSnapshot(snapshots: PriceSnapshot[], raw: RawDeal, key: string): boolean {
  if (!raw.dealPrice?.amount) return false;
  const latest = snapshots
    .filter((snapshot) => snapshot.canonicalKey === key)
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0];
  if (!latest) return true;
  const elapsed = new Date(raw.collectedAt).getTime() - new Date(latest.observedAt).getTime();
  return elapsed >= SNAPSHOT_INTERVAL_MS || latest.amount !== raw.dealPrice.amount;
}

function hydrate(raw: RawDeal, snapshots: PriceSnapshot[], trend?: Deal["trend"]): Deal {
  const normalized = normalizeRawDeal(raw);
  const id = dealId(normalized.source, normalized.sourceDealId);
  const key = canonicalKey(normalized.source, normalized.sourceDealId, normalized.title);
  const baseline = calculateBaseline(normalized, key, snapshots);
  return {
    ...normalized,
    id,
    canonicalKey: key,
    normalizedTitle: normalizeTitle(normalized.title),
    baseline,
    score: scoreDeal(normalized, baseline),
    trend,
    unitPriceLabel: inferUnitPrice(normalized.title, normalized.dealPrice?.amount),
    outboundUrl: `/go/${encodeURIComponent(id)}`
  };
}

export function repairStoredDealPrice(deal: Deal): Deal {
  const normalized = normalizeRawDeal(deal);
  if (normalized.dealPrice?.amount === deal.dealPrice?.amount) return deal;

  const baseline: Deal["baseline"] = {
    kind: "unknown",
    confidence: "unknown",
    sampleSize: 0,
    label: "기준가 수집 중"
  };
  return {
    ...deal,
    ...normalized,
    baseline,
    score: scoreDeal(normalized, baseline),
    unitPriceLabel: inferUnitPrice(normalized.title, normalized.dealPrice?.amount)
  };
}

export function mergeRawDeal(previous: Deal | undefined, raw: RawDeal): RawDeal {
  if (!previous) return raw;
  return {
    ...raw,
    productUrl: raw.productUrl ?? previous.productUrl,
    affiliateUrl: raw.affiliateUrl ?? previous.affiliateUrl,
    imageUrl: raw.imageUrl ?? previous.imageUrl,
    category: raw.category ?? previous.category,
    expiresAt: raw.expiresAt ?? previous.expiresAt,
    dealPrice: raw.dealPrice ?? previous.dealPrice,
    sellerReferencePrice: raw.sellerReferencePrice ?? previous.sellerReferencePrice,
    shippingPrice: raw.shippingPrice ?? previous.shippingPrice,
    freeShipping: raw.freeShipping ?? previous.freeShipping,
    optionPrice: raw.optionPrice ?? previous.optionPrice,
    reactions: { ...previous.reactions, ...raw.reactions }
  };
}

export function crawlRunStatus(results: Array<Pick<CrawlSourceResult, "status">>): CrawlRun["status"] {
  return results.some((result) => result.status === "success") ? "completed" : "failed";
}

export async function readStore(): Promise<CrawlStore> {
  await mutationQueue;
  const { store } = await readUnsafe();
  const now = Date.now();
  return {
    ...store,
    deals: store.deals
      .map(repairStoredDealPrice)
      .filter((deal) => isDisplayableDeal(deal, now))
      .sort((a, b) => calculateDisplayRankingScore(b, now) - calculateDisplayRankingScore(a, now))
  };
}

export async function saveCrawlResults(
  results: CrawlSourceResult[],
  startedAt: string,
  context?: {
    id?: string;
    trigger?: CrawlTrigger;
    requestId?: string;
  }
): Promise<CrawlRun> {
  return mutateStore((store) => {
    const now = Date.now();
    const rawDeals = results
      .flatMap((result) => result.deals)
      .map(normalizeRawDeal);
    const displayableRawDeals = rawDeals.filter((deal) => isDisplayableDeal(deal, now));

    for (const raw of displayableRawDeals) {
      const key = canonicalKey(raw.source, raw.sourceDealId, raw.title);
      if (shouldSnapshot(store.priceSnapshots, raw, key) && raw.dealPrice) {
        store.priceSnapshots.push({
          canonicalKey: key,
          source: raw.source,
          sourceDealId: raw.sourceDealId,
          amount: raw.dealPrice.amount,
          observedAt: raw.collectedAt
        });
      }
    }

    store.priceSnapshots = store.priceSnapshots.filter(
      (snapshot) => new Date(snapshot.observedAt).getTime() >= now - SNAPSHOT_RETENTION_MS
    );

    const dealMap = new Map(store.deals.map((deal) => [deal.id, deal]));
    for (const raw of rawDeals) {
      const id = dealId(raw.source, raw.sourceDealId);
      if (!isDisplayableDeal(raw, now)) {
        dealMap.delete(id);
        continue;
      }
      const previous = dealMap.get(id);
      const merged = mergeRawDeal(previous, raw);
      dealMap.set(id, hydrate(merged, store.priceSnapshots, calculateDealTrend(previous, merged)));
    }

    store.deals = [...dealMap.values()]
      .filter((deal) => new Date(deal.collectedAt).getTime() >= now - DEAL_RETENTION_MS)
      .filter((deal) => isDisplayableDeal(deal, now))
      .map((deal) => hydrate(deal, store.priceSnapshots, deal.trend))
      .sort((a, b) => calculateDisplayRankingScore(b, now) - calculateDisplayRankingScore(a, now));

    const finishedAt = new Date().toISOString();
    const status = crawlRunStatus(results);
    const run: CrawlRun = {
      id: context?.id ?? `crawl_${Date.now().toString(36)}`,
      startedAt,
      finishedAt,
      sources: results.map((result) => ({
        source: result.source,
        mode: result.mode,
        status: result.status,
        count: result.count,
        startedAt: result.startedAt,
        finishedAt: result.finishedAt,
        message: result.message
      })),
      totalCollected: displayableRawDeals.length,
      status,
      trigger: context?.trigger,
      requestId: context?.requestId,
      durationMs: Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime()),
      error: status === "failed" ? "all_sources_unavailable" : undefined
    };
    store.runs = [run, ...store.runs.filter((item) => item.id !== run.id)].slice(0, 100);
    if (store.crawlLease?.id === run.id) delete store.crawlLease;
    return run;
  });
}

export async function saveFailedCrawlRun(input: {
  id: string;
  startedAt: string;
  trigger: CrawlTrigger;
  requestId?: string;
  error: string;
}): Promise<CrawlRun> {
  return mutateStore((store) => {
    const finishedAt = new Date().toISOString();
    const run: CrawlRun = {
      id: input.id,
      startedAt: input.startedAt,
      finishedAt,
      sources: [],
      totalCollected: 0,
      status: "failed",
      trigger: input.trigger,
      requestId: input.requestId,
      durationMs: Math.max(0, new Date(finishedAt).getTime() - new Date(input.startedAt).getTime()),
      error: input.error
    };
    store.runs = [run, ...store.runs.filter((item) => item.id !== run.id)].slice(0, 100);
    if (store.crawlLease?.id === run.id) delete store.crawlLease;
    return run;
  });
}

export async function findDeal(id: string): Promise<Deal | undefined> {
  const store = await readStore();
  return store.deals.find((deal) => deal.id === id);
}

function aggregateClick(aggregates: ClickAggregate[], event: ClickEvent): void {
  const date = event.clickedAt.slice(0, 10);
  const attribution = event.destinationProvider || event.affiliateMethod
    ? `:${event.destinationProvider ?? "unknown"}:${event.affiliateMethod ?? "unknown"}`
    : "";
  const key = `${date}:${event.dealId}:${event.affiliate ? "affiliate" : "direct"}${attribution}`;
  const existing = aggregates.find((item) => item.key === key);
  if (existing) {
    existing.count += 1;
    existing.lastClickedAt = event.clickedAt;
    return;
  }
  aggregates.push({
    key,
    dealId: event.dealId,
    source: event.source,
    date,
    affiliate: event.affiliate,
    destinationProvider: event.destinationProvider,
    affiliateMethod: event.affiliateMethod,
    count: 1,
    lastClickedAt: event.clickedAt
  });
}

export function clickCount(store: Pick<CrawlStore, "clicks" | "clickAggregates">): number {
  return store.clicks.length + (store.clickAggregates ?? []).reduce((sum, item) => sum + item.count, 0);
}

export async function recordClick(event: ClickEvent): Promise<void> {
  await mutateStore((store) => {
    const aggregates = store.clickAggregates ?? [];
    for (const legacyEvent of store.clicks) aggregateClick(aggregates, legacyEvent);
    store.clicks = [];
    aggregateClick(aggregates, event);
    const retentionCutoff = new Date(Date.now() - SNAPSHOT_RETENTION_MS).toISOString().slice(0, 10);
    store.clickAggregates = aggregates
      .filter((item) => item.date >= retentionCutoff)
      .slice(-20_000);
  });
}
