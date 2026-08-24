import { SOURCE_LABELS } from "@/lib/deals/presentation";
import type { SourceHealth, SourceStatus } from "@/lib/deals/types";
import { MaterialIcon } from "./material-icon";

const MODE_NAMES: Record<SourceHealth["mode"], string> = {
  public_page: "공개 페이지",
  official_api: "공식 API",
  approved_feed: "제휴 피드"
};

const GROUPS: Array<{
  id: string;
  title: string;
  description: string;
  statuses: SourceStatus[];
  icon: string;
}> = [
  {
    id: "connected",
    title: "연결됨",
    description: "최근 수집이 정상적으로 끝난 소스",
    statuses: ["success"],
    icon: "check_circle"
  },
  {
    id: "setup",
    title: "설정 필요",
    description: "API 키나 제휴 설정이 필요한 소스",
    statuses: ["needs_credentials", "disabled"],
    icon: "key"
  },
  {
    id: "unavailable",
    title: "확인 필요",
    description: "접근 제한 또는 수집 오류가 발생한 소스",
    statuses: ["blocked", "error"],
    icon: "warning"
  }
];

export function SourcePanel({ sources }: { sources: SourceHealth[] }) {
  return (
    <section className="source-panel" aria-label="수집 소스 상태">
      <div className="status-summary">
        {GROUPS.map((group) => {
          const count = sources.filter((source) => group.statuses.includes(source.status)).length;
          return (
            <div key={group.id}>
              <span>{group.title}</span>
              <strong>{count}</strong>
            </div>
          );
        })}
      </div>

      <div className="status-groups">
        {GROUPS.map((group) => {
          const items = sources.filter((source) => group.statuses.includes(source.status));
          return (
            <details className={`status-group status-${group.id}`} key={group.id} open={group.id === "connected"}>
              <summary>
                <span className="status-group-icon"><MaterialIcon name={group.icon} size={19} filled={group.id === "connected"} /></span>
                <span className="status-group-copy">
                  <strong>{group.title}</strong>
                  <small>{group.description}</small>
                </span>
                <b>{items.length}</b>
                <MaterialIcon name="expand_more" size={19} className="summary-chevron" />
              </summary>
              <div className="status-source-list">
                {items.map((source) => (
                  <div className="status-source-row" key={source.source}>
                    <strong>{SOURCE_LABELS[source.source]}</strong>
                    <span>{MODE_NAMES[source.mode]}</span>
                    <span>{source.count.toLocaleString("ko-KR")}건</span>
                    <p>{source.message}</p>
                  </div>
                ))}
                {!items.length ? <p className="status-empty">해당하는 소스가 없습니다.</p> : null}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
