import type {
  CrawlSourceResult,
  RawDeal,
  SourceId,
  SourceMode,
  SourceStatus
} from "@/lib/deals/types";

export function sourceResult(args: {
  source: SourceId;
  mode: SourceMode;
  status: SourceStatus;
  startedAt: string;
  deals?: RawDeal[];
  message: string;
}): CrawlSourceResult {
  const deals = args.deals ?? [];
  return {
    source: args.source,
    mode: args.mode,
    status: args.status,
    count: deals.length,
    startedAt: args.startedAt,
    finishedAt: new Date().toISOString(),
    message: args.message,
    deals
  };
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "알 수 없는 수집 오류";
}
