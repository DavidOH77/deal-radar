# SPIKE 리뉴얼 레퍼런스와 Foundation

> 상태: 구현 전 승인용
> 조사일: 2026-09-06
> 기본 캡처 환경: 1440 x 1000, 로그인 안 함, 데스크톱 Chromium

## 1. 제품 판단

현재 피드는 한 화면에 많은 딜을 놓지지 않고 보여주지만, 텍스트와 숫자가 작고 상품 판단에 필요한 가격·배송·수량·반응의 위계가 약하다. 반대로 예전 운영판은 넓은 여백과 하나의 큰 대표 카드 때문에 탐색 효율이 낮았다.

리뉴얼의 목표는 `더 많이 보이기`나 `더 예쁘게 보이기`가 아니라, 다음 3초 판단을 가능하게 하는 것이다.

1. 무엇을 얼마에 사는가?
2. 배송비와 수량을 합치면 조건이 어떤가?
3. 지금 반응이 생기는 근거는 무엇인가?

## 2. 레퍼런스 추적표

### 당근 SEED: 컨트롤과 상태 계약

- URL: <https://seed-design.io/components/action-button>
- 상태: 공개 문서, 로그인 없음
- 캡처: `audit/renewal/references/seed-action-button.png`
- 직접 관찰: 가장 중요한 행동만 solid로 두고, 크기·variant·state·width를 하나의 컨트롤 계약으로 정리한다. Brand color는 필요한 위치에만 쓴다.
- 차용할 원칙: 40px 주 행동, 36px 보조 컨트롤, 동일 컴포넌트의 state 토큰화, 버튼 위계 최소화
- 복제하지 않을 것: 당근 주황색, SEED 심볼, 문서 레이아웃

### Toss Design: 가치를 먼저 보이는 순서

- URL: <https://toss.tech/article/21023>
- 보조 원칙: <https://toss.tech/article/design-motivation>, <https://toss.tech/article/insurance-claim-process>
- 상태: 공개 문서, 로그인 없음
- 캡처: `audit/renewal/references/toss-value-first.png`
- 직접 관찰: 제품 설명을 진행 순서와 결정 단위로 나누고, 사용자가 먼저 얻는 가치를 앞세운다.
- 차용할 원칙: 메인 피드에서는 `정상 소스 5/14`가 아니라 `지금 반응이 오르는 상품`을 먼저 보여준다. 하나의 row는 하나의 구매 판단에 집중한다.
- 복제하지 않을 것: Toss blue, 토스 네비게이션, 토스 화면 구성

### 무신사 랭킹: 빠른 탐색과 즉시 필터

- URL: <https://www.musinsa.com/search/goods?gf=A&keyword=%EB%9E%AD%ED%82%B9>
- 상태: 공개 상품 탐색, 로그인 없음
- 캡처: `audit/renewal/references/musinsa-ranking.png`
- 직접 관찰: 필터가 상품보다 커지지 않고, 상품명·할인율·가격·반응을 일관된 순서로 반복한다. 소팅은 결과 목록 바로 위에 있다.
- 차용할 원칙: 검색·카테고리·정렬을 한 영역으로 압축, 반복 row의 정보 순서 고정
- 복제하지 않을 것: 검은 브랜드 바, 무신사 그리드, 라벨과 상품 카드 모양

### 마켓컬리 상품 상세: 총 구매 조건의 분해

- URL: <https://www.kurly.com/goods/1001304843>
- 상태: 공개 상품 상세, 로그인 없음
- 캡처: `audit/renewal/references/kurly-product.png`
- 직접 관찰: 판매가와 조건부 혜택가를 분리하고, 배송비·판매자·단위 당 가격을 명시한다. 재구매 수치는 서술 대신 결정 근거로 쓴다.
- 차용할 원칙: 현재가, 배송, 단위가, 조건가를 각기 다른 필드로 표시; 반응을 `왜 지금 볼만한지`의 근거로 사용
- 복제하지 않을 것: 보라색, 컬리 헤더, 상품 상세 좌우 분할을 그대로 사용

### 올리브영 핫딜: 접근 상태 기록

- URL: <https://www.oliveyoung.co.kr/store/main/getHotdealList.do?dispCatNo=900000100020001>
- 상태: 비로그인 Chromium에서 접속 정보 확인 페이지만 표시됨
- 캡처: `audit/renewal/references/oliveyoung-hotdeal.png`
- 판단: 우회하지 않고 실제 상품 UI 레퍼런스에서 제외했다. 공개 보고서는 카테고리 랭킹과 기획전이 제품 탐색의 핵심임만 확인하는 보조 근거로 쓴다.

### 경쟁 서비스: 알림이 제품 가치라는 점

- URL: <https://www.hotdeals.kr/>
- 상태: 공개 랜딩, 로그인 없음
- 캡처: `audit/renewal/references/hotdeals-competitor-desktop.png`, `audit/renewal/references/hotdeals-competitor-mobile.png`
- 직접 관찰: 20개 이상 커뮤니티 수집보다 `키워드 일치 즉시 알림`을 첫 가치로 소구한다.
- 반영할 사업 판단: SPIKE도 피드 탐색만으로는 부족하며, 서버 기반 관심 조건과 외부 알림이 핵심 재방문 루프가 되어야 한다.

## 3. 시각 원칙

### 제품 인상

- 패션 커머스나 관리자 대시보드가 아닌 `빠른 구매 판단 도구`
- 화려한 카드, 큰 숫자, 파스텔 그라데이션 대신 정확한 구분과 상품 이미지
- 브랜드 컬러는 탭·선택·링크에만, 급상승은 coral, 검증은 green 의미로만 제한
- 일반 row 마다 사방 테두리나 radius를 주지 않고 목록 전체만 하나의 surface로 취급

## 4. Foundation 토큰

### Color

```css
:root {
  --canvas: #ffffff;
  --surface: #ffffff;
  --surface-subtle: #f4f5f6;
  --surface-hover: #f8f9fa;

  --text-primary: #17191d;
  --text-secondary: #626973;
  --text-tertiary: #9299a3;

  --line: rgb(23 25 29 / 9%);
  --line-strong: rgb(23 25 29 / 15%);

  --accent: #3d5ce8;
  --hot: #e85b48;
  --verified: #21835f;
  --focus: #3659f5;
}
```

- `accent`는 현재 선택과 이동 가능한 요소에만 사용한다.
- `hot`은 실제 반응 증가나 마감 임박에만 사용한다.
- `verified`는 충분한 관측 근거가 있을 때만 사용한다.
- 보라색, 파스텔 그라데이션, 투명 오브는 사용하지 않는다.

### Typography

| 용도 | size / line-height | weight | 규칙 |
|---|---:|---:|---|
| Page title | 26 / 36 | 600 | 페이지당 1개 |
| Section title | 20 / 28 | 600 | 카드 내부에서 크게 쓰지 않음 |
| Deal title | 15 / 22 | 500 | desktop 2줄, mobile 3줄 보장 |
| Price | 15 / 22 | 600 | 제목보다 커지지 않음 |
| Body | 14 / 21 | 400 | 설명과 근거 |
| Metadata | 12 / 18 | 400 | 시간·반응·배송 |
| Label | 12 / 18 | 500 | chip과 필드 라벨 |

- Font family: Pretendard
- 허용 weight: 400, 500, 600. 650 또는 700을 기본값으로 사용하지 않는다.
- 숫자에 별도의 큰 크기를 주지 않고 `font-variant-numeric: tabular-nums`만 적용한다.
- Letter spacing은 모두 0으로 둔다.

### Spacing and geometry

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;

--radius-control: 8px;
--radius-media: 8px;
--radius-surface: 12px;
--radius-pill: 999px;
```

- Header: 56px
- 검색 input: desktop 360~420 x 42px, mobile 전체 너비 x 42px
- 필터·정렬 control: 36~40px
- 피드 row: desktop 최소 96px, mobile 최소 112px
- 상품 이미지: desktop 72~80px, mobile 84~88px
- Page shell: max 1160px, desktop padding 24px, mobile padding 16px
- 목록 전체만 12px surface. 각 row는 1px hairline으로 구분한다.
- Chip에만 pill radius를 쓰고 버튼이나 카드에 남발하지 않는다.

### Icon

- Google Material Symbols Outlined를 18, 20, 24px 구간에서 사용한다.
- `FILL 0`, `wght 400`, `GRAD 0`, 기본 `opsz 20`
- 저장, 알림, 검색, 필터, 가격 이력은 익숙한 아이콘 + tooltip/접근성 이름으로 제공한다.
- 사용자가 바로 인식할 수 있는 아이콘 대신 둥근 텍스트 버튼을 두지 않는다.

### Motion

- Hover, selected, drawer transition: 160ms
- Easing: `cubic-bezier(.2, .8, .2, 1)`
- row hover는 크기를 바꾸지 않고 background와 외부 이동 아이콘만 변화시킨다.
- `prefers-reduced-motion` 환경에서 전환을 즉시 완료한다.

## 5. 자산 계약

### 로고와 3D 에셋의 역할 분리

- 피드·헤더: 20~24px 평면 벡터 마크 + Pretendard 600 워드마크
- App icon: 선택된 마크만 단색 또는 2색으로 사용
- 공유 OG, 빈 상태, 알림 설정 완료: 같은 형상의 무광 금속 3D 에셋 사용 가능
- 매 딜 row, 필터, 배경 장식에 3D 에셋을 반복하지 않는다.

### 현재 승인 후보

- 3D 탐색 보드: `audit/renewal/assets/brand-object-directions.png`
- A / Align: `audit/renewal/assets/mark-align.svg`
- B / Fold: `audit/renewal/assets/mark-fold.svg`
- C / Signal: `audit/renewal/assets/mark-signal.svg`

3D 탐색 이미지는 빛·재질·복잡도를 정하기 위한 프로토타입이다. 승인 후 선택된 하나를 정확한 SVG, 1024px PNG, monochrome favicon, OG 크기로 재제작한다.

## 6. 반응형 계약

### Desktop, 1200px 이상

- 헤더 안에 브랜드, 랭킹/관심딜, 알림만 유지
- 검색과 정렬은 한 줄, 카테고리는 바로 아래 짧은 행
- row는 `rank | image | product | price/condition | reaction | actions` 고정 그리드

### Tablet, 768~1199px

- seller/배송/단위가를 제목 아래 한 줄로 통합
- 반응과 저장은 오른쪽 열에 유지
- 필터는 필요 시 bottom sheet로 확장

### Mobile, 767px 이하

- top 3 카드를 가로로 압축하지 않고 모든 딜을 같은 세로 row로 표시
- 상품명은 최소 2줄, 긴 상품은 3줄까지 보장
- 가격과 배송은 동일 행, 반응과 시간은 다음 행
- 검색만 sticky로 남기고 카테고리는 가로 scroll
- 하단 navigation은 피드, 관심딜, 알림 3개만 표시

## 7. 핵심 상태 계약

| 상태 | 표시 방법 |
|---|---|
| 가격 없음 | `가격 확인`을 반복하지 않고 가격 영역을 비워둠. row 클릭은 유지 |
| 배송 미확인 | `배송 미확인` 대신 표시 안 함 |
| 이미지 누락 | 정중앙 상품 아이콘, surface-subtle, 텍스트 없음 |
| 품절/종료 | 가격과 CTA 비활성, `종료` 텍스트, 피드 기본 제외 |
| 검증 가격 없음 | 할인율과 최저가 문구 숨김 |
| 수집 지연 | 상단에 `업데이트 지연` 한 줄, 이전 데이터는 유지 |
| 오류 | 기존 목록을 지우지 않고 재시도 제공 |
| 빈 결과 | 현재 필터를 제거하는 행동 하나만 제공 |

## 8. 접근성 계약

- 모든 row는 키보드로 외부 판매처에 이동할 수 있다.
- 저장과 상세 아이콘은 row 링크와 별도 조작 요소로 분리한다.
- focus ring은 2px `--focus`, 2px offset을 사용한다.
- 색만으로 급상승, 검증, 종료 상태를 표현하지 않는다.
- 390px 너비에서 가로 overflow와 텍스트 가림을 허용하지 않는다.
