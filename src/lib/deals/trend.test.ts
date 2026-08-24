import { describe, expect, it } from "vitest";
import { calculateDealTrend, trendReason } from "./trend";

describe("deal trend", () => {
  it("calculates engagement deltas over a meaningful crawl window", () => {
    const trend = calculateDealTrend({
      collectedAt: "2026-08-24T00:00:00.000Z",
      reactions: { views: 1_000, likes: 10, comments: 2 }
    }, {
      collectedAt: "2026-08-24T01:00:00.000Z",
      reactions: { views: 2_000, likes: 18, comments: 7 }
    });
    expect(trend).toMatchObject({ windowMinutes: 60, viewsDelta: 1_000, likesDelta: 8, commentsDelta: 5, rising: true });
    expect(trendReason(trend)).toBe("최근 1시간 추천 +8 · 댓글 +5");
  });

  it("does not mark view-only growth as rising", () => {
    const trend = calculateDealTrend({
      collectedAt: "2026-08-24T00:00:00.000Z",
      reactions: { views: 1_000, likes: 0, comments: 0 }
    }, {
      collectedAt: "2026-08-24T01:00:00.000Z",
      reactions: { views: 100_000, likes: 0, comments: 0 }
    });

    expect(trend).toMatchObject({ viewsDelta: 99_000, velocity: 0, rising: false });
  });

  it("keeps the last trend when a manual refresh happens too soon", () => {
    const previousTrend = {
      windowMinutes: 60,
      viewsDelta: 500,
      likesDelta: 3,
      commentsDelta: 1,
      purchasesDelta: 0,
      velocity: 30,
      rising: true,
      measuredAt: "2026-08-24T01:00:00.000Z"
    };
    expect(calculateDealTrend({
      collectedAt: "2026-08-24T01:00:00.000Z",
      reactions: { views: 1_500 },
      trend: previousTrend
    }, {
      collectedAt: "2026-08-24T01:05:00.000Z",
      reactions: { views: 1_510 }
    })).toEqual(previousTrend);
  });
});
