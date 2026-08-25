import type { CrawlSourceResult, SourceConnector, SourceId } from "@/lib/deals/types";
import { algumonConnector } from "./algumon";
import { auctionConnector } from "./auction";
import { coupangConnector } from "./coupang";
import { elevenstConnector } from "./elevenst";
import { eomisaeConnector } from "./eomisae";
import { fmkoreaConnector } from "./fmkorea";
import { gmarketConnector } from "./gmarket";
import { naverConnector } from "./naver";
import { oliveyoungConnector } from "./oliveyoung";
import { ppomppuConnector } from "./ppomppu";
import { quasarzoneConnector } from "./quasarzone";
import { ssgConnector } from "./ssg";
import { theqooConnector } from "./theqoo";
import { womencityConnector } from "./womencity";
import { errorMessage, sourceResult } from "./result";

const connectors: SourceConnector[] = [
  algumonConnector,
  eomisaeConnector,
  theqooConnector,
  womencityConnector,
  fmkoreaConnector,
  ppomppuConnector,
  quasarzoneConnector,
  naverConnector,
  elevenstConnector,
  coupangConnector,
  gmarketConnector,
  auctionConnector,
  ssgConnector,
  oliveyoungConnector
];

export async function collectSources(sourceIds?: SourceId[]): Promise<CrawlSourceResult[]> {
  const selected = sourceIds?.length
    ? connectors.filter((connector) => sourceIds.includes(connector.id))
    : connectors;
  if (!selected.length) return [];

  const configured = Number(process.env.CRAWL_CONCURRENCY);
  const concurrency = Number.isFinite(configured)
    ? Math.min(Math.max(Math.trunc(configured), 1), 8)
    : 4;
  const results = new Array<CrawlSourceResult>(selected.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < selected.length) {
      const index = cursor;
      cursor += 1;
      const connector = selected[index];
      const startedAt = new Date().toISOString();
      try {
        results[index] = await connector.collect();
      } catch (error) {
        results[index] = sourceResult({
          source: connector.id,
          mode: connector.mode,
          status: "error",
          startedAt,
          message: `커넥터 오류: ${errorMessage(error)}`
        });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, selected.length) }, () => worker())
  );
  return results;
}
