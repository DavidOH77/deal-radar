import type { RawDeal, SourceConnector } from "@/lib/deals/types";
import { COUPANG_API_HOST, coupangAuthorization } from "@/lib/integrations/coupang-affiliate";
import { fetchWithPolicy, numberValue } from "./http";
import { errorMessage, sourceResult } from "./result";

const GOLD_BOX_PATH = "/v2/providers/affiliate_open_api/apis/openapi/v1/products/goldbox";

interface CoupangProduct {
  productId?: number | string;
  productName?: string;
  productPrice?: number;
  productImage?: string;
  productUrl?: string;
  categoryName?: string;
  rank?: number;
}

export { coupangAuthorization } from "@/lib/integrations/coupang-affiliate";

export function parseCoupangProducts(
  data: CoupangProduct[],
  collectedAt = new Date().toISOString()
): RawDeal[] {
  return data.flatMap((product) => {
    const sourceDealId = String(product.productId ?? "");
    const title = product.productName?.trim();
    const price = numberValue(String(product.productPrice ?? ""));
    if (!sourceDealId || !title || !price || !product.productUrl) return [];
    return [{
      source: "coupang" as const,
      sourceMode: "official_api" as const,
      sourceDealId,
      title,
      sourceUrl: product.productUrl,
      productUrl: product.productUrl,
      affiliateUrl: product.productUrl,
      imageUrl: product.productImage,
      category: product.categoryName,
      publishedAt: collectedAt,
      dealPrice: { amount: price, currency: "KRW" as const },
      reactions: {},
      collectedAt
    }];
  });
}

export const coupangConnector: SourceConnector = {
  id: "coupang",
  mode: "official_api",
  async collect() {
    const startedAt = new Date().toISOString();
    const accessKey = process.env.COUPANG_ACCESS_KEY;
    const secretKey = process.env.COUPANG_SECRET_KEY;
    if (!accessKey || !secretKey) {
      return sourceResult({
        source: this.id,
        mode: this.mode,
        status: "needs_credentials",
        startedAt,
        message: "쿠팡 파트너스 Access Key와 Secret Key가 필요합니다."
      });
    }

    try {
      const query = process.env.COUPANG_SUB_ID
        ? `subId=${encodeURIComponent(process.env.COUPANG_SUB_ID)}`
        : "";
      const url = `${COUPANG_API_HOST}${GOLD_BOX_PATH}${query ? `?${query}` : ""}`;
      const response = await fetchWithPolicy(url, {
        headers: {
          authorization: coupangAuthorization("GET", GOLD_BOX_PATH, query, accessKey, secretKey)
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as { data?: CoupangProduct[]; rMessage?: string };
      const deals = parseCoupangProducts(payload.data ?? []);
      return sourceResult({
        source: this.id,
        mode: this.mode,
        status: "success",
        startedAt,
        deals,
        message: `파트너스 골드박스 API에서 ${deals.length}건 수집`
      });
    } catch (error) {
      return sourceResult({
        source: this.id,
        mode: this.mode,
        status: "error",
        startedAt,
        message: errorMessage(error)
      });
    }
  }
};
