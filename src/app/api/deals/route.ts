import { NextResponse } from "next/server";
import { SOURCE_IDS, type SourceId } from "@/lib/deals/types";
import { latestSourceHealth } from "@/lib/crawlers/health";
import { CrawlAlreadyRunningError, requestId, runCrawl } from "@/lib/crawlers/run";
import { isCrawlDue, isRequestCrawlEnabled, latestCompletedFullRun } from "@/lib/crawlers/schedule";
import { clickCount, readStore } from "@/lib/store/file-store";
import { logEvent, operationalError } from "@/lib/server/log";
import { selectFeedDeals } from "@/lib/deals/feed";
import { parseRequestedDealIds } from "@/lib/deals/query";
import { canViewAdminData } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSourceId(value: string): value is SourceId {
  return SOURCE_IDS.includes(value as SourceId);
}

export async function GET(request: Request) {
  const id = requestId();
  const url = new URL(request.url);
  const sourceValues = url.searchParams.getAll("source");
  if (sourceValues.some((value) => !isSourceId(value))) {
    return NextResponse.json(
      { ok: false, error: "invalid_source", requestId: id },
      { status: 400, headers: { "x-request-id": id, "cache-control": "no-store" } }
    );
  }
  const requestedSources = sourceValues as SourceId[];
  const requestedIds = parseRequestedDealIds(url.searchParams);
  if (!requestedIds) {
    return NextResponse.json(
      { ok: false, error: "invalid_ids", requestId: id },
      { status: 400, headers: { "x-request-id": id, "cache-control": "no-store" } }
    );
  }
  const scope = url.searchParams.get("scope") ?? "feed";
  if (scope !== "feed" && scope !== "archive") {
    return NextResponse.json(
      { ok: false, error: "invalid_scope", requestId: id },
      { status: 400, headers: { "x-request-id": id, "cache-control": "no-store" } }
    );
  }
  if (scope === "archive" && !requestedIds.length && !canViewAdminData(request)) {
    return NextResponse.json(
      { ok: false, error: "archive_requires_admin_or_ids", requestId: id },
      { status: 401, headers: { "x-request-id": id, "cache-control": "no-store" } }
    );
  }
  const refresh = url.searchParams.get("refresh") === "1" && process.env.NODE_ENV !== "production";
  try {
    let store = await readStore();

    if (refresh || (isRequestCrawlEnabled() && isCrawlDue(store.runs))) {
      try {
        await runCrawl(refresh && requestedSources.length ? requestedSources : undefined, {
          trigger: refresh ? "development" : "bootstrap",
          requestId: id
        });
      } catch (error) {
        if (!(error instanceof CrawlAlreadyRunningError)) throw error;
      }
      store = await readStore();
    }

    const sourceDeals = requestedSources.length
      ? store.deals.filter((deal) => requestedSources.includes(deal.source))
      : store.deals;
    const targetedDeals = requestedIds.length
      ? sourceDeals.filter((deal) => requestedIds.includes(deal.id))
      : sourceDeals;
    const asOf = new Date().toISOString();
    const deals = scope === "feed"
      ? selectFeedDeals(targetedDeals, { now: new Date(asOf).getTime() })
      : targetedDeals;
    const cacheControl = refresh ? "no-store" : "public, s-maxage=60, stale-while-revalidate=300";

    return NextResponse.json({
      deals,
      sources: latestSourceHealth(store.runs),
      lastRun: latestCompletedFullRun(store.runs) ?? null,
      clickCount: clickCount(store),
      asOf,
      requestId: id
    }, { headers: { "x-request-id": id, "cache-control": cacheControl } });
  } catch (error) {
    logEvent("error", "deals_api_failed", { requestId: id, error: operationalError(error) });
    return NextResponse.json(
      { ok: false, error: "deals_unavailable", requestId: id },
      { status: 503, headers: { "x-request-id": id, "cache-control": "no-store" } }
    );
  }
}
