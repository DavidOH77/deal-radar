import { describe, expect, it } from "vitest";
import type { RawDeal } from "@/lib/deals/types";
import { buildSourcePostObservation } from "./build-observation";

const raw: RawDeal = {
  source: "ppomppu",
  sourceMode: "public_page",
  sourceDealId: "123",
  title: "[쿠팡] 테스트 생수 2L 12개 (9,900원/무료배송)",
  sourceUrl: "https://www.ppomppu.co.kr/zboard/view.php?id=ppomppu&no=123",
  productUrl: "https://www.coupang.com/vp/products/456",
  publishedAt: "2026-09-07T00:00:00.000Z",
  collectedAt: "2026-09-07T01:00:00.000Z",
  reactions: { likes: 12, comments: 3, views: 1_200 }
};

describe("buildSourcePostObservation", () => {
  it("creates a stable post identity across repeated observations", () => {
    const first = buildSourcePostObservation(raw, "crawl-a");
    const second = buildSourcePostObservation({ ...raw, collectedAt: "2026-09-07T02:00:00.000Z" }, "crawl-b");

    expect(first.sourcePostId).toBe(second.sourcePostId);
    expect(first.idempotencyKey).not.toBe(second.idempotencyKey);
    expect(first.destinationHost).toBe("www.coupang.com");
  });

  it("deduplicates an identical observation and normalizes reaction names", () => {
    const first = buildSourcePostObservation(raw, "crawl-a");
    const retry = buildSourcePostObservation(raw, "crawl-a");

    expect(first.idempotencyKey).toBe(retry.idempotencyKey);
    expect(first.reactions).toEqual({ recommendations: 12, comments: 3, views: 1_200, purchases: undefined });
    expect(first.listedPriceAmount).toBe(9_900);
  });
});
