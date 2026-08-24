import { describe, expect, it } from "vitest";
import type { CrawlRun, SourceHealth } from "@/lib/deals/types";
import { latestSourceHealth } from "./health";

function health(source: SourceHealth["source"], count: number): SourceHealth {
  return {
    source,
    mode: "public_page",
    status: "success",
    count,
    startedAt: "2026-08-23T00:00:00.000Z",
    finishedAt: "2026-08-23T00:00:01.000Z",
    message: `${count}건`
  };
}

function run(id: string, sources: SourceHealth[]): CrawlRun {
  return {
    id,
    startedAt: "2026-08-23T00:00:00.000Z",
    finishedAt: "2026-08-23T00:00:01.000Z",
    sources,
    totalCollected: sources.reduce((sum, source) => sum + source.count, 0)
  };
}

describe("latestSourceHealth", () => {
  it("keeps the latest status per source across partial runs", () => {
    const result = latestSourceHealth([
      run("latest", [health("ppomppu", 21)]),
      run("older", [health("algumon", 20), health("ppomppu", 18)])
    ]);
    expect(result.map(({ source, count }) => ({ source, count }))).toEqual([
      { source: "algumon", count: 20 },
      { source: "ppomppu", count: 21 }
    ]);
  });
});
