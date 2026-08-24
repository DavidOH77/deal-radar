import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithPolicy } from "./http";

const originalRetries = process.env.CRAWLER_FETCH_RETRIES;
const originalBase = process.env.CRAWLER_RETRY_BASE_MS;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalRetries === undefined) delete process.env.CRAWLER_FETCH_RETRIES;
  else process.env.CRAWLER_FETCH_RETRIES = originalRetries;
  if (originalBase === undefined) delete process.env.CRAWLER_RETRY_BASE_MS;
  else process.env.CRAWLER_RETRY_BASE_MS = originalBase;
});

describe("fetchWithPolicy", () => {
  it("retries temporary upstream failures for GET requests", async () => {
    process.env.CRAWLER_FETCH_RETRIES = "2";
    process.env.CRAWLER_RETRY_BASE_MS = "0";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 503, headers: { "retry-after": "0" } }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchWithPolicy("https://example.com/deals");

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(headers.get("user-agent")).toContain("DealRadarBot");
  });

  it("does not retry permanent client errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    expect((await fetchWithPolicy("https://example.com/missing")).status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry non-idempotent requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    expect((await fetchWithPolicy("https://example.com/feed", { method: "POST" })).status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
