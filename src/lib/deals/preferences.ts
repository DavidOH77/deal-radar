import type { Deal } from "./types";
import { presentDeal } from "./presentation";

export interface DealAlert {
  id: string;
  keyword: string;
  maxPrice?: number;
  enabled: boolean;
  createdAt: string;
}

export interface DealNotification {
  id: string;
  alertId: string;
  dealId: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

function normalizeKeyword(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase();
}

export function matchesDealAlert(deal: Deal, alert: DealAlert): boolean {
  if (!alert.enabled) return false;

  const keyword = normalizeKeyword(alert.keyword);
  if (!keyword || !normalizeKeyword(deal.title).includes(keyword)) return false;

  if (alert.maxPrice !== undefined) {
    const price = deal.dealPrice?.amount;
    if (price === undefined || price > alert.maxPrice) return false;
  }

  return true;
}

export function countAlertMatches(deals: Deal[], alerts: DealAlert[]): number {
  return new Set(
    deals
      .filter((deal) => alerts.some((alert) => matchesDealAlert(deal, alert)))
      .map((deal) => deal.id)
  ).size;
}

export function syncDealNotifications(
  deals: Deal[],
  alerts: DealAlert[],
  current: DealNotification[]
): DealNotification[] {
  const notifications = new Map(current.map((notification) => [notification.id, notification]));

  for (const alert of alerts) {
    if (!alert.enabled) continue;
    for (const deal of deals) {
      if (new Date(deal.publishedAt).getTime() < new Date(alert.createdAt).getTime()) continue;
      if (!matchesDealAlert(deal, alert)) continue;
      const id = `${alert.id}:${deal.id}`;
      if (notifications.has(id)) continue;
      const presented = presentDeal(deal);
      notifications.set(id, {
        id,
        alertId: alert.id,
        dealId: deal.id,
        title: presented.title,
        message: alert.maxPrice
          ? `${alert.keyword} · ${alert.maxPrice.toLocaleString("ko-KR")}원 이하 조건과 일치`
          : `${alert.keyword} 관심 조건과 일치`,
        createdAt: deal.publishedAt,
        read: false
      });
    }
  }

  return [...notifications.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100);
}
