import { latestSourceHealth } from "@/lib/crawlers/health";
import { CrawlAlreadyRunningError, runCrawl } from "@/lib/crawlers/run";
import { isCrawlDue, isRequestCrawlEnabled, latestCompletedFullRun } from "@/lib/crawlers/schedule";
import { clickCount, readStore } from "@/lib/store/file-store";
import type { DealsResponse } from "./contracts";
import { selectFeedDeals } from "./feed";

export async function loadDealsData({ scope = "feed" }: { scope?: "feed" | "archive" } = {}): Promise<DealsResponse> {
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
  return {
    deals: scope === "feed" ? selectFeedDeals(store.deals, { now: new Date(asOf).getTime() }) : store.deals,
    sources: latestSourceHealth(store.runs),
    lastRun: latestCompletedFullRun(store.runs) ?? null,
    clickCount: clickCount(store),
    asOf
  };
}
