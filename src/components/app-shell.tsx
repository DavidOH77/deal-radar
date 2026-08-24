"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { DealNotification } from "@/lib/deals/preferences";
import { NOTIFICATIONS_KEY, PREFERENCES_EVENT } from "./use-deal-preferences";
import { MaterialIcon } from "./material-icon";

export function AppShell({ children }: { children: ReactNode }) {
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
    <main>
      <header className="app-header">
        <div className="header-inner">
          <Link className="brand" href="/" aria-label="딜레이더 홈">
            <Image src="/brand/deal-radar-slash-v1.png" alt="" width={21} height={21} priority />
            <strong>딜레이더</strong>
          </Link>
          <nav className="primary-nav" aria-label="주요 화면">
            <Link className={`nav-link ${pathname === "/" ? "active" : ""}`} href="/" aria-current={pathname === "/" ? "page" : undefined}>
              <MaterialIcon name="visibility" size={19} filled={pathname === "/"} />
              <span>핫딜 랭킹</span>
            </Link>
            <Link className={`nav-link ${pathname === "/saved" ? "active" : ""}`} href="/saved" aria-current={pathname === "/saved" ? "page" : undefined}>
              <MaterialIcon name="favorite" size={19} filled={pathname === "/saved"} />
              <span>관심딜</span>
            </Link>
          </nav>
          <Link className={`notification-link ${pathname === "/notifications" ? "active" : ""}`} href="/notifications" aria-label="알림함" title="알림함" aria-current={pathname === "/notifications" ? "page" : undefined}>
            <MaterialIcon name="notifications" size={20} filled={pathname === "/notifications" || unreadCount > 0} />
            {unreadCount ? <b>{Math.min(unreadCount, 99)}</b> : null}
          </Link>
          <Link className={`manage-link ${pathname === "/status" ? "active" : ""}`} href="/status" aria-label="수집 관리" title="수집 관리" aria-current={pathname === "/status" ? "page" : undefined}>
            <MaterialIcon name="settings" size={20} filled={pathname === "/status"} />
          </Link>
        </div>
      </header>
      <div className="page-shell">
        {children}
        <footer>
          <strong>딜레이더</strong>
          <p>일부 구매 링크를 통해 수수료를 받을 수 있습니다. 가격과 재고는 판매처에서 최종 확인됩니다.</p>
        </footer>
      </div>
    </main>
  );
}
