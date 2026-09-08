# SPIKE 리뉴얼 설계와 인수 기록

> 2026-09-07 사용자 승인: A / Signal Ledger + A / Align + 제안 아키텍처 순서

## 보기

- 아키텍처 재점검: [00-architecture-review.md](./00-architecture-review.md)
- 레퍼런스와 Foundation: [01-reference-and-foundation.md](./01-reference-and-foundation.md)
- 화면 방향과 권고안: [02-direction-brief.md](./02-direction-brief.md)
- 브랜드 마크: [`public/brand/spike-align.svg`](../../public/brand/spike-align.svg)
- 구현 검증: [`audit/renewal/implementation/home-desktop.png`](../../audit/renewal/implementation/home-desktop.png), [`home-mobile.png`](../../audit/renewal/implementation/home-mobile.png)

## 권고 조합

- UX: A / Signal Ledger
- Brand mark: A / Align
- 토큰: Pretendard 400/500/600, control 8px, surface 12px
- 색: white canvas + cobalt selection + coral live signal + green verification
- 핵심 row: 제목 2~3줄, 가격 14~15px, 배송/단위가, 추천·댓글·조회, 선정 이유
- 이동: row 전체 클릭으로 판매처, info 아이콘으로 근거/이력
- 아키텍처: Postgres source of truth + Redis cache/lease/rank + stateless worker

## 승인된 구현 순서

1. 운영 8커밋과 로컬 미커밋 변경을 손실 없이 합쳐 하나의 기준선을 만든다.
2. 승인된 토큰과 Signal Ledger를 현재 API에 연결해 데스크톱/모바일을 교체한다.
3. 새 observation/product/offer 계약을 shadow write로 쌓고, 기존 피드와 품질을 비교한다.
4. 동일 상품 매칭과 단위가가 통과하면 Cost Desk의 근거 필드를 피드에 합친다.
5. 서버 관심 조건, 웹 푸시, durable click attribution을 연결한다.

## 구현 범위

### 첫 배포

- 릴리스 기준선 정리
- 새 브랜드 SVG/PNG/favicon/OG asset
- 헤더, 검색/필터, 랭킹 row, 모바일 nav 리뉴얼
- 제목/판매처/가격/배송/반응 표시 계약
- row 외부 이동 + 별도 상세 아이콘
- 품절, 가격 없음, 이미지 없음, stale, error, empty 상태
- Postgres source post/observation schema와 opt-in shadow write
- 배포 commit, migration 버전, Postgres 준비 상태 health 메타데이터
- 데스크톱/모바일 브라우저 회귀 테스트

### 다음 배포

- 커넥터 증분 주기 분리
- recommendation-first rank snapshot
- 동일 상품/offer 매칭
- 서버 알림 규칙과 발송 outbox
- 클릭 attribution과 제휴 리포트

## 이번에 확인한 것

- 정적 JS syntax: 통과
- SVG 3종 XML: 통과
- Chromium rendering: A/B/C x desktop/mobile 6개 화면 통과
- product screen horizontal overflow: 6개 화면 모두 0px
- image load failures: 0
- 제목 강제 잘림 감지: 0
- 외부 판매처 링크: 모든 표시 row에 있음

## 브랜드 결정

- 공개 서비스명: SPIKE
- 설명: 지금 반응이 오르는 딜
- 기존 딜레이더 명칭은 저장 키와 운영 경로 호환을 위해 내부 식별자에만 유지한다.
- 후보 살때는 동일 기능군의 공개 쇼핑 확장 프로그램이 확인되어 제외했다.
- SPIKE는 추천 반응의 급상승을 뜻한다. 공개 웹의 동일 딜 집계 서비스 충돌은 1차 확인에서 발견되지 않았으나, 상표 검토를 대신하지는 않는다.
