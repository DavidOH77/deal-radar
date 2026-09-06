# SPIKE 리뉴얼 아키텍처 재점검

> 상태: 2026-09-07 승인, Phase 0~1 보일러플레이트 구현 완료
> 점검 시각: 2026-09-07 KST
> 최신 `origin/main`에서 분리한 작업 트리에 구현했으며, 기존 운영 읽기 경로는 유지한다. Postgres migration은 연결 DB가 준비된 뒤 명시적으로 실행한다.

## 1. 현재 스냅샷

- 스택: Next.js 16, React 19, Upstash Redis, Vercel Blob, Cheerio, Pretendard
- 수집 실행: Mac LaunchAgent 시간당 작업 + Vercel 일일 cron
- 운영 health: 마지막 수집 13분 전, 6,425건, 가격 4,319건(67.2%), 이미지 누락 344건(5.4%)
- 소스 health: 정상 5, 실패 1, 설정 필요 8, 총 14
- 릴리스 상태: 로컬 `main` 이 `origin/main`보다 8개 커밋 뒤에 있고, 66개의 추적 파일에 커밋되지 않은 변경이 있다.

### 현재 흐름

```text
커뮤니티/커머스 목록
  -> 14개 SourceConnector
  -> collectSources (process 내 concurrency)
  -> runCrawl (Redis lease)
  -> normalize + baseline + score + trend
  -> deal-radar:crawl-store 단일 JSON 문서
  -> Next.js SSR/API
  -> 리스트 클릭 -> /go/:id -> 외부 판매처

관심딜/저장/알림 = 브라우저 localStorage
클릭 기록 = redirect 응답 후 `after()` 작업
```

## 2. 가장 큰 구조 문제

### P0. 로컬과 운영이 서로 다른 제품이다

운영 선행 커밋과 로컬 대규모 미커밋 변경이 공존한다. 리뉴얼을 이 상태에 쌓으면 데이터 코드와 UI 코드의 기준점이 달라진다.

**구현 전 필수 조치**

1. 로컬 변경을 의도별 커밋으로 분리한다.
2. `origin/main`의 운영 수정을 로컬 작업에 합친다.
3. 합친 결과로 현재 상태 회귀 테스트를 먼저 통과시킨다.
4. 이후 리뉴얼은 별도 `codex/renewal-*` 브랜치에서 진행한다.

### P0. 저장소가 하나의 커다란 JSON이다

`src/lib/store/file-store.ts`는 딜, 가격 스냅샷, 수집 실행, lease를 `deal-radar:crawl-store` 하나에 저장한다. 변경할 때마다 전체를 읽고 잠금한 뒤 전체를 다시 쓴다.

시간당 배치에서는 버틸 수 있지만, 5~10분 증분 수집과 즉시 알림으로 가면:

- 쓰기 경합과 lock 대기가 커진다.
- 딜 하나의 수정에도 전체 문서를 재저장한다.
- 상품별/판매처별 이력 질의와 리포트가 힘들다.
- 실패한 작업만 재시도하거나 이벤트를 재생하기 힘들다.

### P0. `Deal`이 서로 다른 개념을 합친다

현재 `Deal` 하나에 원문 게시물, 판매처 URL, 정규화된 상품명, 가격, 스코어, 기준가, 트렌드, 단위가, outbound URL이 모두 들어간다. 또한 `canonicalKey` 계산에 source와 source post ID가 포함되므로, 다른 커뮤니티의 같은 상품은 원천적으로 다른 상품이 된다.

이로 인해 서비스의 핵심인 다음 질문에 답하기 어렵다.

- 같은 상품이 여러 커뮤니티에서 동시에 뜨는가?
- 같은 구성과 수량의 과거 실구매가는 얼마였는가?
- 현재 판매처 중 총 구매 비용이 가장 낮은 곳은 어디인가?

### P1. 랭킹과 기준가가 읽을 때마다 다시 계산된다

수집 저장과 피드 조회 중에 hydrate, baseline, score, trend 계산이 섞여 있다. 현재의 `history_90d`는 실제로는 24시간 이상의 3개 관측만 있어도 생성되어 이름과 의미가 다르다.

### P1. 재방문 루프가 서버에 없다

저장, 관심 조건, 알림은 모두 `localStorage`이다. 수집기가 새 딜을 찾아도 사용자가 페이지를 열지 않으면 매칭도, 알림도 일어나지 않는다.

### P1. 클릭 수익 계측이 redirect보다 뒤에 있다

`/go/:id`는 redirect 응답을 만든 뒤 `after()`에서 클릭을 저장한다. 수익 대시보드의 기초가 되는 이벤트라면, redirect 지연을 거의 늘리지 않는 내구성 있는 이벤트 저장이 필요하다.

## 3. 목표 도메인 모델

```text
SourcePostObservation   원문 게시물과 반응 스냅샷
        |
        v
ProductIdentity         브랜드 + 모델 + 변형 + 수량/중량
        |
        +---- Offer      판매처 + 옵션 + 가격 + 배송비 + 쿠폰 조건
        |       |
        |       +---- OfferObservation   시점별 실구매가/재고
        |
        +---- Evidence   커뮤니티 반응, 가격 근거, 매칭 신뢰도
        |
        +---- RankSnapshot  시간창별 점수와 선정 이유

User/Device
  +---- SavedProduct
  +---- AlertRule
  +---- AlertEvent -> DeliveryAttempt

OutboundClick -> Attribution -> RevenueReport
```

### 필수 정책

- 게시물과 상품을 같은 ID로 취급하지 않는다.
- 상품 매칭에 `match_confidence` 및 매칭 근거를 남긴다.
- 가격은 `listed`, `coupon`, `card`, `shipping`, `total` 및 적용 조건을 분리한다.
- 평균가/최저가는 동일 상품·동일 구성 매칭과 최소 관측 기간을 통과한 경우만 표시한다.
- 원문 제목에서 발견한 가격은 관측 값으로 남기되 비교 가격으로는 즉시 승격시키지 않는다.
- 랭킹은 제휴 여부와 완전히 분리한다.

## 4. 목표 시스템 경계

```text
[Collector Worker]
  Source adapters -> raw observation write -> ingest job/outbox
        |
        v
[Normalize & Resolve]
  title parser -> offer parser -> product resolver -> quality flags
        |
        v
[Postgres: source of truth]
  posts / products / offers / observations / reactions
  rank_snapshots / alert_rules / alert_events / outbound_clicks
        |
        +------> [Redis]
        |         crawl lease / hot rank ZSET / response cache / rate limit
        |
        +------> [Alert Worker]
        |         rule match -> web push or email -> delivery log
        |
        +------> [Next.js Web/BFF]
                  feed query / detail evidence / saved / admin
```

### 인프라 선택 원칙

- Postgres를 정규화된 원본과 이력의 source of truth로 사용한다.
- Redis는 잠금, 실시간 rank sorted set, 읽기 cache에만 사용한다.
- Mac 작업기는 당장 유지하되 상태를 로컬에 갖지 않는 stateless worker로 만든다.
- 커넥터별 주기를 분리하고, 전체 수집 대신 변경분만 저장한다.
- 실패한 source/job만 재시도하며 idempotency key로 중복 저장을 막는다.

## 5. 수집과 랭킹 계약

### 수집 주기

| 레인 | 대상 | 주기 | 목적 |
|---|---|---:|---|
| Fast | 반응 증분을 얻을 수 있는 핵심 목록 | 5분 | 급상승과 초기 추천 포착 |
| Standard | 일반 커뮤니티/판매처 목록 | 15~30분 | 신선도 유지 |
| Deep | 상품 상세, 배송비, 옵션, 재고 | 30~60분 | 구매비용과 종료 검증 |
| Recheck | 인기딜/저장딜 | 10~15분 | 품절·종료 오탐 최소화 |

수집 주기는 커넥터의 공개 정책과 안정성 범위 내에서 조정하며, 차단 우회를 전제하지 않는다.

### 기본 핫 스코어

```text
reaction = 10*log1p(recommendations)
         + 3*log1p(comments)
         + 0.25*log1p(views)

velocity = 8*log1p(recommendations_delta_per_hour)
         + 2*log1p(comments_delta_per_hour)

freshness = 2 ^ (-age_hours / 6)

hot_score = (reaction + velocity + source_calibration) * freshness
```

- 추천 수가 주 신호이고, 조회는 보조 신호로만 쓴다.
- 핫순은 6시간 half-life를 기본으로 하고 소스별 반응 척도를 보정한다.
- `추천순`은 누적 추천 내림차순 + 신규성 tie-break로 따로 제공한다.
- 검증되지 않은 할인율은 점수를 올리지 않는다.
- rank snapshot에 점수 구성과 선정 이유를 저장해 UI에서 `추천 29개 증가`, `2시간 내 반응 상위 5%`처럼 설명한다.

## 6. 사용자 흐름 계약

```text
피드에서 상품 확인
  -> row 클릭: 판매처로 즉시 이동
  -> 가격 이력/근거 아이콘: 딜 상세
  -> 저장: 상품 단위로 저장
  -> 관심 조건: 서버 저장
  -> 새 offer 발생: 서버 매칭
  -> 웹 푸시 또는 이메일
  -> 판매처 클릭/수익 계측
```

공개 목록에는 커뮤니티 출처를 노출하지 않고, 상세에서만 정보 출처와 가격 근거를 확인할 수 있게 한다. 관리자 기능은 서버 인증을 통과한 세션에만 노출한다.

## 7. 점진적 이전 계획

### Phase 0. 기준선 회복

- 로컬과 운영 변경 합치기
- 현재 API/UI 회귀 테스트
- 배포 SHA, 스키마 버전, health에 표시

### Phase 1. 새 계약 shadow write

- 현재 Redis 저장을 유지하며 raw observation과 새 도메인 모델을 동시 기록
- parser/matcher 품질을 대조하되 공개 피드는 기존 경로 유지
- 구현: `source_posts`, append-only `source_post_observations`, idempotency key, batch transaction
- 기본값: `DEAL_DOMAIN_SHADOW_WRITE=0`; DB 미설정이나 shadow write 오류는 기존 수집 성공을 뒤집지 않음

### Phase 2. Postgres 이력과 product resolution

- 게시물, 상품, offer, observation 분리
- 동일 상품 군집과 신뢰도 검증
- 기존 가격 스냅샷 backfill

### Phase 3. 읽기 경로 전환

- feature flag로 일부 traffic만 새 feed query에 연결
- 순서, 누락, 응답 지연, outbound 성공률 비교
- 이상 시 기존 Redis 읽기로 즉시 복귀

### Phase 4. 알림과 수익 루프

- device/user preference 서버 동기화
- alert outbox + delivery log
- redirect 전 durable click enqueue 및 제휴 attribution 리포트

## 8. 승인 후 구현 통과 기준

| 영역 | 초기 통과 기준 |
|---|---|
| 릴리스 | 로컬/CI/운영 commit SHA 일치, 미커밋 작업 보존 |
| 신선도 | 핵심 소스 p95 15분 이내, stale 30분 경보 |
| 정규화 | 가격 추출 80% 이상, 배송비/조건 분리율 계측 |
| 상품 매칭 | 자동 매칭 precision 98% 이상, 낮은 신뢰도는 분리 노출 |
| 랭킹 | 추천 수 우선, 6시간 half-life, 선정 이유 100% 저장 |
| 종료 감지 | 인기/저장 딜 품절 감지 p95 20분 이내 |
| 클릭 | redirect p95 250ms 이하, 이벤트 유실률 0.1% 미만 |
| 알림 | 규칙 매칭과 발송 결과를 서버에서 재현 가능 |

## 9. 이번 리뉴얼에서 안 하는 것

- 검증 근거 없는 `역대 최저가`, `평균보다 저렴` 표시
- 커미션 유무를 랭킹에 반영
- 공개 목록에 커뮤니티 이름 노출
- 차단, CAPTCHA, robots 정책 우회를 전제로 한 커넥터
- 새 UI와 새 저장소를 한 번에 전환하는 big-bang 배포

## 10. 구현 근거와 1차 골격

- Next.js의 Data Access Layer 권고에 따라 DB 접근을 infrastructure 모듈로 격리하고 브라우저 DTO와 수집 원본을 분리한다.
- Vercel의 현재 저장소 안내에 따라 Postgres를 관계형 원본과 이력에, Redis를 lease와 실시간 rank 및 cache에만 사용한다.
- serverless 연결은 Marketplace Postgres가 주입하는 pooled DATABASE_URL 또는 POSTGRES_URL을 받는다.
- 새 source observation은 source와 source_deal_id로 게시물을 식별하고, 관측 payload hash를 idempotency key로 사용한다.
- DEAL_DOMAIN_SHADOW_WRITE가 꺼져 있으면 기존 Redis 경로만 사용하며, 켠 뒤에도 shadow-write 실패가 현재 피드 수집을 중단시키지 않는다.
- 초기 migration은 source_posts와 append-only source_post_observations만 만든다. 상품 resolution, offer, 알림은 품질 측정 뒤 다음 migration에서 확장한다.

### 공개 근거

- Next.js Data Security and DAL: https://nextjs.org/docs/app/guides/authentication
- Vercel Marketplace Storage: https://vercel.com/docs/marketplace-storage
- Vercel Postgres integration: https://vercel.com/docs/postgres
- Neon serverless transactions: https://neon.com/docs/serverless/serverless-driver
