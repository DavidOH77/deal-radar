import { AppShell } from "@/components/app-shell";
import { DealExplorer } from "@/components/deal-explorer";
import { loadDealsData } from "@/lib/deals/page-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Home() {
  const initialData = await loadDealsData();
  return (
    <AppShell>
      <DealExplorer initialData={initialData} />
    </AppShell>
  );
}
