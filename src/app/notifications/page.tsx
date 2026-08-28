import { AppShell } from "@/components/app-shell";
import { NotificationExplorer } from "@/components/notification-explorer";
import { loadDealsData } from "@/lib/deals/page-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const initialData = await loadDealsData();
  return (
    <AppShell>
      <NotificationExplorer initialData={initialData} />
    </AppShell>
  );
}
