import { CrawlAlreadyRunningError, runCrawl } from "@/lib/crawlers/run";
import { isCrawlDue } from "@/lib/crawlers/schedule";
import { logEvent, operationalError } from "@/lib/server/log";
import { readStore } from "@/lib/store/file-store";

declare global {
  var dealRadarLocalScheduler: ReturnType<typeof setInterval> | undefined;
}

async function runDueCrawl(): Promise<void> {
  try {
    const store = await readStore();
    if (!isCrawlDue(store.runs)) return;
    const run = await runCrawl(undefined, { trigger: "development" });
    logEvent("info", "local_scheduled_crawl_completed", { runId: run.id, collected: run.totalCollected });
  } catch (error) {
    if (error instanceof CrawlAlreadyRunningError) return;
    logEvent("error", "local_scheduled_crawl_failed", { error: operationalError(error) });
  }
}

export function registerLocalScheduler(): void {
  const enabled = process.env.NODE_ENV === "development" || process.env.ENABLE_LOCAL_SCHEDULER === "1";
  if (!enabled || process.env.VERCEL) return;
  if (globalThis.dealRadarLocalScheduler) return;

  setTimeout(() => void runDueCrawl(), 5_000);
  globalThis.dealRadarLocalScheduler = setInterval(() => void runDueCrawl(), 60_000);
  logEvent("info", "local_scheduler_registered", { checkIntervalMs: 60_000 });
}
