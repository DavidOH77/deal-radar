import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DealImage } from "@/components/deal-image";
import { MaterialIcon } from "@/components/material-icon";
import { PriceHistory } from "@/components/price-history";
import { ShareButton } from "@/components/share-button";
import { SOURCE_LABELS, formatMetric, presentDeal, relativeTime } from "@/lib/deals/presentation";
import { relatedDealsForDisplay } from "@/lib/deals/quality";
import { dealDetailPath } from "@/lib/deals/routing";
import { trendReason } from "@/lib/deals/trend";
import { readStore } from "@/lib/store/file-store";
import { siteUrl } from "@/lib/site-url";
import { BRAND } from "@/lib/brand";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function dealById(id: string) {
  const store = await readStore();
  return { store, deal: store.deals.find((item) => item.id === id) };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string; slug: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { deal } = await dealById(id);
  if (!deal) return { title: `딜을 찾을 수 없습니다 | ${BRAND.name}` };
  const presented = presentDeal(deal);
  const canonical = new URL(dealDetailPath(deal), siteUrl()).toString();
  return {
    title: `${presented.title} | ${BRAND.name}`,
    description: `${SOURCE_LABELS[deal.source]} 반응과 현재 수집 가격을 확인하세요.`,
    alternates: { canonical },
    openGraph: {
      title: presented.title,
      description: `${SOURCE_LABELS[deal.source]} · ${deal.dealPrice?.amount ? `${deal.dealPrice.amount.toLocaleString("ko-KR")}원` : "가격 정보 없음"}`,
      url: canonical,
      type: "article",
      images: deal.imageUrl ? [{ url: deal.imageUrl, alt: presented.title }] : undefined
    }
  };
}

export default async function DealDetailPage({ params }: { params: Promise<{ id: string; slug: string }> }) {
  const { id } = await params;
  const { store, deal } = await dealById(id);
  if (!deal) notFound();

  const presented = presentDeal(deal);
  const now = new Date().toISOString();
  const related = relatedDealsForDisplay(deal, store.deals, new Date(now).getTime());
  const snapshots = store.priceSnapshots.filter((snapshot) => snapshot.canonicalKey === deal.canonicalKey);
  const rising = trendReason(deal.trend);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: presented.title,
    image: deal.imageUrl ? [deal.imageUrl] : undefined,
    offers: deal.dealPrice?.amount ? {
      "@type": "Offer",
      priceCurrency: "KRW",
      price: deal.dealPrice.amount,
      url: new URL(deal.outboundUrl, siteUrl()).toString()
    } : undefined
  };

  return (
    <AppShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replaceAll("<", "\\u003c") }} />
      <nav className="detail-breadcrumb" aria-label="현재 위치">
        <Link href="/">핫딜 랭킹</Link>
        <MaterialIcon name="expand_more" size={16} />
        <span>{presented.category}</span>
      </nav>

      <article className="deal-detail">
        <div className="detail-media">
          {deal.imageUrl ? (
            <DealImage src={deal.imageUrl} alt={presented.title} priority sizes="(max-width: 700px) 100vw, 360px" fallbackSize={36} />
          ) : (
            <MaterialIcon name="image_not_supported" size={36} label="상품 이미지 없음" />
          )}
        </div>
        <div className="detail-summary">
          <div className="deal-meta">
            <span className="source">{presented.seller ?? SOURCE_LABELS[deal.source]}</span>
            <span>{presented.category}</span>
            <span>{relativeTime(deal.publishedAt, now)}</span>
          </div>
          <h1>{presented.title}</h1>
          <div className="detail-price">
            {deal.dealPrice?.amount ? <strong>{deal.dealPrice.amount.toLocaleString("ko-KR")}원</strong> : <span>가격 정보 없음</span>}
            {presented.shippingLabel ? <small>{presented.shippingLabel}</small> : null}
          </div>
          {rising ? <p className="detail-rising"><MaterialIcon name="trending_up" size={17} /> {rising}</p> : null}
          <div className="detail-reactions" aria-label="커뮤니티 반응">
            {deal.reactions.views !== undefined ? <span>조회 <b>{formatMetric(deal.reactions.views)}</b></span> : null}
            {deal.reactions.likes !== undefined ? <span>추천 <b>{formatMetric(deal.reactions.likes)}</b></span> : null}
            {deal.reactions.comments !== undefined ? <span>댓글 <b>{formatMetric(deal.reactions.comments)}</b></span> : null}
          </div>
          <div className="detail-actions">
            <a className="primary-button" href={deal.outboundUrl} target="_blank" rel="nofollow sponsored noopener">판매처로 이동</a>
            <ShareButton title={presented.title} />
          </div>
          <p className="affiliate-note">랭킹은 제휴 여부와 무관합니다. 일부 링크를 통해 수수료를 받을 수 있습니다.</p>
        </div>
      </article>

      <section className="evidence-section" aria-labelledby="evidence-title">
        <div className="section-heading"><div><h2 id="evidence-title">딜 근거</h2></div></div>
        <div className="evidence-grid">
          <div><span>현재 가격</span><strong>{deal.dealPrice?.amount ? `${deal.dealPrice.amount.toLocaleString("ko-KR")}원` : "수집되지 않음"}</strong></div>
          <div><span>가격 비교</span><strong>{deal.baseline.amount && ["high", "medium"].includes(deal.baseline.confidence) ? deal.baseline.label : "비교 데이터 부족"}</strong></div>
          <div><span>반응 변화</span><strong>{rising ?? "다음 수집부터 변화량 계산"}</strong></div>
        </div>
      </section>

      <section className="history-section" aria-labelledby="history-title">
        <div className="section-heading"><div><h2 id="history-title">가격 기록</h2><p>동일 수집 항목의 관측 가격입니다.</p></div></div>
        <PriceHistory snapshots={snapshots} />
      </section>

      <section className="related-section" aria-labelledby="related-title">
        <div className="section-heading"><div><h2 id="related-title">같은 상품의 다른 출처</h2></div><span>{related.length}건</span></div>
        {related.length ? (
          <div className="related-list">
            {related.map((item) => {
              const itemPresentation = presentDeal(item);
              return (
                <a href={item.outboundUrl} target="_blank" rel="nofollow sponsored noopener" key={item.id}>
                  <span>{itemPresentation.seller ?? SOURCE_LABELS[item.source]}</span>
                  <strong>{item.dealPrice?.amount ? `${item.dealPrice.amount.toLocaleString("ko-KR")}원` : "가격 정보 없음"}</strong>
                  <small>추천 {formatMetric(item.reactions.likes)} · 댓글 {formatMetric(item.reactions.comments)}</small>
                </a>
              );
            })}
          </div>
        ) : <div className="history-empty"><p>현재 확인된 다른 출처가 없습니다.</p></div>}
      </section>
    </AppShell>
  );
}
