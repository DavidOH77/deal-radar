# 딜레이더 MVP

알구몬, 어미새, 펨코, 뽐뿌, 퀘이사존과 네이버쇼핑, 11번가, 쿠팡, G마켓, SSG의 딜 후보를 한 형식으로 수집하고 가격 이력과 반응 지표로 핫딜을 검증하는 Next.js 앱입니다.

## 실행

```bash
npm install
cp .env.example .env.local
npm run dev
```

환경변수 없이도 알구몬, 어미새, 펨코 베스트, 뽐뿌 공개 목록 수집은 동작합니다. 첫 화면 진입 또는 새로고침 버튼으로 로컬 수집이 실행되고 결과는 `data/crawl-store.json`에 저장됩니다.

## 소스 연결

| 소스 | 수집 방식 | 필요한 값 |
| --- | --- | --- |
| 알구몬 | 공개 JSON-LD | 없음 |
| 어미새 | 공개 쇼핑정보 목록 | 없음, 5초 crawl-delay 준수 |
| 펨코 | robots.txt가 허용한 `/best`의 핫딜 항목 | 없음 |
| 뽐뿌 | 공개 뽐뿌게시판 | 없음 |
| 퀘이사존 | 승인된 제휴/데이터 피드 | `QUASARZONE_FEED_URL`, 선택 `QUASARZONE_FEED_TOKEN` |
| 네이버쇼핑 | 공식 쇼핑 검색 API | `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` |
| 11번가 | 공식 상품 검색 API | `ELEVENST_API_KEY` |
| 쿠팡 | 쿠팡 파트너스 골드박스 API | `COUPANG_ACCESS_KEY`, `COUPANG_SECRET_KEY`, 선택 `COUPANG_SUB_ID` |
| G마켓 | 승인된 제휴 데이터 피드 | `GMARKET_FEED_URL`, 선택 `GMARKET_FEED_TOKEN` |
| SSG | 승인된 상품/제휴 피드 | `SSG_FEED_URL`, 선택 `SSG_FEED_TOKEN` |

펨코의 `/hotdeal` 직접 수집, 11번가 쇼킹딜 공개 페이지, SSG 공개 랭킹 페이지는 robots.txt 정책상 수집하지 않습니다. 퀘이사존, 쿠팡, G마켓 공개 페이지도 서버 요청 또는 봇 확인에 막히므로 운영 수집기는 허용된 목록, 공식 API, 승인 피드만 사용합니다.

네이버쇼핑과 오픈마켓의 상위 노출은 곧바로 핫딜이라는 뜻이 아닙니다. 이 소스들은 상품과 현재가 후보를 공급하고, 커뮤니티 반응 및 누적 가격 이력과 결합해 최종 순위를 정합니다.

### 승인 피드 형식

퀘이사존, G마켓, SSG 피드는 배열 또는 `{ "items": [] }` 형식을 받을 수 있습니다. `affiliateUrl`과 반응 수치는 선택 값입니다.

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
    "publishedAt": "2026-08-23T12:00:00+09:00",
    "reactions": { "likes": 42, "comments": 11, "views": 5200, "purchases": 18 }
  }]
}
```

## 제휴 링크

쿠팡 파트너스 API가 돌려준 URL은 제휴 URL로 저장됩니다. 11번가, G마켓, 네이버쇼핑, SSG는 제휴사에서 받은 딥링크 형식을 환경변수 템플릿으로 설정할 수 있습니다. 승인 피드가 `affiliateUrl`을 직접 제공하면 그 값을 우선 사용합니다.

```dotenv
AFFILIATE_11ST_ID=your-media-id
AFFILIATE_11ST_TEMPLATE=https://affiliate.example/deeplink?media={id}&url={url}
```

목록에는 항상 내부 `/go/{dealId}` 링크를 사용합니다. 클릭 시점에 제휴 링크를 만들고 클릭 이벤트를 기록하며, 설정이 없으면 원본 상품 URL로 이동합니다.

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
