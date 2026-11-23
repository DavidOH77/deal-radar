import type { SourceId } from "./types";

export function fallbackDealImageUrl(source: SourceId, sourceDealId: string): string | undefined {
  if (source !== "ppomppu" || !/^\d{6,}$/.test(sourceDealId)) return undefined;
  const partition = sourceDealId.at(-1);
  return `https://cdn4.ppomppu.co.kr/zboard/data/_thumb/ppomppu/${partition}/small_${sourceDealId}.jpg`;
}
