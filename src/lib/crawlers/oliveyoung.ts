import { createApprovedFeedConnector } from "./approved-feed";

export const oliveyoungConnector = createApprovedFeedConnector({
  id: "oliveyoung",
  feedUrlEnv: "OLIVEYOUNG_FEED_URL",
  feedTokenEnv: "OLIVEYOUNG_FEED_TOKEN",
  missingMessage: "올리브영 오특 페이지는 서버 요청에 Cloudflare 확인을 반환합니다. 승인된 오특 상품 피드 URL이 필요합니다.",
  curatedByDefault: true,
  defaultCategory: "뷰티"
});
