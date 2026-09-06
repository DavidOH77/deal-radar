# SPIKE 리뉴얼 화면 방향

> 상태: 구현 전 승인용
> 실화면 프로토타입: `audit/renewal/direction-board.html`

## 공통 제품 계약

- 첫 화면은 랜딩이 아니라 실제 랭킹 탐색 화면이다.
- 커뮤니티 출처는 공개 목록에서 숨긴다. 판매처는 확인된 경우에만 표시한다.
- row 전체를 누르면 `/go/:id`를 통해 판매처로 이동한다.
- 상세/가격 근거는 `info` 또는 `monitoring` 아이콘으로 분리한다.
- 제휴 여부는 랭킹에 영향을 주지 않는다.
- 검증되지 않은 최저가·할인율은 표시하지 않는다.
- 가격이 없는 딜도 텍스트가 있는 요소만 단정하게 배치하고 `가격 확인`을 반복하지 않는다.
- 키보드, 390px mobile, reduced motion, 이미지 누락·품절·지연 상태를 공통 계약으로 가져간다.

## A. Signal Ledger - 추천

### 핵심 가설

대부분의 사용자는 핫딜 서비스를 열어 짧은 시간 안에 몇 개를 비교한 뒤 판매처로 이동한다. 따라서 하나의 잘 정렬된 ledger가 가장 빠르다.

### 구조적 특징

- Composition: 1160px 중앙 단일 열, 한 개의 목록 surface
- Density: 첫 viewport 7~8개 row, 모든 랭킹에 동일 정보 구조
- Geometry: surface 12px, control/image 8px, row는 radius 없음
- Typography: 15/22 제목, 15/22 가격, 12/18 metadata
- Interaction: row 외부 이동, 아이콘만 저장/근거 열기
- Imagery: 76px 상품 이미지, top 3도 예외 없음
- Accent: cobalt는 선택, coral은 반응 증가에만 사용

### 장점

- 기존 랭킹 사용법을 거의 바꾸지 않고 판독성을 크게 올릴 수 있다.
- 데이터 상태가 잘 안 맞아도 row 구조가 무너지지 않는다.
- 사용자가 요청한 `충분한 제목, 작은 숫자, 직접 이동`과 가장 잘 맞는다.

### 위험

- 단순 피드로 보일 수 있으므로 `추천 +29 / 1시간`, `개당 272원`처럼 우리만의 근거 필드가 반드시 필요하다.

## B. Cost Desk

### 핵심 가설

일반 핫딜 모음보다 `생활비 관리 + 알림`이 사업적 차별점이 될 수 있다. 카테고리, 단위가, 관심 조건을 항상 같이 보여준다.

### 구조적 특징

- Composition: 카테고리 rail + 딜 표 + 관심 조건 panel의 3열
- Density: 이미지는 60px로 줄이고 단위가·구매 조건을 명시
- Geometry: 카드 대신 수직 구분선, 왼쪽 navigation 표면만 8px
- Typography: 표의 컨텐츠는 14/21, 가격과 단위가 동일 크기
- Interaction: 카테고리를 먼저 선택하고, 오른쪽에서 즉시 관심 조건 생성
- Imagery: 실사 상품 이미지는 제품 확인용으로만 작게 사용
- Accent: evergreen + coral semantic, 브랜드 마크에는 cobalt 소량

### 장점

- `키워드 등록 -> 알림 -> 구매`를 피드 옆에서 바로 만든다.
- 식품·생활·뷰티를 첫 wedge로 선택할 때 차별화가 명확하다.

### 위험

- 정확한 상품 identity와 단위가가 부족한 현재 데이터에서 바로 구현하면 빈 칸이 많아진다.
- 전 카테고리 범용 서비스로 보이기보다 생활비 전문 제품으로 포지셔닝이 좁아진다.

## C. Pulse Timeline

### 핵심 가설

핫딜의 가장 큰 가치는 `싸다`보다 `지금 반응이 붙는다`에 있다. 시간 흐름과 추천 증분을 대시보드가 아닌 소비자용 live timeline으로 표현한다.

### 구조적 특징

- Composition: 시간 축 timeline + 오른쪽 `추천 급증` rail의 2열
- Density: 첫 viewport에 새로 들어온 딜 5개 + 추천 증분 5개
- Geometry: 시간 축은 1px line으로만 표현, 막대 그래프나 검은 바를 사용하지 않음
- Typography: 시각과 제목 중심, 가격과 추천 증분은 14~15px
- Interaction: 10분/1시간/6시간 창 전환, timeline row 외부 이동
- Imagery: 68px, 시각적 리듬은 이미지보다 시간 점과 여백으로 만듦
- Accent: coral을 추천 증분에, cobalt를 선택된 시간 창에만 사용

### 장점

- SPIKE의 시의성과 recommendation-first 랭킹을 가장 잘 드러낸다.
- 수집 품질과 반응 스냅샷이 좋아질수록 제품의 모양도 함께 좋아진다.

### 위험

- 사용자가 단순히 상품을 보러 왔을 때 일반 랭킹보다 탐색 부담이 커질 수 있다.
- 증분 데이터가 빈약한 소스는 지도를 가질 수 없다.

## 권고안

**1차 리뉴얼은 A / Signal Ledger로 구현하고, 아키텍처 Phase 2에서 B의 단위가·알림 패널을 결합한다.**

이유는 단순하다.

1. A는 현재 데이터로도 거짓 표시 없이 완성도를 올릴 수 있다.
2. 사용자가 이미 익숙한 랭킹 탐색을 유지한다.
3. B의 사업 차별점은 상품 매칭과 서버 알림이 준비된 뒤 붙여야 신뢰를 깎지 않는다.
4. C는 성공적인 실험 탭이 될 수 있지만 첫 기본 화면으로는 위험하다.

## 승인 범위

사용자가 아래 항목을 승인하면 운영 구현을 시작한다.

- 기본 화면 방향: A / Signal Ledger
- 브랜드 마크: A / Align
- Foundation: Pretendard 400/500/600, 8/12px radius, cobalt + coral + semantic green
- 구조: Postgres source of truth + Redis cache/lease/rank, stateless Mac worker
- 구현 순서: 기준선 회복 -> 새 UI -> shadow-write 도메인 모델 -> 서버 알림

승인 전에는 production frontend/backend, migration, dependency, deployment를 변경하지 않는다.
