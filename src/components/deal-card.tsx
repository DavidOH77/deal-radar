"use client";

import Image from "next/image";
import Link from "next/link";
import type { Deal } from "@/lib/deals/types";
import { formatMetric, presentDeal, relativeTime } from "@/lib/deals/presentation";
import { dealDetailPath } from "@/lib/deals/routing";
import { MaterialIcon } from "./material-icon";

function money(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`;
}

function ReactionMetrics({ deal }: { deal: Deal }) {
  const items = [
    { value: deal.reactions.likes, label: "추천" },
    { value: deal.reactions.comments, label: "댓글" },
    { value: deal.reactions.views, label: "조회" },
    { value: deal.reactions.purchases, label: "구매" }
  ].filter((item) => item.value !== undefined);

  return (
    <div className="reaction-metrics" role="group" aria-label="반응 지표">
      {items.map(({ value, label }) => (
        <span key={label}>{label} {formatMetric(value)}</span>
      ))}
    </div>
  );
}

function DealMedia({ deal, eager, compact = false, title }: { deal: Deal; eager: boolean; compact?: boolean; title: string }) {
  return (
    <div className={`product-media ${compact ? "is-compact" : ""}`}>
      {deal.imageUrl ? (
        <Image
          src={deal.imageUrl}
          alt={title}
          fill
          sizes={compact ? "(max-width: 760px) 64px, 64px" : "(max-width: 760px) 88px, 128px"}
          className="product-image"
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
        />
      ) : (
        <MaterialIcon name="image_not_supported" size={compact ? 22 : 28} label="상품 이미지 없음" />
      )}
    </div>
  );
}

function SaveButton({ dealId, saved, onToggleSaved }: { dealId: string; saved: boolean; onToggleSaved?: (id: string) => void }) {
  if (!onToggleSaved) return null;

  return (
    <button
      className={`save-button ${saved ? "is-saved" : ""}`}
      type="button"
      onClick={() => onToggleSaved(dealId)}
      aria-label={saved ? "저장 해제" : "딜 저장"}
      title={saved ? "저장 해제" : "딜 저장"}
    >
      <MaterialIcon name="favorite" size={20} filled={saved} />
    </button>
  );
}

export function DealCard({
  deal,
  referenceTime,
  eager = false,
  rank,
  featured = false,
  saved = false,
  reason,
  onToggleSaved
}: {
  deal: Deal;
  referenceTime: string;
  eager?: boolean;
  rank?: number;
  featured?: boolean;
  saved?: boolean;
  reason?: string;
  onToggleSaved?: (id: string) => void;
}) {
  const presented = presentDeal(deal);
  const discount = deal.score.discountRate ? Math.round(deal.score.discountRate * 100) : undefined;
  const linkLabel = `${presented.title}, 판매처로 이동`;

  if (featured) {
    return (
      <article className="deal-card deal-card-featured">
        <a
          className="deal-row-link"
          href={deal.outboundUrl}
          target="_blank"
          rel="nofollow sponsored noopener"
          aria-label={linkLabel}
        />
        <div className="rank-number" aria-label={`인기 ${rank ?? 1}위`}>{rank ?? 1}</div>
        <DealMedia deal={deal} eager={eager} title={presented.title} />
        <div className="deal-content">
          <div className="deal-meta">
            {presented.seller ? <span className="seller">{presented.seller}</span> : null}
            <span>{presented.category}</span>
            <span>{relativeTime(deal.publishedAt, referenceTime)}</span>
            {deal.trend?.rising ? <span className="trend-label">급상승</span> : null}
          </div>
          <h2>{presented.title}</h2>
          <div className="price-row">
            {deal.dealPrice?.amount ? <strong>{money(deal.dealPrice.amount)}</strong> : null}
            {presented.shippingLabel ? <span className="shipping-label">{presented.shippingLabel}</span> : null}
            {discount ? <span className="discount">-{discount}%</span> : null}
            {deal.unitPriceLabel ? <span className="unit-price">{deal.unitPriceLabel}</span> : null}
          </div>
          {reason ? (
            <div className={`ranking-reason ${deal.baseline.amount ? "is-verified" : ""}`}>
              {deal.baseline.amount ? <MaterialIcon name="check" size={15} /> : null}
              <span>{reason}</span>
            </div>
          ) : null}
          <ReactionMetrics deal={deal} />
        </div>
        <div className="deal-action-zone">
          <Link className="detail-button" href={dealDetailPath(deal)} aria-label="딜 상세" title="딜 상세">
            <MaterialIcon name="info" size={19} />
          </Link>
          <SaveButton dealId={deal.id} saved={saved} onToggleSaved={onToggleSaved} />
        </div>
      </article>
    );
  }

  return (
    <article className={`deal-card deal-card-compact ${rank ? "is-ranked" : "is-unranked"}`}>
      <a
        className="deal-row-link"
        href={deal.outboundUrl}
        target="_blank"
        rel="nofollow sponsored noopener"
        aria-label={linkLabel}
      />
      <div className={`rank-number ${rank ? "" : "rank-placeholder"}`} aria-label={rank ? `인기 ${rank}위` : undefined} aria-hidden={rank ? undefined : true}>
        {rank ?? ""}
      </div>
      <div className="compact-product">
        <DealMedia deal={deal} eager={eager} compact title={presented.title} />
        <div className="compact-copy">
          <div className="deal-meta">
            {presented.seller ? <span className="seller">{presented.seller}</span> : null}
            <span>{presented.category}</span>
            <span>{relativeTime(deal.publishedAt, referenceTime)}</span>
            {deal.trend?.rising ? <span className="trend-label">급상승</span> : null}
          </div>
          <h2>{presented.title}</h2>
          <div className="compact-mobile-facts">
            {presented.seller ? <span className="mobile-seller">{presented.seller}</span> : null}
            {deal.dealPrice?.amount ? <strong>{money(deal.dealPrice.amount)}</strong> : null}
            {presented.shippingLabel ? <span>{presented.shippingLabel}</span> : null}
            {discount ? <span className="discount">-{discount}%</span> : null}
          </div>
          <div className="compact-mobile-meta">
            <span>{presented.category}</span>
            <span>{relativeTime(deal.publishedAt, referenceTime)}</span>
            {deal.reactions.likes !== undefined ? <span>추천 {formatMetric(deal.reactions.likes)}</span> : null}
            {deal.reactions.comments !== undefined ? <span>댓글 {formatMetric(deal.reactions.comments)}</span> : null}
          </div>
          <ReactionMetrics deal={deal} />
        </div>
      </div>
      <div className="compact-trailing">
        <div className="compact-price">
          {deal.dealPrice?.amount ? <strong>{money(deal.dealPrice.amount)}</strong> : null}
          {presented.shippingLabel ? <span className="shipping-label">{presented.shippingLabel}</span> : null}
          {discount ? <span className="discount">-{discount}%</span> : null}
        </div>
        <Link className="detail-button" href={dealDetailPath(deal)} aria-label="딜 상세" title="딜 상세">
          <MaterialIcon name="info" size={18} />
        </Link>
        <SaveButton dealId={deal.id} saved={saved} onToggleSaved={onToggleSaved} />
      </div>
    </article>
  );
}
