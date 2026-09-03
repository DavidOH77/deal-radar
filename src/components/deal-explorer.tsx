"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { DealsResponse } from "@/lib/deals/contracts";
import { compareRecommendations } from "@/lib/deals/feed";
import { DISPLAY_CATEGORIES, displayCategory, relativeTime } from "@/lib/deals/presentation";
import { dedupeDealsForDisplay } from "@/lib/deals/quality";
import { calculateDisplayRankingScore, explainRanking } from "@/lib/deals/scoring";
import { DealCard } from "./deal-card";
import { MaterialIcon } from "./material-icon";
import { useDealPreferences } from "./use-deal-preferences";

type Sort = "hot" | "recommendation" | "new";

const SORTS: Array<{ id: Sort; label: string }> = [
  { id: "hot", label: "인기순" },
  { id: "recommendation", label: "추천순" },
  { id: "new", label: "최신순" }
];

const INITIAL_VISIBLE_DEALS = 40;
const LOAD_MORE_DEALS = 40;

export function DealExplorer({ initialData }: { initialData: DealsResponse }) {
  const [data, setData] = useState(initialData);
  const [sort, setSort] = useState<Sort>("hot");
  const [category, setCategory] = useState("전체");
  const [query, setQuery] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_VISIBLE_DEALS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const { savedDealIds, toggleSaved } = useDealPreferences(data.deals);

  const loadDeals = useCallback(async ({ force = false, quiet = false }: { force?: boolean; quiet?: boolean } = {}) => {
    if (!quiet) {
      setError(undefined);
      setLoading(true);
    }
    try {
      const response = await fetch(force ? "/api/deals?refresh=1" : "/api/deals", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const nextData = (await response.json()) as DealsResponse;
      startTransition(() => {
        setData(nextData);
        if (!quiet) setVisibleLimit(INITIAL_VISIBLE_DEALS);
      });
    } catch (cause) {
      if (!quiet) setError(cause instanceof Error ? cause.message : "데이터를 불러오지 못했습니다.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const syncVisiblePage = () => {
      if (document.visibilityState === "visible") void loadDeals({ quiet: true });
    };
    const interval = window.setInterval(syncVisiblePage, 60_000);
    document.addEventListener("visibilitychange", syncVisiblePage);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", syncVisiblePage);
    };
  }, [loadDeals]);

  const visibleDeals = useMemo(() => {
    const rankingTime = new Date(data.asOf).getTime();
    const normalizedQuery = query.trim().normalize("NFKC").toLowerCase();
    const filtered = data.deals.filter((deal) => {
      if (deal.normalizedTitle === "list_adsense" || deal.sourceUrl.includes("/adlink_")) return false;
      if (category !== "전체" && displayCategory(deal) !== category) return false;
      return !normalizedQuery || `${deal.normalizedTitle} ${deal.title}`.normalize("NFKC").toLowerCase().includes(normalizedQuery);
    });

    const sorted = filtered.sort((a, b) => {
      if (sort === "recommendation") return compareRecommendations(a, b);
      if (sort === "new") return b.publishedAt.localeCompare(a.publishedAt);
      return calculateDisplayRankingScore(b, rankingTime) - calculateDisplayRankingScore(a, rankingTime) ||
        b.score.total - a.score.total ||
        b.publishedAt.localeCompare(a.publishedAt);
    });
    return dedupeDealsForDisplay(sorted, rankingTime);
  }, [category, data.asOf, data.deals, query, sort]);
  const renderedDeals = visibleDeals.slice(0, visibleLimit);
  const featuredDeal = renderedDeals[0]?.dealPrice?.amount ? renderedDeals[0] : undefined;
  const compactDeals = featuredDeal ? renderedDeals.slice(1) : renderedDeals;
  const remainingDeals = Math.max(0, visibleDeals.length - renderedDeals.length);

  const freshness = data.lastRun
    ? `${relativeTime(data.lastRun.finishedAt, data.asOf)} 업데이트`
    : "업데이트 준비 중";

  return (
    <>
      <section className="overview">
        <h1>지금 뜨는 딜</h1>
        <span className="freshness"><i aria-hidden="true" />{freshness}</span>
      </section>

      <section className="filter-panel" aria-label="핫딜 필터">
        <div className="controls">
          <label className="search-box">
            <MaterialIcon name="search" size={19} />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setVisibleLimit(INITIAL_VISIBLE_DEALS);
              }}
              placeholder="상품명 검색"
              aria-label="상품명 검색"
            />
            {query ? (
              <button className="search-clear" type="button" onClick={() => {
                setQuery("");
                setVisibleLimit(INITIAL_VISIBLE_DEALS);
              }} aria-label="검색어 지우기">
                <MaterialIcon name="close" size={17} />
              </button>
            ) : null}
          </label>

          <label className="select-wrap">
            <span className="sr-only">카테고리</span>
            <select value={category} onChange={(event) => {
              setCategory(event.target.value);
              setVisibleLimit(INITIAL_VISIBLE_DEALS);
            }} aria-label="카테고리">
              <option>전체</option>
              {DISPLAY_CATEGORIES.map((value) => <option key={value}>{value}</option>)}
            </select>
            <MaterialIcon name="expand_more" size={18} />
          </label>

          <label className="select-wrap sort-select">
            <span className="sr-only">정렬</span>
            <select value={sort} onChange={(event) => {
              setSort(event.target.value as Sort);
              setVisibleLimit(INITIAL_VISIBLE_DEALS);
            }} aria-label="정렬">
              {SORTS.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
            </select>
            <MaterialIcon name="expand_more" size={18} />
          </label>

          <button
            className="icon-button refresh-button"
            onClick={() => void loadDeals({ force: true })}
            disabled={loading || isPending}
            title="지금 업데이트"
            aria-label="지금 업데이트"
          >
            <MaterialIcon name="refresh" size={19} className={loading ? "spin" : ""} />
          </button>
        </div>

      </section>

      {error ? <div className="error-banner" role="alert">업데이트하지 못했습니다. {error}</div> : null}

      <div className="deal-grid" aria-live="polite">
        {featuredDeal ? (
          <DealCard
            key={featuredDeal.id}
            deal={featuredDeal}
            referenceTime={data.asOf}
            eager
            rank={1}
            featured
            reason={explainRanking(featuredDeal, visibleDeals, new Date(data.asOf).getTime())}
            saved={savedDealIds.includes(featuredDeal.id)}
            onToggleSaved={toggleSaved}
          />
        ) : null}
        {compactDeals.map((deal, index) => (
          <DealCard
            key={deal.id}
            deal={deal}
            referenceTime={data.asOf}
            rank={index + (featuredDeal ? 2 : 1)}
            saved={savedDealIds.includes(deal.id)}
            onToggleSaved={toggleSaved}
          />
        ))}
        {!visibleDeals.length ? (
          <div className="empty-state">
            <MaterialIcon name="search_off" size={24} />
            <strong>조건에 맞는 딜이 없습니다</strong>
            <button type="button" onClick={() => {
              setQuery("");
              setCategory("전체");
              setVisibleLimit(INITIAL_VISIBLE_DEALS);
            }}>
              필터 초기화
            </button>
          </div>
        ) : null}
        {remainingDeals ? (
          <div className="deal-list-footer">
            <span>{renderedDeals.length.toLocaleString("ko-KR")} / {visibleDeals.length.toLocaleString("ko-KR")}개 표시</span>
            <button type="button" onClick={() => setVisibleLimit((current) => current + LOAD_MORE_DEALS)}>
              다음 {Math.min(LOAD_MORE_DEALS, remainingDeals).toLocaleString("ko-KR")}개 보기
              <MaterialIcon name="expand_more" size={18} />
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
