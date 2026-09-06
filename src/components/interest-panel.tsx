"use client";

import { useMemo, useState, type FormEvent } from "react";
import { countAlertMatches, matchesDealAlert, type DealAlert } from "@/lib/deals/preferences";
import type { Deal } from "@/lib/deals/types";
import { BrandObject } from "./brand-object";
import { DealCard } from "./deal-card";
import { MaterialIcon } from "./material-icon";

const EXAMPLES = [
  { keyword: "에어팟", maxPrice: "200000", label: "에어팟 20만원 이하" },
  { keyword: "삼겹살 1kg", maxPrice: "", label: "삼겹살 1kg" }
];

export function InterestPanel({
  deals,
  alerts,
  savedDeals,
  referenceTime,
  onAddAlert,
  onToggleAlert,
  onRemoveAlert,
  onToggleSaved
}: {
  deals: Deal[];
  alerts: DealAlert[];
  savedDeals: Deal[];
  referenceTime: string;
  onAddAlert: (keyword: string, maxPrice?: number) => void;
  onToggleAlert: (id: string) => void;
  onRemoveAlert: (id: string) => void;
  onToggleSaved: (id: string) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [builderOpen, setBuilderOpen] = useState(alerts.length > 0);
  const totalMatches = useMemo(() => countAlertMatches(deals, alerts), [alerts, deals]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanKeyword = keyword.trim();
    if (!cleanKeyword) return;
    const parsedPrice = Number(maxPrice.replaceAll(",", ""));
    onAddAlert(cleanKeyword, Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : undefined);
    setKeyword("");
    setMaxPrice("");
  }

  function chooseExample(example: (typeof EXAMPLES)[number]) {
    setBuilderOpen(true);
    setKeyword(example.keyword);
    setMaxPrice(example.maxPrice);
  }

  return (
    <div className="interest-panel">
      <section className="interest-section" aria-labelledby="interest-rules-title">
        <div className="section-heading">
          <div>
            <h2 id="interest-rules-title">관심 조건</h2>
            <p>키워드와 목표 가격에 맞는 새 딜을 알림함에 모읍니다.</p>
          </div>
          {alerts.length ? <span>{totalMatches}건 매칭</span> : null}
        </div>

        {!builderOpen && alerts.length === 0 ? (
          <div className="alert-empty">
            <BrandObject size={58} />
            <strong>첫 관심 조건을 만들어보세요</strong>
            <p>찾는 상품이 올라오면 이 화면에서 바로 확인할 수 있습니다.</p>
            <button className="primary-button" type="button" onClick={() => setBuilderOpen(true)}>
              <MaterialIcon name="add" size={18} /> 관심 조건 만들기
            </button>
            <div className="example-pills" aria-label="관심 조건 예시">
              {EXAMPLES.map((example) => (
                <button key={example.label} type="button" onClick={() => chooseExample(example)}>{example.label}</button>
              ))}
            </div>
          </div>
        ) : (
          <form className="alert-form" onSubmit={submit}>
            <label className="field-label">
              <span>관심 키워드</span>
              <span className="alert-input">
                <MaterialIcon name="search" size={18} />
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="예: 에어팟"
                />
              </span>
            </label>
            <label className="field-label">
              <span>목표 가격 <em>선택</em></span>
              <span className="alert-input price-input">
                <input
                  inputMode="numeric"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value.replace(/[^0-9,]/g, ""))}
                  placeholder="200,000"
                />
                <b>원</b>
              </span>
            </label>
            <button className="add-alert-button" type="submit" disabled={!keyword.trim()}>
              <MaterialIcon name="add" size={18} /> 조건 추가
            </button>
          </form>
        )}

        {alerts.length ? (
          <div className="alert-list">
            {alerts.map((alert) => {
              const matches = deals.filter((deal) => matchesDealAlert(deal, alert)).length;
              return (
                <div className={`alert-row ${alert.enabled ? "" : "is-disabled"}`} key={alert.id}>
                  <label className="alert-toggle">
                    <input type="checkbox" checked={alert.enabled} onChange={() => onToggleAlert(alert.id)} />
                    <span aria-hidden="true" />
                    <b>{alert.keyword}</b>
                  </label>
                  <span className="alert-condition">
                    {alert.maxPrice ? `${alert.maxPrice.toLocaleString("ko-KR")}원 이하` : "가격 제한 없음"}
                  </span>
                  <span className="alert-match">{matches}건</span>
                  <button className="row-icon-button" type="button" onClick={() => onRemoveAlert(alert.id)} aria-label={`${alert.keyword} 조건 삭제`} title="조건 삭제">
                    <MaterialIcon name="delete" size={18} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="interest-section saved-section" aria-labelledby="saved-deals-title">
        <div className="section-heading">
          <div>
            <h2 id="saved-deals-title">저장한 딜</h2>
            <p>랭킹에서 저장한 상품을 비교합니다.</p>
          </div>
          {savedDeals.length ? <span>{savedDeals.length}건</span> : null}
        </div>
        {savedDeals.length ? (
          <div className="deal-grid">
            {savedDeals.map((deal, index) => (
              <DealCard
                key={deal.id}
                deal={deal}
                referenceTime={referenceTime}
                eager={index < 2}
                saved
                onToggleSaved={onToggleSaved}
              />
            ))}
          </div>
        ) : (
          <div className="saved-empty">
            <BrandObject size={52} />
            <strong>아직 저장한 딜이 없습니다</strong>
            <p>랭킹에서 하트를 누르면 여기에 모입니다.</p>
          </div>
        )}
      </section>
    </div>
  );
}
