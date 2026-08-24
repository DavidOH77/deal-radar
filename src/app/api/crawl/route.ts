import { NextResponse } from "next/server";
import { SOURCE_IDS, type SourceId } from "@/lib/deals/types";
import { CrawlAlreadyRunningError, requestId, runCrawl } from "@/lib/crawlers/run";
import { canRunManualCrawl } from "@/lib/server/auth";
import { logEvent, operationalError } from "@/lib/server/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSourceId(value: string): value is SourceId {
  return SOURCE_IDS.includes(value as SourceId);
}

function response(body: unknown, status: number, id: string) {
  return NextResponse.json(body, { status, headers: { "x-request-id": id, "cache-control": "no-store" } });
}

async function execute(sources: SourceId[] | undefined, id: string) {
  try {
    const run = await runCrawl(sources?.length ? sources : undefined, { trigger: "manual", requestId: id });
    logEvent("info", "manual_crawl_completed", { requestId: id, runId: run.id, collected: run.totalCollected });
    return response({ ok: true, run }, 200, id);
  } catch (error) {
    if (error instanceof CrawlAlreadyRunningError) {
      return response({ ok: false, error: "crawl_already_running", requestId: id, lease: error.lease }, 409, id);
    }
    logEvent("error", "manual_crawl_failed", { requestId: id, error: operationalError(error) });
    return response({ ok: false, error: "crawl_failed", requestId: id }, 500, id);
  }
}

export async function POST(request: Request) {
  const id = requestId();
  if (!canRunManualCrawl(request)) {
    return response({ ok: false, error: "unauthorized", requestId: id }, 401, id);
  }
  const payload = await request.json().catch(() => null) as { sources?: unknown } | null;
  if (!payload) {
    return response({ ok: false, error: "invalid_json", requestId: id }, 400, id);
  }
  if (payload.sources !== undefined && !Array.isArray(payload.sources)) {
    return response({ ok: false, error: "invalid_sources", requestId: id }, 400, id);
  }
  const values = (payload.sources ?? []) as unknown[];
  if (values.some((value) => typeof value !== "string" || !isSourceId(value))) {
    return response({ ok: false, error: "invalid_sources", requestId: id }, 400, id);
  }
  return execute(values as SourceId[], id);
}

export async function GET(request: Request) {
  const id = requestId();
  if (!canRunManualCrawl(request)) {
    return response({ ok: false, error: "unauthorized", requestId: id }, 401, id);
  }
  return execute(undefined, id);
}
