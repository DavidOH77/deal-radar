"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DealsResponse } from "@/lib/deals/contracts";
import { MAX_REQUESTED_DEAL_IDS } from "@/lib/deals/query";
import type { Deal } from "@/lib/deals/types";

function chunks<T>(values: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, (index + 1) * size)
  );
}

export function useRelevantDeals(initialData: DealsResponse, targetIds: string[]): Deal[] {
  const [additionalDeals, setAdditionalDeals] = useState<Deal[]>([]);
  const attemptedIds = useRef(new Set<string>());
  const targetKey = [...new Set(targetIds)].sort().join(",");
  const deals = useMemo(() => {
    const merged = new Map(initialData.deals.map((deal) => [deal.id, deal]));
    additionalDeals.forEach((deal) => merged.set(deal.id, deal));
    return [...merged.values()];
  }, [additionalDeals, initialData.deals]);
  const knownIds = useMemo(() => new Set(deals.map((deal) => deal.id)), [deals]);

  useEffect(() => {
    const missingIds = targetKey
      .split(",")
      .filter(Boolean)
      .filter((id) => !knownIds.has(id) && !attemptedIds.current.has(id));
    if (!missingIds.length) return;
    missingIds.forEach((id) => attemptedIds.current.add(id));

    const controller = new AbortController();
    void Promise.all(chunks(missingIds, MAX_REQUESTED_DEAL_IDS).map(async (ids) => {
      const params = new URLSearchParams({ scope: "archive" });
      ids.forEach((id) => params.append("id", id));
      const response = await fetch(`/api/deals?${params}`, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json() as DealsResponse).deals;
    })).then((batches) => {
      setAdditionalDeals((current) => {
        const merged = new Map(current.map((deal) => [deal.id, deal]));
        batches.flat().forEach((deal) => merged.set(deal.id, deal));
        return [...merged.values()];
      });
    }).catch(() => {
      if (!controller.signal.aborted) missingIds.forEach((id) => attemptedIds.current.delete(id));
    });

    return () => controller.abort();
  }, [knownIds, targetKey]);

  return deals;
}
