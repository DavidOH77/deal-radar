import { createApprovedFeedConnector } from "./approved-feed";
import { COMMERCE_MIN_DISCOUNT_RATE } from "./commerce-policy";

export const auctionConnector = createApprovedFeedConnector({
  id: "auction",
  feedUrlEnv: "AUCTION_FEED_URL",
  feedTokenEnv: "AUCTION_FEED_TOKEN",
  missingMessage: "옥션 올킬 페이지는 서버 요청에 봇 확인을 반환합니다. 승인된 상품/제휴 피드 URL이 필요합니다.",
  minimumDiscountRate: COMMERCE_MIN_DISCOUNT_RATE
});
