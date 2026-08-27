import { SOURCE_IDS, type CrawlRun } from "@/lib/deals/types";

const DEFAULT_CRAWL_INTERVAL_MINUTES = 60;

function crawlIntervalMs(): number {
  const configured = Number(process.env.CRAWL_INTERVAL_MINUTES);
  const minutes = Number.isFinite(configured)
    ? Math.min(Math.max(Math.trunc(configured), 5), 24 * 60)
    : DEFAULT_CRAWL_INTERVAL_MINUTES;
  return minutes * 60_000;
}

export function isFullCrawlRun(run: CrawlRun): boolean {
  const sources = new Set(run.sources.map((source) => source.source));
  return SOURCE_IDS.every((source) => sources.has(source));
}

export function latestCompletedFullRun(runs: CrawlRun[]): CrawlRun | undefined {
  return runs.find((run) => run.status !== "failed" && isFullCrawlRun(run));
}

export function isCrawlDue(runs: CrawlRun[], now = Date.now()): boolean {
  const latest = latestCompletedFullRun(runs);
  if (!latest) return true;
  return new Date(latest.finishedAt).getTime() <= now - crawlIntervalMs();
}

export function isRequestCrawlEnabled(
  env: { NODE_ENV?: string; ENABLE_REQUEST_CRAWL?: string } = process.env
): boolean {
  return env.NODE_ENV !== "production" || env.ENABLE_REQUEST_CRAWL === "1";
}
