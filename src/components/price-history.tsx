import type { PriceSnapshot } from "@/lib/deals/types";

export function PriceHistory({ snapshots }: { snapshots: PriceSnapshot[] }) {
  const sorted = [...snapshots].sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  if (sorted.length < 2) {
    return (
      <div className="history-empty">
        <strong>가격 기록이 더 필요합니다</strong>
        <p>같은 상품의 가격이 두 번 이상 수집되면 변화 추이를 표시합니다.</p>
      </div>
    );
  }

  const width = 640;
  const height = 160;
  const padding = 12;
  const amounts = sorted.map((item) => item.amount);
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const range = Math.max(1, max - min);
  const points = sorted.map((item, index) => {
    const x = padding + (index / Math.max(1, sorted.length - 1)) * (width - padding * 2);
    const y = padding + ((max - item.amount) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="price-history">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${sorted.length}회 가격 기록 그래프`}>
        <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="history-range">
        <span>최저 {min.toLocaleString("ko-KR")}원</span>
        <span>최고 {max.toLocaleString("ko-KR")}원</span>
      </div>
    </div>
  );
}
