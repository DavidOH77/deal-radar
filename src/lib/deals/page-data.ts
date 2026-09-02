import { latestSourceHealth } from "@/lib/crawlers/health";
import { CrawlAlreadyRunningError, runCrawl } from "@/lib/crawlers/run";
import { isCrawlDue, isRequestCrawlEnabled, latestCompletedFullRun } from "@/lib/crawlers/schedule";
import { clickCount, readStore } from "@/lib/store/file-store";
import type { AdminDealsData, DealsResponse } from "./contracts";
import { selectFeedDeals } from "./feed";

export function loadDealsData(options: { scope: "archive" }): Promise<AdminDealsData>;
export function loadDealsData(options?: { scope?: "feed" }): Promise<DealsResponse>;
export async function loadDealsData(
  { scope = "feed" }: { scope?: "feed" | "archive" } = {}
): Promise<DealsResponse | AdminDealsData> {
  let store = await readStore();
  if (isRequestCrawlEnabled() && isCrawlDue(store.runs)) {
    try {
      await runCrawl(undefined, { trigger: "bootstrap" });
    } catch (error) {
      if (!(error instanceof CrawlAlreadyRunningError)) throw error;
    }
    store = await readStore();
  }

  const asOf = new Date().toISOString();
  const lastRun = latestCompletedFullRun(store.runs) ?? null;
  const deals = scope === "feed"
    ? selectFeedDeals(store.deals, { now: new Date(asOf).getTime() })
    : store.deals;
  if (scope === "archive") {
    return {
      deals,
      sources: latestSourceHealth(store.runs),
      lastRun,
      clickCount: clickCount(store),
      asOf
    };
  }
  return {
    deals,
    lastRun: lastRun ? { finishedAt: lastRun.finishedAt } : null,
    asOf
  };
}
