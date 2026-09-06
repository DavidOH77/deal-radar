import type { RawDeal } from "@/lib/deals/types";
import type { ObservationWriteResult } from "@/lib/domain/deals/observations";
import { buildSourcePostObservation } from "./build-observation";

export type ShadowWriteResult =
  | ({ status: "written" } & ObservationWriteResult)
  | { status: "disabled"; attempted: number; inserted: 0 };

export function domainShadowWriteEnabled(): boolean {
  return process.env.DEAL_DOMAIN_SHADOW_WRITE === "1";
}

export async function shadowWriteSourceObservations(
  deals: RawDeal[],
  crawlRunId: string
): Promise<ShadowWriteResult> {
  if (!domainShadowWriteEnabled()) return { status: "disabled", attempted: deals.length, inserted: 0 };
  if (!process.env.DATABASE_URL?.trim() && !process.env.POSTGRES_URL?.trim()) {
    throw new Error("DEAL_DOMAIN_SHADOW_WRITE requires DATABASE_URL or POSTGRES_URL.");
  }

  const { PostgresSourceObservationWriter } = await import(
    "@/lib/infrastructure/postgres/source-observation-writer"
  );
  const writer = new PostgresSourceObservationWriter();
  const result = await writer.write(deals.map((deal) => buildSourcePostObservation(deal, crawlRunId)));
  return { status: "written", ...result };
}
