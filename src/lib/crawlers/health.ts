import { SOURCE_IDS, type CrawlRun, type SourceHealth } from "@/lib/deals/types";

export function latestSourceHealth(runs: CrawlRun[]): SourceHealth[] {
  const latest = new Map<SourceHealth["source"], SourceHealth>();
  for (const run of runs) {
    for (const source of run.sources) {
      if (!latest.has(source.source)) latest.set(source.source, source);
    }
  }
  return SOURCE_IDS.flatMap((source) => {
    const health = latest.get(source);
    return health ? [health] : [];
  });
}
