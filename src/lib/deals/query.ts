const DEAL_ID = /^[a-z0-9][a-z0-9_-]{0,159}$/i;

export const MAX_REQUESTED_DEAL_IDS = 50;

export function parseRequestedDealIds(searchParams: URLSearchParams): string[] | undefined {
  const values = searchParams.getAll("id");
  if (values.length > MAX_REQUESTED_DEAL_IDS || values.some((value) => !DEAL_ID.test(value))) return undefined;
  return [...new Set(values)];
}
