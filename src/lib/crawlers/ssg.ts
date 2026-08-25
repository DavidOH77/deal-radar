import { createApprovedFeedConnector } from "./approved-feed";
import { COMMERCE_MIN_DISCOUNT_RATE } from "./commerce-policy";

export const ssgConnector = createApprovedFeedConnector({
  id: "ssg",
  feedUrlEnv: "SSG_FEED_URL",
  feedTokenEnv: "SSG_FEED_TOKEN",
  missingMessage: "SSG robots.txt는 일반 봇 수집을 막습니다. 승인된 상품/제휴 피드 URL이 필요합니다.",
  minimumDiscountRate: COMMERCE_MIN_DISCOUNT_RATE
});
