import type { CrawlRun, Deal, SourceHealth } from "./types";

export interface DealsResponse {
  deals: Deal[];
  sources: SourceHealth[];
  lastRun: CrawlRun | null;
  clickCount: number;
  asOf: string;
}
