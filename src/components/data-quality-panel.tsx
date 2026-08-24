import { SOURCE_LABELS } from "@/lib/deals/presentation";
import { measureDealQuality } from "@/lib/deals/quality";
import type { Deal } from "@/lib/deals/types";

function percent(value: number, total: number): number {
  return total ? Math.round((value / total) * 100) : 0;
}

export function DataQualityPanel({ deals }: { deals: Deal[] }) {
  const quality = measureDealQuality(deals);
  const pricedRate = percent(quality.priced, quality.total);
  const duplicateRate = percent(quality.duplicateCount, quality.total);

  const metrics = [
    { label: "가격 추출", value: `${pricedRate}%`, detail: `${quality.priced}/${quality.total}건`, target: "목표 80%", status: pricedRate >= 80 ? "good" : "warning" },
    { label: "중복 노출", value: `${duplicateRate}%`, detail: `${quality.duplicateCount}건`, target: "목표 2% 이하", status: duplicateRate <= 2 ? "good" : "warning" },
    { label: "이미지 누락", value: `${quality.missingImage}건`, detail: `${percent(quality.missingImage, quality.total)}%`, target: "목표 2% 이하", status: percent(quality.missingImage, quality.total) <= 2 ? "good" : "warning" },
    { label: "제목 가격 잔여", value: `${quality.titlePriceResidue}건`, detail: "표시 제목 기준", target: "목표 0건", status: quality.titlePriceResidue === 0 ? "good" : "warning" }
  ];

  return (
    <section className="quality-panel" aria-labelledby="quality-title">
      <div className="section-heading">
        <div>
          <h2 id="quality-title">데이터 품질</h2>
          <p>공개 피드의 출시 기준을 현재 저장 데이터로 계산합니다.</p>
        </div>
      </div>

      <div className="quality-metrics">
        {metrics.map((metric) => (
          <div className={`quality-metric is-${metric.status}`} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.detail}</small>
            <em>{metric.target}</em>
          </div>
        ))}
      </div>

      <div className="source-quality-table">
        <div className="source-quality-head">
          <span>소스</span>
          <span>수집</span>
          <span>가격 추출</span>
          <span>이미지 누락</span>
        </div>
        {quality.sources.map((source) => (
          <div className="source-quality-row" key={source.source}>
            <strong>{SOURCE_LABELS[source.source]}</strong>
            <span>{source.total}건</span>
            <span className={percent(source.priced, source.total) >= 80 ? "is-good" : "is-warning"}>
              {percent(source.priced, source.total)}% <small>{source.priced}/{source.total}</small>
            </span>
            <span>{source.missingImage}건</span>
          </div>
        ))}
      </div>
    </section>
  );
}
