import { afterEach, describe, expect, it } from "vitest";
import {
  buildAffiliateUrl,
  commerceProviderForUrl,
  isSafeOutboundUrl,
  resolveAffiliateUrl
} from "./affiliate";

const AFFILIATE_ENV_KEYS = [
  "AFFILIATE_11ST_ID",
  "AFFILIATE_11ST_TEMPLATE",
  "AFFILIATE_11ST_QUERY_KEY",
  "AFFILIATE_11ST_QUERY_VALUE",
  "AFFILIATE_GMARKET_ID",
  "AFFILIATE_GMARKET_TEMPLATE",
  "AFFILIATE_GMARKET_QUERY_KEY",
  "AFFILIATE_GMARKET_QUERY_VALUE"
] as const;

afterEach(() => {
  for (const key of AFFILIATE_ENV_KEYS) delete process.env[key];
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

describe("commerceProviderForUrl", () => {
  it("identifies supported marketplaces by the final destination", () => {
    expect(commerceProviderForUrl("https://item.gmarket.co.kr/Item?goodscode=1")).toBe("gmarket");
    expect(commerceProviderForUrl("https://itempage3.auction.co.kr/DetailView.aspx?itemno=1")).toBe("auction");
    expect(commerceProviderForUrl("https://smartstore.naver.com/store/products/1")).toBe("naver");
    expect(commerceProviderForUrl("https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=1")).toBe("oliveyoung");
  });

  it("does not accept lookalike hosts", () => {
    expect(commerceProviderForUrl("https://11st.co.kr.attacker.example/products/1")).toBeUndefined();
  });
});

describe("buildAffiliateUrl", () => {
  it("falls back to the original product URL without affiliate credentials", () => {
    const result = buildAffiliateUrl({
      source: "elevenst",
      sourceUrl: "https://source.example/post",
      productUrl: "https://www.11st.co.kr/products/1"
    });
    expect(result).toEqual({
      url: "https://www.11st.co.kr/products/1",
      affiliate: false,
      provider: "elevenst",
      method: "direct"
    });
  });

  it("matches a community deal by its marketplace product URL", () => {
    process.env.AFFILIATE_11ST_ID = "media-42";
    process.env.AFFILIATE_11ST_TEMPLATE = "https://affiliate.example/go?id={id}&url={url}";
    const result = buildAffiliateUrl({
      source: "ppomppu",
      sourceUrl: "https://www.ppomppu.co.kr/zboard/view.php?id=ppomppu&no=1",
      productUrl: "https://www.11st.co.kr/products/1"
    });
    expect(result.affiliate).toBe(true);
    expect(result.provider).toBe("elevenst");
    expect(result.method).toBe("template");
    expect(result.url).toContain("id=media-42");
    expect(result.url).toContain(encodeURIComponent("https://www.11st.co.kr/products/1"));
  });

  it("sets an approved attribution query without losing existing parameters or the hash", () => {
    process.env.AFFILIATE_GMARKET_QUERY_KEY = "media_id";
    process.env.AFFILIATE_GMARKET_QUERY_VALUE = "deal-radar";
    const result = buildAffiliateUrl({
      source: "eomisae",
      sourceUrl: "https://eomisae.co.kr/domestic/1",
      productUrl: "https://item.gmarket.co.kr/Item?goodscode=1&utm_source=community#detail"
    });
    const url = new URL(result.url);
    expect(result).toMatchObject({ affiliate: true, provider: "gmarket", method: "query" });
    expect(url.searchParams.get("goodscode")).toBe("1");
    expect(url.searchParams.get("utm_source")).toBe("community");
    expect(url.searchParams.get("media_id")).toBe("deal-radar");
    expect(url.hash).toBe("#detail");
  });

  it("rejects query keys that can change the navigation target", () => {
    process.env.AFFILIATE_GMARKET_QUERY_KEY = "redirect_url";
    process.env.AFFILIATE_GMARKET_QUERY_VALUE = "https://attacker.example";
    const result = buildAffiliateUrl({
      source: "fmkorea",
      sourceUrl: "https://fmkorea.com/1",
      productUrl: "https://item.gmarket.co.kr/Item?goodscode=1"
    });
    expect(result).toMatchObject({ affiliate: false, provider: "gmarket", method: "direct" });
    expect(result.url).toBe("https://item.gmarket.co.kr/Item?goodscode=1");
  });

  it("prioritizes an affiliate URL supplied by an approved feed", () => {
    const result = buildAffiliateUrl({
      source: "gmarket",
      sourceUrl: "https://item.gmarket.co.kr/Item?goodscode=1",
      affiliateUrl: "https://affiliate.example/approved/1"
    });
    expect(result).toEqual({
      url: "https://affiliate.example/approved/1",
      affiliate: true,
      provider: "gmarket",
      method: "provided_url"
    });
  });
});

describe("resolveAffiliateUrl", () => {
  it("uses the Coupang deeplink resolver for a community product URL", async () => {
    const result = await resolveAffiliateUrl({
      source: "theqoo",
      sourceUrl: "https://theqoo.net/theqdeal/1",
      productUrl: "https://www.coupang.com/vp/products/123"
    }, {
      coupangResolver: async () => "https://link.coupang.com/re/AFFILIATE_123"
    });
    expect(result).toEqual({
      url: "https://link.coupang.com/re/AFFILIATE_123",
      affiliate: true,
      provider: "coupang",
      method: "coupang_api"
    });
  });

  it("falls back to the original Coupang URL when deeplink generation fails", async () => {
    const result = await resolveAffiliateUrl({
      source: "ppomppu",
      sourceUrl: "https://www.ppomppu.co.kr/1",
      productUrl: "https://www.coupang.com/vp/products/123"
    }, {
      coupangResolver: async () => undefined
    });
    expect(result).toEqual({
      url: "https://www.coupang.com/vp/products/123",
      affiliate: false,
      provider: "coupang",
      method: "direct"
    });
  });
});
