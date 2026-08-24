const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_BASE_MS = 400;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function boundedEnvNumber(name: string, fallback: number, min: number, max: number): number {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value), min), max);
}

function retryAfterMs(response: Response, attempt: number): number {
  const value = response.headers.get("retry-after");
  if (value) {
    const seconds = Number(value);
    if (Number.isFinite(seconds)) return Math.min(Math.max(seconds * 1000, 0), 10_000);
    const date = Date.parse(value);
    if (Number.isFinite(date)) return Math.min(Math.max(date - Date.now(), 0), 10_000);
  }
  const base = boundedEnvNumber("CRAWLER_RETRY_BASE_MS", DEFAULT_RETRY_BASE_MS, 0, 5_000);
  return Math.min(base * 2 ** attempt + Math.floor(Math.random() * 100), 10_000);
}

function requestSignal(signal?: AbortSignal | null): AbortSignal {
  const timeout = AbortSignal.timeout(
    boundedEnvNumber("CRAWLER_TIMEOUT_MS", DEFAULT_TIMEOUT_MS, 1_000, 30_000)
  );
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

async function wait(ms: number, signal?: AbortSignal | null): Promise<void> {
  if (ms <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => signal?.removeEventListener("abort", onAbort);
    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timeout);
      cleanup();
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function crawlerUserAgent(): string {
  const contact = process.env.CRAWLER_CONTACT_EMAIL || "contact-not-configured";
  return `Mozilla/5.0 (compatible; DealRadarBot/0.2; +mailto:${contact})`;
}

export async function fetchWithPolicy(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("user-agent", crawlerUserAgent());
  headers.set("accept-language", "ko-KR,ko;q=0.9,en;q=0.7");
  headers.set("accept", "text/html,application/json,application/xml;q=0.9,*/*;q=0.8");

  const method = (init.method ?? "GET").toUpperCase();
  const retries = method === "GET" || method === "HEAD"
    ? boundedEnvNumber("CRAWLER_FETCH_RETRIES", DEFAULT_RETRIES, 0, 4)
    : 0;

  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers,
        cache: "no-store",
        signal: requestSignal(init.signal)
      });
      if (!RETRYABLE_STATUS.has(response.status) || attempt >= retries) return response;
      const delay = retryAfterMs(response, attempt);
      await response.body?.cancel().catch(() => undefined);
      await wait(delay, init.signal);
    } catch (error) {
      if (attempt >= retries || init.signal?.aborted) throw error;
      await wait(retryAfterMs(new Response(null), attempt), init.signal);
    }
  }
}

export function numberValue(value?: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function absoluteUrl(value: string | undefined, base: string): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("//")) return `https:${value}`;
  try {
    return new URL(value, base).toString();
  } catch {
    return undefined;
  }
}
