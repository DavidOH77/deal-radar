"use client";

import Image from "next/image";
import type { Deal } from "@/lib/deals/types";
import { formatMetric, presentDeal, relativeTime, SOURCE_LABELS } from "@/lib/deals/presentation";
import { dealOriginalPath } from "@/lib/deals/routing";
import { MaterialIcon } from "./material-icon";

const COMMUNITY_LABELS = new Set([
  "알구몬",
  "어미새",
  "덬딜",
  "더쿠",
  "여성시대",
  "에펨코리아",
  "펨코",
  "뽐뿌",
  "퀘이사존"
]);

function money(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`;
}

function visibleSeller(deal: Deal, seller?: string): string | undefined {
  if (!seller) return undefined;
  if (seller === SOURCE_LABELS[deal.source] || COMMUNITY_LABELS.has(seller)) return undefined;
  return seller;
}

function DealMedia({ deal, eager, title }: { deal: Deal; eager: boolean; title: string }) {
  return (
    <div className="product-media">
      {deal.imageUrl ? (
        <Image
          src={deal.imageUrl}
          alt={title}
          fill
          sizes="(max-width: 620px) 84px, 76px"
          className="product-image"
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
        />
      ) : (
        <MaterialIcon name="image_not_supported" size={22} label="상품 이미지 없음" />
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
      <MaterialIcon name="favorite" size={18} filled={saved} />
    </button>
  );
}

function ReactionSummary({ deal, reason }: { deal: Deal; reason?: string }) {
  const secondary = [
    deal.reactions.comments !== undefined ? `댓글 ${formatMetric(deal.reactions.comments)}` : undefined,
    deal.reactions.views !== undefined ? `조회 ${formatMetric(deal.reactions.views)}` : undefined,
    deal.reactions.purchases !== undefined ? `구매 ${formatMetric(deal.reactions.purchases)}` : undefined
  ].filter(Boolean);

  return (
    <div className="reaction-copy" aria-label="반응 지표">
      {deal.reactions.likes !== undefined ? <strong>추천 {formatMetric(deal.reactions.likes)}</strong> : <strong className="is-muted">새로 등록</strong>}
      {secondary.length ? <span>{secondary.join(" · ")}</span> : null}
      {reason ? <em>{reason}</em> : null}
    </div>
  );
}

export function DealCard({
  deal,
  referenceTime,
  eager = false,
  rank,
  saved = false,
  reason,
  onToggleSaved
}: {
  deal: Deal;
  referenceTime: string;
  eager?: boolean;
  rank?: number;
  saved?: boolean;
  reason?: string;
  onToggleSaved?: (id: string) => void;
}) {
  const presented = presentDeal(deal);
  const seller = visibleSeller(deal, presented.seller);
  const verifiedDiscount = deal.baseline.amount && ["high", "medium"].includes(deal.baseline.confidence) && deal.score.discountRate
    ? Math.round(deal.score.discountRate * 100)
    : undefined;
  const facts = [seller, deal.unitPriceLabel].filter(Boolean);
  const linkLabel = `${presented.title}, 판매처로 이동`;

  return (
    <article className={`deal-card deal-ledger-row ${rank && rank <= 3 ? "is-top" : ""} ${rank ? "is-ranked" : "is-unranked"}`}>
      <a
        className="deal-row-link"
        href={deal.outboundUrl}
        target="_blank"
        rel="nofollow sponsored noopener"
        aria-label={linkLabel}
      />
      {rank ? <div className="rank-number" aria-label={`랭킹 ${rank}위`}>{rank}</div> : null}
      <DealMedia deal={deal} eager={eager} title={presented.title} />
      <div className="deal-copy">
        <div className="deal-meta">
          <span>{presented.category}</span>
          <span>{relativeTime(deal.publishedAt, referenceTime)}</span>
          {deal.trend?.rising ? <em>급상승</em> : null}
        </div>
        <h2>{presented.title}</h2>
        {facts.length ? <p>{facts.join(" · ")}</p> : null}
      </div>
      <div className="purchase-copy">
        {deal.dealPrice?.amount ? <strong>{money(deal.dealPrice.amount)}</strong> : null}
        <span>
          {presented.shippingLabel}
          {verifiedDiscount ? <em>{presented.shippingLabel ? " · " : ""}-{verifiedDiscount}%</em> : null}
        </span>
      </div>
      <ReactionSummary deal={deal} reason={reason} />
      <div className="row-actions">
        <a
          className="detail-button"
          href={dealOriginalPath(deal)}
          target="_blank"
          rel="nofollow noopener noreferrer"
          aria-label={`${presented.title} 원문 보기`}
          title="원문에서 쿠폰과 구매 조건 확인"
        >
          <MaterialIcon name="info" size={18} />
        </a>
        <SaveButton dealId={deal.id} saved={saved} onToggleSaved={onToggleSaved} />
      </div>
    </article>
  );
}
