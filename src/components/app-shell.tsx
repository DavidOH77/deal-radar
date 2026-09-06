import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";
import { hasAdminSession } from "@/lib/server/admin-session";
import { AppHeader } from "./app-header";

export async function AppShell({ children }: { children: ReactNode }) {
  const isAdmin = await hasAdminSession();

  return (
    <main>
      <AppHeader isAdmin={isAdmin} />
      <div className="page-shell">
        {children}
        <footer>
          <strong>{BRAND.name}</strong>
          <p>일부 구매 링크를 통해 수수료를 받을 수 있습니다. 가격과 재고는 판매처에서 최종 확인됩니다.</p>
        </footer>
      </div>
    </main>
  );
}
