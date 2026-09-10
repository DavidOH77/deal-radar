import { NextResponse } from "next/server";
import { isSafeOutboundUrl } from "@/lib/deals/affiliate";
import { findDeal } from "@/lib/store/file-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const deal = await findDeal(id);
  if (!deal || !isSafeOutboundUrl(deal.sourceUrl)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const response = NextResponse.redirect(deal.sourceUrl, 307);
  response.headers.set("cache-control", "private, no-store");
  return response;
}
