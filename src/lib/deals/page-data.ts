import { latestSourceHealth } from "@/lib/crawlers/health";
import { CrawlAlreadyRunningError, runCrawl } from "@/lib/crawlers/run";
import { isCrawlDue, latestCompletedFullRun } from "@/lib/crawlers/schedule";
import { clickCount, readStore } from "@/lib/store/file-store";
import type { DealsResponse } from "./contracts";

export async function loadDealsData(): Promise<DealsResponse> {
  let store = await readStore();
  if (isCrawlDue(store.runs)) {
    try {
      await runCrawl(undefined, { trigger: "bootstrap" });
    } catch (error) {
      if (!(error instanceof CrawlAlreadyRunningError)) throw error;
    }
    store = await readStore();
  }

  return {
    deals: store.deals,
    sources: latestSourceHealth(store.runs),
    lastRun: latestCompletedFullRun(store.runs) ?? null,
    clickCount: clickCount(store),
    asOf: new Date().toISOString()
  };
}
