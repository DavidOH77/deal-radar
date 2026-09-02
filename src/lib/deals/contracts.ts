import type { CrawlRun, Deal, SourceHealth } from "./types";

export interface DealsResponse {
  deals: Deal[];
  lastRun: Pick<CrawlRun, "finishedAt"> | null;
  asOf: string;
}

export interface AdminDealsData {
  deals: Deal[];
  sources: SourceHealth[];
  lastRun: CrawlRun | null;
  clickCount: number;
  asOf: string;
}
