import { afterEach, describe, expect, it, vi } from "vitest";
import { quasarzoneConnector } from "./quasarzone";

const originalFetch = global.fetch;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  global.fetch = originalFetch;
});

describe("quasarzoneConnector", () => {
  it("uses the official Naver web search API without hiding the crawler identity", async () => {
    vi.stubEnv("NAVER_SEARCH_CLIENT_ID", "client-id");
    vi.stubEnv("NAVER_SEARCH_CLIENT_SECRET", "client-secret");
    vi.stubEnv("CRAWLER_CONTACT_EMAIL", "crawler@example.com");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [{
        title: "진행중 [쿠팡] SSD 특가 > 핫딜 | 퀘이사존 QUASARZONE",
        link: "https://quasarzone.com/bbs/qb_saleinfo/views/1977000",
        description: "2026.08.25 12:00 댓글: 3 개"
      }]
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await quasarzoneConnector.collect();

    expect(result).toMatchObject({ status: "success", mode: "official_api", count: 1 });
    const [requestedUrl, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestedUrl).toContain("openapi.naver.com/v1/search/webkr.json");
    const headers = request.headers as Headers;
    expect(headers.get("x-naver-client-id")).toBe("client-id");
    expect(headers.get("x-naver-client-secret")).toBe("client-secret");
    expect(headers.get("user-agent")).toContain("DealRadarBot/0.2");
  });

  it("prefers an approved feed when one is configured", async () => {
    vi.stubEnv("QUASARZONE_FEED_URL", "https://feed.example/quasarzone");
    vi.stubEnv("QUASARZONE_FEED_TOKEN", "feed-token");
    vi.stubEnv("NAVER_SEARCH_CLIENT_ID", "client-id");
    vi.stubEnv("NAVER_SEARCH_CLIENT_SECRET", "client-secret");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [{
        id: "feed-1",
        title: "승인 피드 딜",
        url: "https://quasarzone.com/bbs/qb_saleinfo/views/1977001",
        publishedAt: "2026-08-25T12:00:00+09:00"
      }]
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await quasarzoneConnector.collect();

    expect(result).toMatchObject({ status: "success", mode: "approved_feed", count: 1 });
    const [requestedUrl, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestedUrl).toBe("https://feed.example/quasarzone");
    expect((request.headers as Headers).get("authorization")).toBe("Bearer feed-token");
  });
});
