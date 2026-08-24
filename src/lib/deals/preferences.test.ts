import { describe, expect, it } from "vitest";
import { countAlertMatches, matchesDealAlert, syncDealNotifications, type DealAlert } from "./preferences";
import type { Deal } from "./types";

function deal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: "deal-1",
    canonicalKey: "canonical-1",
    normalizedTitle: "삼성 외장 ssd 1tb",
    source: "coupang",
    sourceMode: "official_api",
    sourceDealId: "1",
    title: "삼성 외장 SSD 1TB 특가",
    sourceUrl: "https://example.com/source",
    publishedAt: "2026-08-23T00:00:00.000Z",
    dealPrice: { amount: 89_000, currency: "KRW" },
    reactions: {},
    collectedAt: "2026-08-23T00:00:00.000Z",
    baseline: { kind: "unknown", confidence: "unknown", sampleSize: 0, label: "기준가 수집 중" },
    score: { total: 50, price: 50, reaction: 50, trust: 50, urgency: 50, tier: "B" },
    outboundUrl: "https://example.com/out",
    ...overrides
  };
}

function alert(overrides: Partial<DealAlert> = {}): DealAlert {
  return {
    id: "alert-1",
    keyword: "ssd",
    enabled: true,
    createdAt: "2026-08-23T00:00:00.000Z",
    ...overrides
  };
}

describe("deal interest preferences", () => {
  it("matches a keyword regardless of casing", () => {
    expect(matchesDealAlert(deal(), alert({ keyword: "SSD" }))).toBe(true);
  });

  it("applies a maximum price condition", () => {
    expect(matchesDealAlert(deal(), alert({ maxPrice: 90_000 }))).toBe(true);
    expect(matchesDealAlert(deal(), alert({ maxPrice: 80_000 }))).toBe(false);
    expect(matchesDealAlert(deal({ dealPrice: undefined }), alert({ maxPrice: 90_000 }))).toBe(false);
  });

  it("ignores disabled rules and counts each matching deal once", () => {
    const deals = [deal(), deal({ id: "deal-2", title: "SSD 파우치" })];
    const alerts = [alert(), alert({ id: "alert-2", keyword: "삼성" }), alert({ id: "alert-3", enabled: false })];
    expect(countAlertMatches(deals, alerts)).toBe(2);
  });

  it("creates one unread event only for deals published after the alert", () => {
    const notifications = syncDealNotifications([
      deal({ publishedAt: "2026-08-23T01:00:00.000Z" }),
      deal({ id: "old", publishedAt: "2026-08-22T23:00:00.000Z" })
    ], [alert()], []);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({ dealId: "deal-1", read: false });
    expect(syncDealNotifications([deal({ publishedAt: "2026-08-23T01:00:00.000Z" })], [alert()], notifications)).toHaveLength(1);
  });
});
