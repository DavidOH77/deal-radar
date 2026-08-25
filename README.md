# 딜레이더 MVP

알구몬, 어미새, 덬딜, 여성시대, 에펨코리아, 뽐뿌, 퀘이사존과 네이버쇼핑, 11번가, 쿠팡, G마켓, 옥션, SSG, 올리브영의 딜 후보를 한 형식으로 수집하고 가격 이력과 반응 지표로 핫딜을 검증하는 Next.js 앱입니다.

## 실행

```bash
npm install
cp .env.example .env.local
npm run dev
```

환경변수 없이도 알구몬, 어미새, 덬딜, 여성시대 세일정보, 에펨코리아 베스트, 뽐뿌 공개 목록 수집은 동작합니다. 첫 화면 진입 또는 새로고침 버튼으로 로컬 수집이 실행되고 결과는 `data/crawl-store.json`에 저장됩니다.

## 소스 연결

| 소스 | 수집 방식 | 필요한 값 |
| --- | --- | --- |
| 알구몬 | 공개 JSON-LD | 없음 |
| 어미새 | 공개 쇼핑정보 목록 | 없음, 5초 crawl-delay 준수 |
| 덬딜 | 더쿠의 공개 핫딜 목록과 원문 리다이렉트 | 없음 |
| 여성시대 | 공개 세일정보 목록과 게시글 메타데이터 | 없음 |
| 에펨코리아 | robots.txt가 허용한 `/best`의 핫딜 항목 | 없음 |
| 뽐뿌 | 공개 뽐뿌게시판 | 없음 |
| 퀘이사존 | 승인 피드 또는 네이버 공식 웹문서 검색 API | `QUASARZONE_FEED_URL` 또는 `NAVER_SEARCH_CLIENT_ID`, `NAVER_SEARCH_CLIENT_SECRET` |
| 네이버쇼핑 | 승인 프로모션 피드 또는 공식 쇼핑 검색 API | `NAVER_PROMOTION_FEED_URL` 또는 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` |
| 11번가 | 공식 상품 검색 API | `ELEVENST_API_KEY` |
| 쿠팡 | 쿠팡 파트너스 골드박스 API | `COUPANG_ACCESS_KEY`, `COUPANG_SECRET_KEY`, 선택 `COUPANG_SUB_ID` |
| G마켓 | 승인된 제휴 데이터 피드 | `GMARKET_FEED_URL`, 선택 `GMARKET_FEED_TOKEN` |
| 옥션 | 승인된 제휴 데이터 피드 | `AUCTION_FEED_URL`, 선택 `AUCTION_FEED_TOKEN` |
| SSG | 승인된 상품/제휴 피드 | `SSG_FEED_URL`, 선택 `SSG_FEED_TOKEN` |
| 올리브영 | 승인된 오특 상품 피드 | `OLIVEYOUNG_FEED_URL`, 선택 `OLIVEYOUNG_FEED_TOKEN` |

에펨코리아의 `/hotdeal` 직접 수집, 11번가 쇼킹딜 공개 페이지, SSG 공개 랭킹 페이지는 robots.txt 정책상 수집하지 않습니다. 퀘이사존, 쿠팡, G마켓, 옥션, 올리브영 공개 페이지도 서버 요청 또는 봇 확인에 막히므로 운영 수집기는 허용된 목록, 공식 API, 승인 피드만 사용합니다. 퀘이사존은 승인 피드를 우선하고, 피드가 없으면 네이버 웹문서 검색 API 결과 중 정확한 핫딜 URL과 게시 시각이 확인되는 글만 보조 수집합니다. 덬딜과 여성시대는 본문을 저장하지 않고 공개 목록 메타데이터만 수집합니다. 덬딜의 판매 이동에는 더쿠의 자체 리다이렉트를 유지합니다.

네이버쇼핑과 오픈마켓의 상위 노출은 곧바로 핫딜이라는 뜻이 아닙니다. 일반 상품 검색과 피드는 판매가와 정상가가 모두 있고 할인율이 40% 이상일 때만 공개 딜로 저장합니다. 네이버 쇼핑 검색 API의 `hprice`는 정상가가 아니라 검색 결과의 최고가이므로 할인 기준가로 사용하지 않습니다. 골드박스·오특·올킬·슈퍼딜처럼 판매처가 직접 편성한 특가 섹션은 승인 피드의 `curatedHotdeal` 근거로 별도 통과시킬 수 있습니다.

### 승인 피드 형식

퀘이사존과 오픈마켓 승인 피드는 배열 또는 `{ "items": [] }` 형식을 받을 수 있습니다. `affiliateUrl`, `curatedHotdeal`, 반응 수치는 선택 값입니다. 쇼핑몰 일반 상품은 `originalPrice` 대비 40% 이상이어야 하며, 공식 특가 섹션 상품만 `curatedHotdeal: true`로 표시합니다.

```json
{
  "items": [{
    "id": "deal-123",
    "title": "상품명과 할인가",
    "url": "https://source.example/deal-123",
    "productUrl": "https://seller.example/product-123",
    "affiliateUrl": "https://affiliate.example/product-123",
    "imageUrl": "https://cdn.example/product-123.jpg",
    "category": "디지털",
    "price": 99000,
    "originalPrice": 129000,
    "curatedHotdeal": true,
    "publishedAt": "2026-08-23T12:00:00+09:00",
    "reactions": { "likes": 42, "comments": 11, "views": 5200, "purchases": 18 }
  }]
}
```

## 제휴 링크

제휴 처리는 커뮤니티 출처가 아니라 최종 `productUrl`의 판매처 도메인을 기준으로 클릭 시점에 수행합니다. 따라서 뽐뿌에서 수집한 글이어도 상품 링크가 11번가라면 11번가 규칙을 적용하고, 글의 원래 출처와 랭킹 데이터는 그대로 보존합니다.

처리 우선순위는 다음과 같습니다.

1. 공식 API나 승인 피드가 제공한 `affiliateUrl`
2. 쿠팡 상품 URL의 파트너스 딥링크 API 변환
3. 판매처가 승인한 추적 쿼리 키와 매체 값
4. 제휴사가 제공한 딥링크 템플릿
5. 설정이 없거나 변환에 실패하면 원본 상품 URL

쿠팡은 `COUPANG_ACCESS_KEY`, `COUPANG_SECRET_KEY`, 선택 `COUPANG_SUB_ID`로 딥링크를 생성합니다. 첫 변환 결과는 서버 메모리에 기본 7일 캐시하고 API가 늦거나 실패하면 2.5초 안에 원본 URL로 폴백합니다. 11번가, G마켓, 옥션, 네이버쇼핑, SSG, 올리브영은 제휴사에서 발급받은 쿼리 키 또는 딥링크 형식을 환경변수로 설정합니다. 임의로 추정한 파라미터는 정산을 보장하지 않으므로 등록하지 않습니다.

```dotenv
AFFILIATE_11ST_ID=your-media-id
AFFILIATE_11ST_QUERY_KEY=partner_issued_key
# QUERY_VALUE를 생략하면 AFFILIATE_11ST_ID를 사용합니다.
AFFILIATE_11ST_QUERY_VALUE=
AFFILIATE_11ST_TEMPLATE=https://affiliate.example/deeplink?media={id}&url={url}
```

쿼리 방식은 해당 판매처 도메인에만 적용하고 기존 상품 파라미터와 해시를 보존합니다. `url`, `redirect`, `returnUrl`처럼 이동 대상을 바꿀 수 있는 키와 유사 도메인은 거부합니다. 템플릿의 `{url}`은 URL 인코딩되고 `{id}`에는 매체 ID가 들어갑니다.

목록에는 항상 내부 `/go/{dealId}` 링크를 사용합니다. 클릭 집계에는 원 커뮤니티 출처와 함께 최종 판매처, `provided_url`·`coupang_api`·`query`·`template`·`direct` 처리 방식을 기록해 판매처별 제휴 전환 여부를 확인할 수 있습니다.

## 판정 원칙

- 판매처의 취소선 가격만 있으면 기준가 신뢰도는 낮음이며 S/A급으로 판정하지 않습니다.
- 동일 상품 가격을 최소 24시간에 걸쳐 3회 수집하면 90일 중앙가를 사용합니다.
- 7일 이상에 걸친 8회 이상 관측은 높은 신뢰도로 승격합니다.
- 가격 근거가 없으면 커뮤니티 반응이 높아도 `관찰` 상태를 유지합니다.

## 실시간 랭킹

기본 정렬은 추천을 핵심 신호로 두고 게시 후 경과 시간, 댓글, 구매 반응을 조합한 랭킹입니다.

- 추천은 가장 큰 가중치를 적용하며 추천 1개가 조회 수천 회보다 강하게 반영됩니다.
- 댓글과 구매는 보조 신호로 사용합니다.
- 조회는 능동 반응이 있는 딜의 신뢰 보조와 동률 해소에만 제한적으로 사용합니다.
- 조회 증가만으로는 급상승 딜이 될 수 없습니다.
- 게시 후 시간이 지날수록 감쇠해 같은 추천 반응이면 최근 딜을 우선합니다.
- 가격 신뢰도와 할인율은 랭킹이 아니라 별도의 핫딜 검증 점수에 반영합니다.

## 1시간 수집

무료 Vercel Hobby 플랜은 자체 Cron을 하루 한 번만 실행할 수 있습니다. `vercel.json`의 Cron은 매일 03:17 KST에 백업 수집을 실행하고, Mac `launchd` 서비스가 매시간 실제 커뮤니티 수집을 수행해 운영 Redis를 갱신합니다. Vercel 데이터센터 IP는 현재 공개 커뮤니티 4곳에서 차단되므로 Mac 수집기가 운영 데이터 갱신의 기본 실행 주체입니다. `.github/workflows/hourly-crawl.yml`은 매시 운영 헬스체크를 실행합니다.

운영 데이터는 Vercel Marketplace에서 연결한 Upstash Redis에 저장합니다. `KV_REST_API_URL`, `KV_REST_API_TOKEN`이 있으면 Redis를 우선 사용하고, Redis가 없는 기존 배포에서는 비공개 Vercel Blob을 대체 저장소로 사용합니다. 로컬에서는 클라우드 환경변수와 무관하게 기존 `data/crawl-store.json`을 사용합니다.

수집 시작 시 저장소에 8분짜리 lease를 먼저 기록하므로 서로 다른 서버리스 인스턴스가 같은 크론을 동시에 받아도 한 번만 실행됩니다. 실행이 중단되어 lease가 만료되면 다음 크론이 기존 실행을 `failed`로 기록하고 수집을 재개합니다. `CRAWL_LEASE_TTL_MS`는 Vercel 함수의 최대 실행 시간보다 길게 설정해야 합니다.

외부 GET 요청은 기본 12초 타임아웃이며 429, 408과 일시적인 5xx 응답을 최대 2회 재시도합니다. 다음 값으로 운영 환경에 맞게 조정할 수 있습니다.

```dotenv
CRAWLER_TIMEOUT_MS=12000
CRAWLER_FETCH_RETRIES=2
CRAWLER_RETRY_BASE_MS=400
CRAWL_CONCURRENCY=4
CRAWL_LEASE_TTL_MS=480000
CRAWL_INTERVAL_MINUTES=60
HEALTH_MAX_CRAWL_AGE_MINUTES=150
```

로컬 `npm run dev`에서는 서버가 1분마다 마지막 전체 수집 시각을 확인하고, `CRAWL_INTERVAL_MINUTES`가 지나면 자동 수집합니다. 랭킹 화면도 1분마다 `/api/deals`를 다시 읽고 탭으로 돌아오는 즉시 동기화합니다. 운영 환경에서는 Mac 수집기가 시간별 실행 주체이고, Vercel Cron은 공식 API나 승인 피드가 연결됐을 때 하루 한 번 백업 실행을 담당합니다. 페이지/API의 만기 확인도 누락된 크론을 보완합니다.

## macOS 백그라운드 서버

이 Mac에서 로그인과 동시에 프로덕션 서버를 시작하고 종료 시 자동 재시작하려면 다음 스크립트를 사용합니다.

```bash
npm run build
./scripts/install-macos-service.sh
```

서비스는 `127.0.0.1:3000`에서 실행되고 `ENABLE_LOCAL_SCHEDULER=1`로 시간당 수집을 유지합니다. `USE_CLOUD_STORE=1`이 설정되어 수집 결과는 배포 사이트와 같은 Redis에 저장됩니다. AC 전원 연결 중에는 `caffeinate -s`가 시스템 잠자기를 막습니다. 화면 잠금은 가능하며 배터리 사용 중에는 macOS 전원 설정에 따라 잠들 수 있습니다.

```bash
launchctl print gui/$(id -u)/com.dealradar.server
tail -f ~/Library/Logs/deal-radar.log
./scripts/uninstall-macos-service.sh
```

Vercel Hobby 플랜은 하루 1회보다 잦은 크론을 허용하지 않으므로 1시간 실행에는 Pro 플랜 또는 동일 엔드포인트를 호출하는 외부 스케줄러가 필요합니다. 크론은 Production 배포에서만 자동 실행됩니다.

## API

- `GET /api/deals`: 저장된 딜과 최신 소스 상태
- `GET /api/deals?refresh=1`: 개발 환경에서 즉시 수집 후 반환
- `POST /api/crawl`: 수집 실행, 운영 환경은 `Authorization: Bearer $CRON_SECRET` 필요
- `GET /api/cron/crawl`: 인증된 스케줄러가 호출하는 전체 수집 경로
- `GET /api/sources`: 최근 20회 수집 결과와 활성 lease, 운영 환경은 인증 필요
- `GET /api/health`: 저장소, 마지막 정상 수집 시각, 소스와 데이터 상태를 반환하는 공개 헬스체크
- `GET /go/:dealId`: 클릭 기록 후 제휴/원본 URL로 이동

모든 API 응답에는 장애 추적용 `x-request-id`가 포함됩니다. `/api/health`는 마지막 정상 수집이 기본 150분을 넘거나 영속 저장소가 설정되지 않은 운영 배포에서 `503`을 반환합니다.

`/go`는 판매처 이동을 먼저 응답하고 클릭 기록은 응답 이후 처리합니다. 클릭 데이터는 날짜·딜·제휴 여부 단위로 집계하며, Redis 분산 뮤텍스로 크롤 결과와 클릭 기록의 동시 갱신을 직렬화합니다. 사용자 계정·외부 알림·상세 분석이 붙는 시점에는 같은 저장소 인터페이스를 Postgres와 작업 큐로 확장하는 편이 안전합니다.
