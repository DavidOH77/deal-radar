import { describe, expect, it } from "vitest";
import type { PriceSnapshot, RawDeal } from "./types";
import { calculateBaseline, calculateDisplayRankingScore, calculateRankingScore, explainRanking, scoreDeal } from "./scoring";

const now = new Date("2026-08-22T12:00:00.000Z");
const raw: RawDeal = {
  source: "coupang",
  sourceMode: "official_api",
  sourceDealId: "123",
  title: "테스트 생수 2L 12병",
  sourceUrl: "https://example.com/123",
  dealPrice: { amount: 10_000, currency: "KRW" },
  publishedAt: now.toISOString(),
  reactions: { purchases: 300 },
  collectedAt: now.toISOString()
};

function snapshot(daysAgo: number, amount: number): PriceSnapshot {
  return {
    canonicalKey: "key",
    source: "coupang",
    sourceDealId: "123",
    amount,
    observedAt: new Date(now.getTime() - daysAgo * 86_400_000).toISOString()
  };
}

describe("calculateBaseline", () => {
  it("does not trust repeated snapshots collected within one day", () => {
    const snapshots = [snapshot(0, 10_000), snapshot(0.1, 12_000), snapshot(0.2, 11_000)];
    expect(calculateBaseline(raw, "key", snapshots, now.getTime()).kind).toBe("unknown");
  });

  it("uses a 90-day median after observations span at least one day", () => {
    const baseline = calculateBaseline(
      raw,
      "key",
      [snapshot(0, 10_000), snapshot(2, 12_000), snapshot(5, 11_000)],
      now.getTime()
    );
    expect(baseline).toMatchObject({ amount: 11_000, kind: "history_90d", confidence: "medium" });
  });
});

describe("scoreDeal", () => {
  it("keeps unknown-baseline deals in watch state", () => {
    const score = scoreDeal(raw, {
      kind: "unknown",
      confidence: "unknown",
      sampleSize: 0,
      label: "기준가 수집 중"
    }, now.getTime());
    expect(score.total).toBeLessThanOrEqual(49);
    expect(score.tier).toBe("WATCH");
  });

  it("does not award an S tier from a seller's crossed-out price", () => {
    const score = scoreDeal(raw, {
      amount: 20_000,
      kind: "seller_reference",
      confidence: "low",
      sampleSize: 1,
      label: "판매처 표시가"
    }, now.getTime());
    expect(score.total).toBeLessThanOrEqual(64);
    expect(score.tier).not.toBe("S");
  });
});

describe("calculateRankingScore", () => {
  it("lets a recent active deal outrank a stale high-traffic deal", () => {
    const recent: RawDeal = {
      ...raw,
      publishedAt: new Date(now.getTime() - 2 * 3_600_000).toISOString(),
      reactions: { views: 1_200, likes: 32, comments: 9 }
    };
    const stale: RawDeal = {
      ...raw,
      publishedAt: new Date(now.getTime() - 48 * 3_600_000).toISOString(),
      reactions: { views: 50_000, likes: 600, comments: 120 }
    };

    expect(calculateRankingScore(recent, now.getTime()))
      .toBeGreaterThan(calculateRankingScore(stale, now.getTime()));
  });

  it("values recommendations more than passive views at the same age", () => {
    const viewOnly: RawDeal = {
      ...raw,
      publishedAt: new Date(now.getTime() - 3_600_000).toISOString(),
      reactions: { views: 1_000_000 }
    };
    const recommended: RawDeal = {
      ...raw,
      publishedAt: viewOnly.publishedAt,
      reactions: { views: 500, likes: 1 }
    };

    expect(calculateRankingScore(recommended, now.getTime()))
      .toBeGreaterThan(calculateRankingScore(viewOnly, now.getTime()));
  });

  it("keeps one recommendation above any amount of passive activity in the feed window", () => {
    const recommended: RawDeal = {
      ...raw,
      publishedAt: new Date(now.getTime() - 47 * 3_600_000).toISOString(),
      reactions: { likes: 1 }
    };
    const passiveSpike = {
      ...raw,
      publishedAt: now.toISOString(),
      reactions: { views: 10_000_000, comments: 100_000 },
      trend: {
        windowMinutes: 60,
        viewsDelta: 1_000_000,
        likesDelta: 0,
        commentsDelta: 100_000,
        purchasesDelta: 0,
        velocity: 1_000_000,
        rising: true,
        measuredAt: now.toISOString()
      }
    };

    expect(calculateDisplayRankingScore(recommended, now.getTime()))
      .toBeGreaterThan(calculateDisplayRankingScore(passiveSpike, now.getTime()));
  });

  it("preserves a meaningful recommendation-count lead across nearby ages", () => {
    const stronglyRecommended: RawDeal = {
      ...raw,
      publishedAt: new Date(now.getTime() - 8 * 3_600_000).toISOString(),
      reactions: { likes: 80 }
    };
    const fresherButWeak: RawDeal = {
      ...raw,
      publishedAt: new Date(now.getTime() - 4 * 3_600_000).toISOString(),
      reactions: { likes: 15 }
    };

    expect(calculateRankingScore(stronglyRecommended, now.getTime()))
      .toBeGreaterThan(calculateRankingScore(fresherButWeak, now.getTime()));
  });

  it("decays the same engagement as time passes", () => {
    const scoreNow = calculateRankingScore(raw, now.getTime());
    const scoreTomorrow = calculateRankingScore(raw, now.getTime() + 24 * 3_600_000);
    expect(scoreNow).toBeGreaterThan(scoreTomorrow);
  });

  it("demotes deals sharply after the same-day freshness window", () => {
    const eighteenHours = calculateRankingScore(raw, now.getTime() + 18 * 3_600_000);
    const twentySixHours = calculateRankingScore(raw, now.getTime() + 26 * 3_600_000);
    const fortyTwoHours = calculateRankingScore(raw, now.getTime() + 42 * 3_600_000);

    expect(twentySixHours).toBeLessThan(eighteenHours * 0.45);
    expect(fortyTwoHours).toBeLessThan(eighteenHours * 0.08);
  });

  it("adds a bounded boost when reactions are rising between crawls", () => {
    const stable = { ...raw, trend: undefined };
    const rising = {
      ...raw,
      trend: {
        windowMinutes: 60,
        viewsDelta: 1_000,
        likesDelta: 10,
        commentsDelta: 3,
        purchasesDelta: 0,
        velocity: 80,
        rising: true,
        measuredAt: now.toISOString()
      }
    };
    expect(calculateDisplayRankingScore(rising, now.getTime()))
      .toBeGreaterThan(calculateDisplayRankingScore(stable, now.getTime()));
  });

  it("does not let an old rising flag bypass freshness decay", () => {
    const trend = {
      windowMinutes: 60,
      viewsDelta: 1_000,
      likesDelta: 10,
      commentsDelta: 3,
      purchasesDelta: 0,
      velocity: 80,
      rising: true,
      measuredAt: now.toISOString()
    };
    const recent = { ...raw, trend, publishedAt: new Date(now.getTime() - 2 * 3_600_000).toISOString() };
    const old = { ...raw, trend, publishedAt: new Date(now.getTime() - 42 * 3_600_000).toISOString() };
    const recentBoost = calculateDisplayRankingScore(recent, now.getTime()) - calculateRankingScore(recent, now.getTime());
    const oldBoost = calculateDisplayRankingScore(old, now.getTime()) - calculateRankingScore(old, now.getTime());

    expect(oldBoost).toBeLessThan(recentBoost * 0.13);
  });
});

describe("explainRanking", () => {
  it("explains a verified discount before engagement", () => {
    expect(explainRanking({
      ...raw,
      baseline: { amount: 12_000, kind: "history_90d", confidence: "medium", sampleSize: 4, label: "최근 기준가" },
      score: { total: 80, price: 80, reaction: 50, trust: 70, urgency: 60, tier: "A", discountRate: 0.18 }
    }, [raw], now.getTime())).toBe("최근 기준가보다 18% 저렴");
  });

  it("falls back to explicit reaction labels", () => {
    expect(explainRanking({ ...raw, reactions: { views: 2_121, comments: 6 } }, [raw], now.getTime()))
      .toBe("댓글 6 · 조회 2,121");
  });
});
