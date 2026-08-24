import { NextResponse } from "next/server";
import { requestId } from "@/lib/crawlers/run";
import { backendHealth } from "@/lib/server/health";
import { logEvent, operationalError } from "@/lib/server/log";
import { readStore, storageBackend } from "@/lib/store/file-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const id = requestId();
  const headers = { "x-request-id": id, "cache-control": "no-store" };
  try {
    const health = backendHealth(await readStore());
    return NextResponse.json({ ...health, checkedAt: new Date().toISOString(), requestId: id }, {
      status: health.ok ? 200 : 503,
      headers
    });
  } catch (error) {
    logEvent("error", "health_check_failed", { requestId: id, error: operationalError(error) });
    return NextResponse.json({
      ok: false,
      status: "storage_unavailable",
      storage: { backend: storageBackend(), ready: false },
      checkedAt: new Date().toISOString(),
      requestId: id
    }, { status: 503, headers });
  }
}
