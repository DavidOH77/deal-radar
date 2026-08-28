"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { DealsResponse } from "@/lib/deals/contracts";
import { relativeTime } from "@/lib/deals/presentation";
import { dealDetailPath } from "@/lib/deals/routing";
import { MaterialIcon } from "./material-icon";
import { useDealPreferences } from "./use-deal-preferences";
import { useRelevantDeals } from "./use-relevant-deals";

export function NotificationExplorer({ initialData }: { initialData: DealsResponse }) {
  const {
    notifications,
    markAllNotificationsRead,
    markNotificationRead
  } = useDealPreferences(initialData.deals);
  const relevantDeals = useRelevantDeals(initialData, notifications.map((notification) => notification.dealId));
  const dealMap = useMemo(() => new Map(relevantDeals.map((deal) => [deal.id, deal])), [relevantDeals]);
  const visible = notifications.filter((notification) => dealMap.has(notification.dealId));
  const unread = visible.filter((notification) => !notification.read).length;

  return (
    <>
      <section className="page-heading">
        <div>
          <h1>알림함</h1>
          <p>관심 조건과 일치한 새 딜을 모아봅니다.</p>
        </div>
        {unread ? (
          <button className="text-button" type="button" onClick={markAllNotificationsRead}>모두 읽음</button>
        ) : null}
      </section>

      <section className="notification-panel" aria-label="관심딜 알림">
        <div className="notification-channel-state">
          <span><i aria-hidden="true" /> 앱 안 알림</span>
          <b>외부 알림 미연결</b>
        </div>
        {visible.length ? (
          <div className="notification-list">
            {visible.map((notification) => {
              const deal = dealMap.get(notification.dealId)!;
              return (
                <Link
                  className={`notification-row ${notification.read ? "" : "is-unread"}`}
                  href={dealDetailPath(deal)}
                  key={notification.id}
                  onClick={() => markNotificationRead(notification.id)}
                >
                  <span className="notification-icon"><MaterialIcon name="notifications" size={19} filled={!notification.read} /></span>
                  <span className="notification-copy">
                    <strong>{notification.title}</strong>
                    <small>{notification.message}</small>
                  </span>
                  <time>{relativeTime(notification.createdAt, initialData.asOf)}</time>
                  {!notification.read ? <i className="unread-dot" aria-label="읽지 않음" /> : null}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="notification-empty">
            <MaterialIcon name="notifications" size={24} />
            <strong>새 알림이 없습니다</strong>
            <p>관심 조건을 등록하면 이후에 올라온 매칭 딜이 여기에 쌓입니다.</p>
            <Link className="primary-button" href="/saved">관심 조건 만들기</Link>
          </div>
        )}
      </section>
    </>
  );
}
