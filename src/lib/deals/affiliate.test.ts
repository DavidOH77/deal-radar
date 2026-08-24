import { afterEach, describe, expect, it } from "vitest";
import { buildAffiliateUrl, isSafeOutboundUrl } from "./affiliate";

afterEach(() => {
  delete process.env.AFFILIATE_11ST_ID;
  delete process.env.AFFILIATE_11ST_TEMPLATE;
});

describe("isSafeOutboundUrl", () => {
  it("allows public HTTP destinations", () => {
    expect(isSafeOutboundUrl("https://www.coupang.com/vp/products/1")).toBe(true);
  });

  it("blocks scripts, credentials, and local destinations", () => {
    expect(isSafeOutboundUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeOutboundUrl("https://user:pass@example.com/path")).toBe(false);
    expect(isSafeOutboundUrl("http://127.0.0.1:3000/private")).toBe(false);
  });
});

describe("buildAffiliateUrl", () => {
  it("falls back to the original product URL without affiliate credentials", () => {
    const result = buildAffiliateUrl({
      source: "elevenst",
      sourceUrl: "https://source.example/post",
      productUrl: "https://www.11st.co.kr/products/1"
    });
    expect(result).toEqual({ url: "https://www.11st.co.kr/products/1", affiliate: false });
  });

  it("builds a configured deep link at click time", () => {
    process.env.AFFILIATE_11ST_ID = "media-42";
    process.env.AFFILIATE_11ST_TEMPLATE = "https://affiliate.example/go?id={id}&url={url}";
    const result = buildAffiliateUrl({
      source: "elevenst",
      sourceUrl: "https://www.11st.co.kr/products/1"
    });
    expect(result.affiliate).toBe(true);
    expect(result.url).toContain("id=media-42");
    expect(result.url).toContain(encodeURIComponent("https://www.11st.co.kr/products/1"));
  });
});
