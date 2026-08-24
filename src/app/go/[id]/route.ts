import { after, NextResponse } from "next/server";
import { buildAffiliateUrl, isSafeOutboundUrl } from "@/lib/deals/affiliate";
import { findDeal, recordClick } from "@/lib/store/file-store";
import { logEvent, operationalError } from "@/lib/server/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const deal = await findDeal(id);
  if (!deal) return NextResponse.redirect(new URL("/", _request.url));

  const outbound = buildAffiliateUrl(deal);
  if (!isSafeOutboundUrl(outbound.url)) {
    return NextResponse.redirect(new URL("/", _request.url));
  }
  after(async () => {
    try {
      await recordClick({
        dealId: deal.id,
        source: deal.source,
        clickedAt: new Date().toISOString(),
        affiliate: outbound.affiliate
      });
    } catch (error) {
      logEvent("error", "click_record_failed", {
        dealId: deal.id,
        source: deal.source,
        error: operationalError(error)
      });
    }
  });
  const response = NextResponse.redirect(outbound.url, 307);
  response.headers.set("cache-control", "private, no-store");
  return response;
}
