"use client";

import { useEffect, useState } from "react";
import { syncDealNotifications, type DealAlert, type DealNotification } from "@/lib/deals/preferences";
import type { Deal } from "@/lib/deals/types";

const SAVED_DEALS_KEY = "deal-radar:saved-deal-ids";
const ALERTS_KEY = "deal-radar:alerts";
export const NOTIFICATIONS_KEY = "deal-radar:notifications";
export const PREFERENCES_EVENT = "deal-radar:preferences";

function isDealAlert(value: unknown): value is DealAlert {
  return typeof value === "object" && value !== null &&
    typeof (value as DealAlert).id === "string" &&
    typeof (value as DealAlert).keyword === "string" &&
    typeof (value as DealAlert).enabled === "boolean";
}

export function useDealPreferences(deals: Deal[] = []) {
  const [savedDealIds, setSavedDealIds] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<DealAlert[]>([]);
  const [notifications, setNotifications] = useState<DealNotification[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const storedSaved = JSON.parse(window.localStorage.getItem(SAVED_DEALS_KEY) ?? "[]") as unknown;
        const storedAlerts = JSON.parse(window.localStorage.getItem(ALERTS_KEY) ?? "[]") as unknown;
        const storedNotifications = JSON.parse(window.localStorage.getItem(NOTIFICATIONS_KEY) ?? "[]") as unknown;
        if (Array.isArray(storedSaved)) {
          setSavedDealIds(storedSaved.filter((id): id is string => typeof id === "string"));
        }
        if (Array.isArray(storedAlerts)) setAlerts(storedAlerts.filter(isDealAlert));
        if (Array.isArray(storedNotifications)) {
          setNotifications(storedNotifications.filter((item): item is DealNotification => (
            typeof item === "object" && item !== null &&
            typeof (item as DealNotification).id === "string" &&
            typeof (item as DealNotification).dealId === "string" &&
            typeof (item as DealNotification).read === "boolean"
          )));
        }
      } catch {
        setSavedDealIds([]);
        setAlerts([]);
      } finally {
        setLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (loaded) window.localStorage.setItem(SAVED_DEALS_KEY, JSON.stringify(savedDealIds));
  }, [loaded, savedDealIds]);

  useEffect(() => {
    if (loaded) window.localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
  }, [alerts, loaded]);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent(PREFERENCES_EVENT));
  }, [loaded, notifications]);

  useEffect(() => {
    if (!loaded || !deals.length) return;
    const timeout = window.setTimeout(() => {
      setNotifications((current) => syncDealNotifications(deals, alerts, current));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [alerts, deals, loaded]);

  function toggleSaved(dealId: string) {
    setSavedDealIds((current) => current.includes(dealId)
      ? current.filter((id) => id !== dealId)
      : [dealId, ...current]);
  }

  function addAlert(keyword: string, maxPrice?: number) {
    setAlerts((current) => [{
      id: crypto.randomUUID(),
      keyword,
      maxPrice,
      enabled: true,
      createdAt: new Date().toISOString()
    }, ...current]);
  }

  function toggleAlert(id: string) {
    setAlerts((current) => current.map((alert) => alert.id === id
      ? { ...alert, enabled: !alert.enabled }
      : alert));
  }

  function removeAlert(id: string) {
    setAlerts((current) => current.filter((alert) => alert.id !== id));
  }

  function markNotificationRead(id: string) {
    setNotifications((current) => current.map((notification) => notification.id === id
      ? { ...notification, read: true }
      : notification));
  }

  function markAllNotificationsRead() {
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  }

  return {
    alerts,
    loaded,
    notifications,
    savedDealIds,
    addAlert,
    removeAlert,
    markAllNotificationsRead,
    markNotificationRead,
    toggleAlert,
    toggleSaved
  };
}
