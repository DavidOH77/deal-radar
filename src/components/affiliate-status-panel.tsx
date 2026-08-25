import type { AffiliateConfigurationStatus } from "@/lib/deals/affiliate";
import type { AffiliateMethod, CommerceProvider } from "@/lib/deals/types";
import { MaterialIcon } from "./material-icon";

const PROVIDER_LABELS: Record<CommerceProvider, string> = {
  coupang: "쿠팡",
  elevenst: "11번가",
  gmarket: "G마켓",
  auction: "옥션",
  naver: "네이버쇼핑",
  ssg: "SSG",
  oliveyoung: "올리브영"
};

const METHOD_LABELS: Record<AffiliateMethod, string> = {
  provided_url: "승인 URL",
  coupang_api: "딥링크 API",
  query: "추적 쿼리",
  template: "딥링크 템플릿",
  direct: "원본 링크"
};

export function AffiliateStatusPanel({ statuses }: { statuses: AffiliateConfigurationStatus[] }) {
  const configured = statuses.filter((status) => status.configured).length;
  return (
    <section className="source-panel" aria-label="제휴 링크 상태">
      <div className="status-summary">
        <div><span>제휴 연결</span><strong>{configured}</strong></div>
        <div><span>원본 폴백</span><strong>{statuses.length - configured}</strong></div>
        <div><span>지원 판매처</span><strong>{statuses.length}</strong></div>
      </div>
      <div className="status-groups">
        <details className={`status-group ${configured ? "status-connected" : "status-setup"}`} open>
          <summary>
            <span className="status-group-icon"><MaterialIcon name="conversion_path" size={19} /></span>
            <span className="status-group-copy">
              <strong>제휴 링크 변환</strong>
              <small>비밀값은 표시하지 않고 활성 방식만 확인합니다.</small>
            </span>
            <b>{configured}</b>
            <MaterialIcon name="expand_more" size={19} className="summary-chevron" />
          </summary>
          <div className="status-source-list">
            {statuses.map((status) => (
              <div className="status-source-row" key={status.provider}>
                <strong>{PROVIDER_LABELS[status.provider]}</strong>
                <span>{METHOD_LABELS[status.method]}</span>
                <span>{status.configured ? "연결됨" : "미설정"}</span>
                <p>{status.configured ? "판매처 링크를 클릭 시점에 변환합니다." : "설정 전에는 원본 상품 URL로 이동합니다."}</p>
              </div>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}
