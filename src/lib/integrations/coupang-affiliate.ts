import { createHmac } from "node:crypto";

export const COUPANG_API_HOST = "https://api-gateway.coupang.com";
export const COUPANG_DEEPLINK_PATH = "/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink";

const DEFAULT_TIMEOUT_MS = 2_500;
const DEFAULT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
const MAX_CACHE_SIZE = 1_000;
const deepLinkCache = new Map<string, { url: string; expiresAt: number }>();

function signedDate(date = new Date()): string {
  return date.toISOString().slice(2, 19).replace(/[-:]/g, "") + "Z";
}

export function coupangAuthorization(
  method: string,
  path: string,
  query: string,
  accessKey: string,
  secretKey: string,
  date = new Date()
): string {
  const datetime = signedDate(date);
  const signature = createHmac("sha256", secretKey)
    .update(`${datetime}${method}${path}${query}`)
    .digest("hex");
  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;
}

function hostMatches(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function isCoupangProductUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && !url.username
      && !url.password
      && hostMatches(url.hostname.toLowerCase(), "coupang.com")
      && url.hostname.toLowerCase() !== "link.coupang.com";
  } catch {
    return false;
  }
}

function isCoupangAffiliateUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return url.protocol === "https:" && (hostname === "coupa.ng" || hostname === "link.coupang.com");
  } catch {
    return false;
  }
}

function positiveNumber(value: string | undefined, fallback: number, maximum: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

function cachedUrl(key: string): string | undefined {
  const cached = deepLinkCache.get(key);
  if (!cached) return undefined;
  if (cached.expiresAt <= Date.now()) {
    deepLinkCache.delete(key);
    return undefined;
  }
  return cached.url;
}

function cacheUrl(key: string, url: string): void {
  if (deepLinkCache.size >= MAX_CACHE_SIZE) {
    deepLinkCache.delete(deepLinkCache.keys().next().value as string);
  }
  const ttl = positiveNumber(process.env.COUPANG_AFFILIATE_CACHE_TTL_MS, DEFAULT_CACHE_TTL_MS, 30 * 24 * 60 * 60 * 1_000);
  deepLinkCache.set(key, { url, expiresAt: Date.now() + ttl });
}

export async function createCoupangAffiliateUrl(
  destination: string,
  fetcher: typeof fetch = fetch
): Promise<string | undefined> {
  const accessKey = process.env.COUPANG_ACCESS_KEY;
  const secretKey = process.env.COUPANG_SECRET_KEY;
  if (!accessKey || !secretKey || !isCoupangProductUrl(destination)) return undefined;

  const subId = process.env.COUPANG_SUB_ID?.trim();
  const cacheKey = `${subId ?? ""}:${destination}`;
  const cached = cachedUrl(cacheKey);
  if (cached) return cached;

  const body = JSON.stringify({
    coupangUrls: [destination],
    ...(subId ? { subId } : {})
  });
  const timeoutMs = positiveNumber(process.env.COUPANG_AFFILIATE_LINK_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 10_000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(`${COUPANG_API_HOST}${COUPANG_DEEPLINK_PATH}`, {
      method: "POST",
      headers: {
        authorization: coupangAuthorization("POST", COUPANG_DEEPLINK_PATH, "", accessKey, secretKey),
        "content-type": "application/json"
      },
      body,
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) return undefined;
    const payload = await response.json() as {
      rCode?: string | number;
      data?: Array<{ shortenUrl?: string; landingUrl?: string }>;
    };
    if (String(payload.rCode ?? "0") !== "0") return undefined;
    const result = payload.data?.[0];
    const affiliateUrl = [result?.shortenUrl, result?.landingUrl].find((url) => url && isCoupangAffiliateUrl(url));
    if (!affiliateUrl) return undefined;
    cacheUrl(cacheKey, affiliateUrl);
    return affiliateUrl;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}
