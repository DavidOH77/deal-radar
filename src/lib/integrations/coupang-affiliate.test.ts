import { afterEach, describe, expect, it } from "vitest";
import {
  COUPANG_DEEPLINK_PATH,
  coupangAuthorization,
  createCoupangAffiliateUrl,
  isCoupangProductUrl
} from "./coupang-affiliate";

afterEach(() => {
  delete process.env.COUPANG_ACCESS_KEY;
  delete process.env.COUPANG_SECRET_KEY;
  delete process.env.COUPANG_SUB_ID;
});

describe("coupangAuthorization", () => {
  it("creates a stable HMAC header for a fixed time", () => {
    const header = coupangAuthorization(
      "POST",
      COUPANG_DEEPLINK_PATH,
      "",
      "access-key",
      "secret-key",
      new Date("2026-08-25T03:04:05.000Z")
    );
    expect(header).toContain("access-key=access-key");
    expect(header).toContain("signed-date=260825T030405Z");
    expect(header).toMatch(/signature=[a-f0-9]{64}$/);
  });
});

describe("isCoupangProductUrl", () => {
  it("only accepts HTTPS Coupang destinations that can be converted", () => {
    expect(isCoupangProductUrl("https://www.coupang.com/vp/products/123")).toBe(true);
    expect(isCoupangProductUrl("https://link.coupang.com/re/source-link")).toBe(false);
    expect(isCoupangProductUrl("https://coupang.com.attacker.example/vp/products/123")).toBe(false);
  });
});

describe("createCoupangAffiliateUrl", () => {
  it("creates a tracked deeplink with the configured sub ID", async () => {
    process.env.COUPANG_ACCESS_KEY = "access-key";
    process.env.COUPANG_SECRET_KEY = "secret-key";
    process.env.COUPANG_SUB_ID = "deal-radar";
    let requestUrl = "";
    let requestInit: RequestInit | undefined;
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      requestUrl = String(input);
      requestInit = init;
      return Response.json({
        rCode: "0",
        data: [{ shortenUrl: "https://coupa.ng/deal-radar-123" }]
      });
    };

    const result = await createCoupangAffiliateUrl(
      "https://www.coupang.com/vp/products/987654321",
      fetcher
    );

    expect(result).toBe("https://coupa.ng/deal-radar-123");
    expect(requestUrl).toContain(COUPANG_DEEPLINK_PATH);
    expect(requestInit?.method).toBe("POST");
    expect(JSON.parse(String(requestInit?.body))).toEqual({
      coupangUrls: ["https://www.coupang.com/vp/products/987654321"],
      subId: "deal-radar"
    });
    expect(new Headers(requestInit?.headers).get("authorization")).toContain("access-key=access-key");
  });

  it("does not call the API without credentials", async () => {
    let called = false;
    const fetcher = async (): Promise<Response> => {
      called = true;
      return Response.json({});
    };
    const result = await createCoupangAffiliateUrl("https://www.coupang.com/vp/products/555", fetcher);
    expect(result).toBeUndefined();
    expect(called).toBe(false);
  });
});
