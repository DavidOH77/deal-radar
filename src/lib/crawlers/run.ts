import { randomUUID } from "node:crypto";
import type { CrawlLease, CrawlRun, CrawlTrigger, SourceId } from "@/lib/deals/types";
import {
  acquireCrawlLease,
  releaseCrawlLease,
  saveCrawlResults,
  saveFailedCrawlRun
} from "@/lib/store/file-store";
import { collectSources } from "./index";

let activeRun: Promise<CrawlRun> | null = null;

export class CrawlAlreadyRunningError extends Error {
  constructor(public readonly lease: CrawlLease) {
    super("A crawl is already running.");
    this.name = "CrawlAlreadyRunningError";
  }
}

function failureMessage(error: unknown): string {
  if (!(error instanceof Error)) return "unknown_crawl_error";
  return `${error.name}: ${error.message}`.slice(0, 500);
}

export function runCrawl(
  sourceIds?: SourceId[],
  options: { trigger?: CrawlTrigger; requestId?: string } = {}
): Promise<CrawlRun> {
  if (activeRun) return activeRun;
  const startedAt = new Date().toISOString();
  const id = `crawl_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
  const trigger = options.trigger ?? "manual";

  activeRun = (async () => {
    const acquired = await acquireCrawlLease({
      id,
      startedAt,
      trigger,
      requestId: options.requestId,
      sourceIds
    });
    if (!acquired.acquired) throw new CrawlAlreadyRunningError(acquired.lease);

    try {
      const results = await collectSources(sourceIds);
      return await saveCrawlResults(results, startedAt, {
        id,
        trigger,
        requestId: options.requestId
      });
    } catch (error) {
      try {
        await saveFailedCrawlRun({
          id,
          startedAt,
          trigger,
          requestId: options.requestId,
          error: failureMessage(error)
        });
      } catch (persistenceError) {
        console.error("Failed to persist crawl failure", persistenceError);
        await releaseCrawlLease(id).catch(() => undefined);
      }
      throw error;
    }
  })()
    .finally(() => {
      activeRun = null;
    });
  return activeRun;
}

export function requestId(): string {
  return randomUUID();
}
