import type { MetadataRoute } from "next";
import { dealDetailPath } from "@/lib/deals/routing";
import { readStore } from "@/lib/store/file-store";
import { siteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteUrl();
  const store = await readStore();
  return [
    { url: origin.toString(), lastModified: store.runs[0]?.finishedAt ?? new Date(), changeFrequency: "hourly", priority: 1 },
    ...store.deals.map((deal) => ({
      url: new URL(dealDetailPath(deal), origin).toString(),
      lastModified: deal.collectedAt,
      changeFrequency: "hourly" as const,
      priority: 0.7
    }))
  ];
}
