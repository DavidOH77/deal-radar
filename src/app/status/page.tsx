import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { logoutAdmin } from "@/app/admin/actions";
import { AffiliateStatusPanel } from "@/components/affiliate-status-panel";
import { AppShell } from "@/components/app-shell";
import { DataQualityPanel } from "@/components/data-quality-panel";
import { MaterialIcon } from "@/components/material-icon";
import { SourcePanel } from "@/components/source-panel";
import { loadDealsData } from "@/lib/deals/page-data";
import { affiliateConfigurationStatus } from "@/lib/deals/affiliate";
import { hasAdminSession } from "@/lib/server/admin-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "수집 관리 | 딜레이더", robots: { index: false, follow: false } };

export default async function StatusPage() {
  if (!(await hasAdminSession())) redirect("/admin/login");
  const data = await loadDealsData({ scope: "archive" });
  return (
    <AppShell>
      <section className="page-heading">
        <div>
          <h1>수집 관리</h1>
          <p>연결 상태와 최근 수집 결과를 확인합니다.</p>
        </div>
        <div className="status-heading-actions">
          {data.lastRun ? <span className="freshness">최근 확인 {new Date(data.lastRun.finishedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span> : null}
          <form action={logoutAdmin}>
            <button className="secondary-button" type="submit"><MaterialIcon name="logout" size={17} />로그아웃</button>
          </form>
        </div>
      </section>
      <DataQualityPanel deals={data.deals} />
      <AffiliateStatusPanel statuses={affiliateConfigurationStatus()} />
      <SourcePanel sources={data.sources} />
    </AppShell>
  );
}
