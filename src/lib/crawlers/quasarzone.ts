import { createApprovedFeedConnector } from "./approved-feed";

export const quasarzoneConnector = createApprovedFeedConnector({
  id: "quasarzone",
  feedUrlEnv: "QUASARZONE_FEED_URL",
  feedTokenEnv: "QUASARZONE_FEED_TOKEN",
  missingMessage: "공개 목록은 Cloudflare 봇 확인으로 차단됩니다. 제휴 또는 승인 피드 URL이 필요합니다."
});
