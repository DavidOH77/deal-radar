import type { Deal, CommerceProvider, AffiliateMethod } from "./types";
import { createCoupangAffiliateUrl, isCoupangProductUrl } from "@/lib/integrations/coupang-affiliate";

interface AffiliateConfig {
  id?: string;
  template?: string;
  queryKey?: string;
  queryValue?: string;
}

export interface AffiliateResolution {
  url: string;
  affiliate: boolean;
  provider?: CommerceProvider;
  method: AffiliateMethod;
}

export interface AffiliateConfigurationStatus {
  provider: CommerceProvider;
  configured: boolean;
  method: AffiliateMethod;
}

interface ProviderRule {
  id: CommerceProvider;
  envPrefix: string;
  domains: string[];
  queryDomains: string[];
}

const PROVIDER_RULES: ProviderRule[] = [
  {
    id: "coupang",
    envPrefix: "COUPANG",
    domains: ["coupang.com", "link.coupang.com", "coupa.ng"],
    queryDomains: []
  },
  {
    id: "elevenst",
    envPrefix: "11ST",
    domains: ["11st.co.kr"],
    queryDomains: ["11st.co.kr"]
  },
  {
    id: "gmarket",
    envPrefix: "GMARKET",
    domains: ["gmarket.co.kr"],
    queryDomains: ["gmarket.co.kr"]
  },
  {
    id: "auction",
    envPrefix: "AUCTION",
    domains: ["auction.co.kr"],
    queryDomains: ["auction.co.kr"]
  },
  {
    id: "naver",
    envPrefix: "NAVER",
    domains: ["shopping.naver.com", "smartstore.naver.com", "brand.naver.com", "shoppinglive.naver.com"],
    queryDomains: ["shopping.naver.com", "smartstore.naver.com", "brand.naver.com", "shoppinglive.naver.com"]
  },
  {
    id: "ssg",
    envPrefix: "SSG",
    domains: ["ssg.com"],
    queryDomains: ["ssg.com"]
  },
  {
    id: "oliveyoung",
    envPrefix: "OLIVEYOUNG",
    domains: ["oliveyoung.co.kr"],
    queryDomains: ["oliveyoung.co.kr"]
  }
];

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^\[?::1\]?$/
];

const QUERY_KEY_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;
const NAVIGATION_QUERY_KEYS = new Set([
  "callback",
  "continue",
  "dest",
  "destination",
  "next",
  "redirect",
  "redirect_uri",
  "redirect_url",
  "return",
  "return_url",
  "returnurl",
  "target",
  "u",
  "uri",
  "url"
]);

function hostnameMatches(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function isSafeOutboundUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    if (url.username || url.password) return false;
    return !PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(url.hostname));
  } catch {
    return false;
  }
}

export function commerceProviderForUrl(value: string): CommerceProvider | undefined {
  if (!isSafeOutboundUrl(value)) return undefined;
  const hostname = new URL(value).hostname.toLowerCase();
  return PROVIDER_RULES.find((rule) => rule.domains.some((domain) => hostnameMatches(hostname, domain)))?.id;
}

function ruleFor(provider: CommerceProvider): ProviderRule | undefined {
  return PROVIDER_RULES.find((rule) => rule.id === provider);
}

function configFor(provider: CommerceProvider): AffiliateConfig {
  const prefix = ruleFor(provider)?.envPrefix;
  if (!prefix) return {};
  const id = process.env[`AFFILIATE_${prefix}_ID`];
  return {
    id,
    template: process.env[`AFFILIATE_${prefix}_TEMPLATE`],
    queryKey: process.env[`AFFILIATE_${prefix}_QUERY_KEY`],
    queryValue: process.env[`AFFILIATE_${prefix}_QUERY_VALUE`] ?? id
  };
}

export function affiliateConfigurationStatus(): AffiliateConfigurationStatus[] {
  return PROVIDER_RULES.map(({ id: provider }) => {
    if (provider === "coupang") {
      const configured = Boolean(process.env.COUPANG_ACCESS_KEY && process.env.COUPANG_SECRET_KEY);
      return { provider, configured, method: configured ? "coupang_api" : "direct" };
    }
    const config = configFor(provider);
    const queryConfigured = Boolean(
      config.queryKey
      && config.queryValue
      && QUERY_KEY_PATTERN.test(config.queryKey)
      && !NAVIGATION_QUERY_KEYS.has(config.queryKey.toLowerCase())
    );
    if (queryConfigured) return { provider, configured: true, method: "query" };
    const templateConfigured = Boolean(
      config.template?.includes("{url}")
      && (!config.template.includes("{id}") || config.id)
    );
    return {
      provider,
      configured: templateConfigured,
      method: templateConfigured ? "template" : "direct"
    };
  });
}

function safeDestination(deal: Pick<Deal, "sourceUrl" | "productUrl">): string {
  if (deal.productUrl && isSafeOutboundUrl(deal.productUrl)) return deal.productUrl;
  return deal.sourceUrl;
}

function canAppendQuery(provider: CommerceProvider, destination: string): boolean {
  const rule = ruleFor(provider);
  if (!rule) return false;
  const hostname = new URL(destination).hostname.toLowerCase();
  return rule.queryDomains.some((domain) => hostnameMatches(hostname, domain));
}

function buildQueryAffiliateUrl(
  destination: string,
  provider: CommerceProvider,
  config: AffiliateConfig
): string | undefined {
  const key = config.queryKey?.trim();
  const value = config.queryValue?.trim();
  if (!key || !value || value.length > 512 || !QUERY_KEY_PATTERN.test(key)) return undefined;
  if (NAVIGATION_QUERY_KEYS.has(key.toLowerCase()) || !canAppendQuery(provider, destination)) return undefined;
  const url = new URL(destination);
  url.searchParams.set(key, value);
  return url.toString();
}

function buildTemplateAffiliateUrl(destination: string, config: AffiliateConfig): string | undefined {
  const template = config.template?.trim();
  if (!template?.includes("{url}")) return undefined;
  if (template.includes("{id}") && !config.id) return undefined;
  const url = template
    .replaceAll("{url}", encodeURIComponent(destination))
    .replaceAll("{id}", encodeURIComponent(config.id ?? ""));
  if (url.includes("{url}") || url.includes("{id}") || !isSafeOutboundUrl(url)) return undefined;
  return url;
}

function staticAffiliateResolution(destination: string, provider?: CommerceProvider): AffiliateResolution {
  if (!provider) return { url: destination, affiliate: false, method: "direct" };
  const config = configFor(provider);
  const queryUrl = buildQueryAffiliateUrl(destination, provider, config);
  if (queryUrl) return { url: queryUrl, affiliate: true, provider, method: "query" };
  const templateUrl = buildTemplateAffiliateUrl(destination, config);
  if (templateUrl) return { url: templateUrl, affiliate: true, provider, method: "template" };
  return { url: destination, affiliate: false, provider, method: "direct" };
}

function providedAffiliateResolution(
  deal: Pick<Deal, "sourceUrl" | "productUrl" | "affiliateUrl">
): AffiliateResolution | undefined {
  if (!deal.affiliateUrl || !isSafeOutboundUrl(deal.affiliateUrl)) return undefined;
  const destination = safeDestination(deal);
  return {
    url: deal.affiliateUrl,
    affiliate: true,
    provider: commerceProviderForUrl(destination) ?? commerceProviderForUrl(deal.affiliateUrl),
    method: "provided_url"
  };
}

export function buildAffiliateUrl(
  deal: Pick<Deal, "source" | "sourceUrl" | "productUrl" | "affiliateUrl">
): AffiliateResolution {
  const provided = providedAffiliateResolution(deal);
  if (provided) return provided;
  const destination = safeDestination(deal);
  if (!isSafeOutboundUrl(destination)) return { url: deal.sourceUrl, affiliate: false, method: "direct" };
  return staticAffiliateResolution(destination, commerceProviderForUrl(destination));
}

export async function resolveAffiliateUrl(
  deal: Pick<Deal, "source" | "sourceUrl" | "productUrl" | "affiliateUrl">,
  options: { coupangResolver?: (url: string) => Promise<string | undefined> } = {}
): Promise<AffiliateResolution> {
  const provided = providedAffiliateResolution(deal);
  if (provided) return provided;
  const destination = safeDestination(deal);
  if (!isSafeOutboundUrl(destination)) return { url: deal.sourceUrl, affiliate: false, method: "direct" };

  const provider = commerceProviderForUrl(destination);
  if (provider === "coupang" && isCoupangProductUrl(destination)) {
    const coupangUrl = await (options.coupangResolver ?? createCoupangAffiliateUrl)(destination);
    if (coupangUrl && isSafeOutboundUrl(coupangUrl)) {
      return { url: coupangUrl, affiliate: true, provider, method: "coupang_api" };
    }
  }
  return staticAffiliateResolution(destination, provider);
}
