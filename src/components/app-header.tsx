"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";
import type { DealNotification } from "@/lib/deals/preferences";
import { NOTIFICATIONS_KEY, PREFERENCES_EVENT } from "./use-deal-preferences";
import { MaterialIcon } from "./material-icon";

export function AppHeader({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    function updateUnreadCount() {
      try {
        const stored = JSON.parse(window.localStorage.getItem(NOTIFICATIONS_KEY) ?? "[]") as DealNotification[];
        setUnreadCount(Array.isArray(stored) ? stored.filter((notification) => !notification.read).length : 0);
      } catch {
        setUnreadCount(0);
      }
    }
    updateUnreadCount();
    window.addEventListener(PREFERENCES_EVENT, updateUnreadCount);
    window.addEventListener("storage", updateUnreadCount);
    return () => {
      window.removeEventListener(PREFERENCES_EVENT, updateUnreadCount);
      window.removeEventListener("storage", updateUnreadCount);
    };
  }, []);

  return (
    <Fragment>
      <header className="app-header">
        <div className="header-inner">
          <Link className="brand" href="/" aria-label={`${BRAND.name} 홈`}>
            <Image src={BRAND.markPath} alt="" width={22} height={22} priority />
            <strong>{BRAND.name}</strong>
          </Link>
          <nav className="primary-nav" aria-label="주요 화면">
            <Link className={`nav-link ${pathname === "/" ? "active" : ""}`} href="/" aria-label="핫딜 랭킹" aria-current={pathname === "/" ? "page" : undefined}>
              <MaterialIcon name="visibility" size={19} filled={pathname === "/"} />
              <span>핫딜 랭킹</span>
            </Link>
            <Link className={`nav-link ${pathname === "/saved" ? "active" : ""}`} href="/saved" aria-label="관심딜" aria-current={pathname === "/saved" ? "page" : undefined}>
              <MaterialIcon name="favorite" size={19} filled={pathname === "/saved"} />
              <span>관심딜</span>
            </Link>
          </nav>
          <Link className={`notification-link ${pathname === "/notifications" ? "active" : ""}`} href="/notifications" aria-label="알림함" title="알림함" aria-current={pathname === "/notifications" ? "page" : undefined}>
            <MaterialIcon name="notifications" size={20} filled={pathname === "/notifications" || unreadCount > 0} />
            {unreadCount ? <b>{Math.min(unreadCount, 99)}</b> : null}
          </Link>
          {isAdmin ? (
            <Link className={`manage-link ${pathname === "/status" ? "active" : ""}`} href="/status" aria-label="수집 관리" title="수집 관리" aria-current={pathname === "/status" ? "page" : undefined}>
              <MaterialIcon name="settings" size={20} filled={pathname === "/status"} />
            </Link>
          ) : null}
        </div>
      </header>
      <nav className="mobile-nav" aria-label="모바일 주요 화면">
        <Link className={pathname === "/" ? "active" : ""} href="/" aria-current={pathname === "/" ? "page" : undefined}>
          <MaterialIcon name="visibility" size={20} filled={pathname === "/"} />
          <span>랭킹</span>
        </Link>
        <Link className={pathname === "/saved" ? "active" : ""} href="/saved" aria-current={pathname === "/saved" ? "page" : undefined}>
          <MaterialIcon name="favorite" size={20} filled={pathname === "/saved"} />
          <span>관심딜</span>
        </Link>
        <Link className={pathname === "/notifications" ? "active" : ""} href="/notifications" aria-current={pathname === "/notifications" ? "page" : undefined}>
          <span className="mobile-nav-icon">
            <MaterialIcon name="notifications" size={20} filled={pathname === "/notifications" || unreadCount > 0} />
            {unreadCount ? <b>{Math.min(unreadCount, 99)}</b> : null}
          </span>
          <span>알림</span>
        </Link>
      </nav>
    </Fragment>
  );
}
