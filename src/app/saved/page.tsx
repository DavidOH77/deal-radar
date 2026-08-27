import { AppShell } from "@/components/app-shell";
import { SavedExplorer } from "@/components/saved-explorer";
import { loadDealsData } from "@/lib/deals/page-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const initialData = await loadDealsData({ scope: "archive" });
  return (
    <AppShell>
      <SavedExplorer initialData={initialData} />
    </AppShell>
  );
}
