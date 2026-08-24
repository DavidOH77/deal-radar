import { AppShell } from "@/components/app-shell";
import { DataQualityPanel } from "@/components/data-quality-panel";
import { SourcePanel } from "@/components/source-panel";
import { loadDealsData } from "@/lib/deals/page-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const data = await loadDealsData();
  return (
    <AppShell>
      <section className="page-heading">
        <div>
          <h1>수집 관리</h1>
          <p>연결 상태와 최근 수집 결과를 확인합니다.</p>
        </div>
        {data.lastRun ? <span className="freshness">최근 확인 {new Date(data.lastRun.finishedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span> : null}
      </section>
      <DataQualityPanel deals={data.deals} />
      <SourcePanel sources={data.sources} />
    </AppShell>
  );
}
