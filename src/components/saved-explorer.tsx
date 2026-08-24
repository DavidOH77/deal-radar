"use client";

import { useMemo } from "react";
import type { DealsResponse } from "@/lib/deals/contracts";
import { countAlertMatches } from "@/lib/deals/preferences";
import { calculateDisplayRankingScore } from "@/lib/deals/scoring";
import { InterestPanel } from "./interest-panel";
import { useDealPreferences } from "./use-deal-preferences";

export function SavedExplorer({ initialData }: { initialData: DealsResponse }) {
  const {
    alerts,
    savedDealIds,
    addAlert,
    removeAlert,
    toggleAlert,
    toggleSaved
  } = useDealPreferences(initialData.deals);

  const savedDeals = useMemo(() => {
    const saved = new Set(savedDealIds);
    const rankingTime = new Date(initialData.asOf).getTime();
    return initialData.deals
      .filter((deal) => saved.has(deal.id))
      .sort((a, b) => calculateDisplayRankingScore(b, rankingTime) - calculateDisplayRankingScore(a, rankingTime));
  }, [initialData.asOf, initialData.deals, savedDealIds]);

  const matchCount = useMemo(
    () => countAlertMatches(initialData.deals, alerts),
    [alerts, initialData.deals]
  );

  return (
    <>
      <section className="page-heading saved-heading">
        <div>
          <h1>관심딜</h1>
          <p>원하는 상품과 가격을 저장해 한곳에서 확인하세요.</p>
        </div>
        {matchCount ? <span className="match-count">지금 {matchCount}건 매칭</span> : null}
      </section>
      <InterestPanel
        deals={initialData.deals}
        alerts={alerts}
        savedDeals={savedDeals}
        referenceTime={initialData.asOf}
        onAddAlert={addAlert}
        onToggleAlert={toggleAlert}
        onRemoveAlert={removeAlert}
        onToggleSaved={toggleSaved}
      />
    </>
  );
}
