import { NextResponse } from "next/server";
import { latestSourceHealth } from "@/lib/crawlers/health";
import { requestId } from "@/lib/crawlers/run";
import { affiliateConfigurationStatus } from "@/lib/deals/affiliate";
import { canViewAdminData } from "@/lib/server/auth";
import { logEvent, operationalError } from "@/lib/server/log";
import { readStore } from "@/lib/store/file-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = requestId();
  const headers = { "x-request-id": id, "cache-control": "no-store" };
  if (!canViewAdminData(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized", requestId: id }, { status: 401, headers });
  }
  try {
    const store = await readStore();
    return NextResponse.json({
      sources: latestSourceHealth(store.runs),
      runs: store.runs.slice(0, 20),
      activeLease: store.crawlLease ?? null,
      affiliates: affiliateConfigurationStatus(),
      requestId: id
    }, { headers });
  } catch (error) {
    logEvent("error", "sources_api_failed", { requestId: id, error: operationalError(error) });
    return NextResponse.json({ ok: false, error: "sources_unavailable", requestId: id }, { status: 503, headers });
  }
}
