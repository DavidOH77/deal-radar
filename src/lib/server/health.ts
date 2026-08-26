import { latestSourceHealth } from "@/lib/crawlers/health";
import { latestCompletedFullRun } from "@/lib/crawlers/schedule";
import type { CrawlStore } from "@/lib/deals/types";
import { isCrawlLeaseActive, storageBackend } from "@/lib/store/file-store";

const DEFAULT_MAX_CRAWL_AGE_MINUTES = 150;

function maxCrawlAgeMinutes(): number {
  const configured = Number(process.env.HEALTH_MAX_CRAWL_AGE_MINUTES);
  if (!Number.isFinite(configured)) return DEFAULT_MAX_CRAWL_AGE_MINUTES;
  return Math.min(Math.max(Math.trunc(configured), 30), 24 * 60);
}

export function backendHealth(store: CrawlStore, now = Date.now()) {
  const backend = storageBackend();
  const activeLease = isCrawlLeaseActive(store.crawlLease, now) ? store.crawlLease : undefined;
  const lastCompleted = latestCompletedFullRun(store.runs);
  const lastCompletedAt = lastCompleted?.finishedAt;
  const ageMinutes = lastCompletedAt
    ? Math.max(0, Math.round((now - new Date(lastCompletedAt).getTime()) / 60_000))
    : null;
  const stale = ageMinutes === null || ageMinutes > maxCrawlAgeMinutes();
  const sourceHealth = latestSourceHealth(store.runs);
  const healthySources = sourceHealth.filter((source) => source.status === "success").length;
  const failedSources = sourceHealth.length - healthySources;
  const pricedDeals = store.deals.filter((deal) => deal.dealPrice?.amount).length;
  const missingImageDeals = store.deals.filter((deal) => !deal.imageUrl).length;
  const risingDeals = store.deals.filter((deal) => deal.trend?.rising).length;
  const storageReady = backend !== "misconfigured";
  const ok = storageReady && store.deals.length > 0 && (!stale || Boolean(activeLease));
  const degraded = ok && failedSources > 0;
  const percent = (value: number, total: number) => total ? Math.round((value / total) * 1_000) / 10 : 0;

  return {
    ok,
    status: !storageReady
      ? "storage_misconfigured"
      : stale && !activeLease
        ? "crawl_stale"
        : degraded
          ? "degraded"
          : "ready",
    storage: { backend, ready: storageReady },
    crawl: {
      running: Boolean(activeLease),
      activeRunId: activeLease?.id ?? null,
      lastCompletedAt: lastCompletedAt ?? null,
      ageMinutes,
      stale
    },
    sources: {
      healthy: healthySources,
      failed: failedSources,
      total: sourceHealth.length,
      successRate: percent(healthySources, sourceHealth.length)
    },
    data: {
      deals: store.deals.length,
      pricedDeals,
      pricedRate: percent(pricedDeals, store.deals.length),
      missingImageDeals,
      missingImageRate: percent(missingImageDeals, store.deals.length),
      risingDeals
    }
  };
}
