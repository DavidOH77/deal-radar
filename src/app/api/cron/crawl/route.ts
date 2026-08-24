import { NextResponse } from "next/server";
import { CrawlAlreadyRunningError, requestId, runCrawl } from "@/lib/crawlers/run";
import { hasValidBearerToken } from "@/lib/server/auth";
import { logEvent, operationalError } from "@/lib/server/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const id = requestId();
  const headers = { "x-request-id": id, "cache-control": "no-store" };
  if (!hasValidBearerToken(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ ok: false, error: "unauthorized", requestId: id }, { status: 401, headers });
  }

  try {
    const run = await runCrawl(undefined, { trigger: "cron", requestId: id });
    logEvent("info", "hourly_crawl_completed", {
      requestId: id,
      runId: run.id,
      collected: run.totalCollected,
      durationMs: run.durationMs
    });
    return NextResponse.json({
      ok: true,
      requestId: id,
      runId: run.id,
      collected: run.totalCollected,
      finishedAt: run.finishedAt,
      sources: run.sources.map(({ source, status, count }) => ({ source, status, count }))
    }, { headers });
  } catch (error) {
    if (error instanceof CrawlAlreadyRunningError) {
      logEvent("warn", "hourly_crawl_skipped", { requestId: id, activeRunId: error.lease.id });
      return NextResponse.json({
        ok: true,
        status: "already_running",
        requestId: id,
        activeRunId: error.lease.id,
        startedAt: error.lease.startedAt
      }, { status: 202, headers });
    }
    logEvent("error", "hourly_crawl_failed", { requestId: id, error: operationalError(error) });
    return NextResponse.json({ ok: false, error: "crawl_failed", requestId: id }, { status: 500, headers });
  }
}
