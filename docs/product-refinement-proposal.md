# 딜레이더 제품화 리디자인 제안

상태: 승인 전 초안

## 목표

현재의 수집기 중심 화면을 사용자가 빠르게 딜을 판단하고 저장하는 제품 화면으로 전환한다. 운영 정보는 관리 영역으로 이동하고, 메인 피드는 상품명, 가격, 반응, 선정 이유만 남긴다.

## 경험 원칙

1. 첫 화면에서는 구매 판단에 필요한 정보만 보여준다.
2. 운영 정보는 신뢰를 증명할 때만 노출하고 기본 화면에서는 숨긴다.
3. 원문 제목을 그대로 보여주지 않고 판매처, 상품명, 가격, 배송을 구조화한다.
4. 선택지는 현재 사용할 수 있는 항목부터 보여주고 나머지는 점진적으로 연다.
5. 순위는 숫자보다 선정 이유로 납득시킨다.

## 정보 구조

| 경로 | 화면 | 역할 |
| --- | --- | --- |
| `/` | 실시간 랭킹 | 핫딜 탐색, 검색, 필터, 저장, 판매처 이동 |
| `/saved` | 관심딜 | 관심 조건 생성과 저장한 딜 비교 |
| `/status` | 수집 관리 | 소스 상태, 설정 필요 항목, 차단 사유 확인 |

상단의 주 내비게이션에는 `실시간 랭킹`과 `관심딜`만 둔다. `수집 관리`는 우측 관리 아이콘과 메뉴를 통해 진입한다.

## Foundation 변경

### 높이와 밀도

- Header: 56px
- Overview: 76px
- Sticky filter bar: 68px, 한 줄
- Search field: 최대 420x44px
- Featured deal: 172px
- Standard deal row: 88px
- Desktop content width: 최대 1200px
- Desktop content padding: 24px
- Mobile content padding: 16px

### Shape

- 검색, select, 버튼: 10px radius
- 상품 이미지: 12px radius
- 필터 패널, 빈 상태, 목록 전체 surface: 16px radius
- 필터 chip: 999px radius
- 일반 목록 행에는 radius를 적용하지 않는다.
- 목록 전체를 하나의 16px surface로 감싸고 내부 행은 hairline으로 구분한다.
- border는 `rgb(24 24 27 / 8%)` 1px
- shadow는 popover에만 매우 약하게 사용한다.

### Typography

- Page title: 24/32, 700
- Featured deal title: 16/24, 600
- Standard deal title: 15/22, 600
- Featured price: featured title과 동일한 16/24, 600
- Row price: standard title과 동일한 15/22, 600
- Body/control: 14/20, 500
- Metadata: 12/18, 500
- Font weight는 500, 600, 700만 사용한다.
- 가격 숫자는 주변 상품명과 같은 Pretendard 크기와 weight를 사용한다.
- 가격과 반응 숫자는 `tabular-nums`를 쓰지 않고 proportional lining number를 사용해 숫자 사이 간격을 좁힌다.
- 음수 letter-spacing은 사용하지 않는다.

### Color and motion

- `canvas`: `#F7F7F8`
- `surface`: `#FFFFFF`
- `surface-subtle`: `#F1F1F3`
- `surface-hover`: `#FAFAFA`
- `text-primary`: `#18181B`
- `text-secondary`: `#71717A`
- `text-tertiary`: `#A1A1AA`
- `accent`: `#635BFF`
- `success`: `#1F8F6A`
- `danger`: `#D14343`
- accent는 활성 탭, 선택 필터, 검증 완료에만 사용한다.
- 모든 hover, selected, disclosure 전환은 160ms이다.
- `prefers-reduced-motion`에서는 전환을 제거한다.

## 실시간 랭킹

### 상단

- 페이지 제목 우측에는 `2분 전 업데이트`처럼 마지막 갱신 시간만 보여준다.
- `수집 딜`, `기준가 검증`, `정상 소스`와 해당 숫자는 공개 피드와 관심딜 화면에서 렌더링하지 않는다.
- 검색, 가격 검증 토글, 활성 소스, 카테고리, 정렬을 68px 한 줄 필터에 배치한다.
- 기본 소스는 `전체`, `뽐뿌`, `어미새`를 보여주고 나머지 정상 소스는 팝오버에 넣는다.
- 설정 필요 또는 차단 상태인 소스는 기본 필터에서 숨긴다.
- 소스 선택은 underline 대신 높이 32px의 작은 pill을 사용한다.

### 딜 구조

1. `판매처 · 카테고리 · 게시 시간`
2. 정제된 상품명
3. 가격 · 배송비 · 할인율
4. 반응 또는 선정 이유

원문 예시:

`[롯데온]가평잣막걸리맛 제로 750mlx5 무알콜(9,730원/무배)`

표시 예시:

- 판매처: `롯데온`
- 상품명: `가평잣막걸리맛 제로 750ml 5병`
- 가격: `9,730원`
- 배송: `무료배송`

기준가가 없으면 관련 행을 렌더링하지 않는다. 1위는 다음 우선순위로 한 줄 선정 이유를 만든다.

1. 검증된 기준가가 있으면 `최근 기준가보다 18% 저렴`
2. 없으면 같은 시간대 딜 대비 반응 백분위를 계산해 `2시간 내 반응 상위 5%`
3. 비교 표본이 부족하면 `조회 2,121 · 댓글 6`

모든 딜 row 전체를 `/go/{dealId}` 링크로 사용한다. 별도 `판매처 보기` 문구나 버튼은 노출하지 않는다.

- 마우스 클릭과 Enter 키 모두 같은 링크로 이동한다.
- 저장 버튼은 row 링크 위의 독립 행동으로 두며 저장 시에는 이동하지 않는다.
- row에 명확한 hover, pressed, focus-visible 상태를 제공한다.
- `/go/{dealId}`는 `affiliateUrl > productUrl` 순으로 판매처에 연결하고 클릭을 기록한다.
- 커뮤니티 딜은 상세 페이지에서 판매처 URL을 보강해 `sourceUrl` 대신 실제 상품 URL을 우선 확보한다.

## 관심딜

- 상단 운영 숫자를 제거한다.
- 비어 있을 때 `첫 관심 조건 만들기` CTA를 중심 행동으로 제공한다.
- 예시 칩은 `에어팟 20만원 이하`, `삼겹살 1kg`을 제공하며 선택 시 입력값을 채운다.
- 입력이 열리면 `관심 키워드`, `목표 가격` 라벨을 항상 표시한다.
- 가격 입력 우측에 `원` suffix를 표시한다.
- 저장한 딜은 실시간 랭킹과 같은 88px 목록 문법을 사용한다.

## 수집 관리

- 공개 탐색 내비게이션에서 분리해 `/status`의 관리 화면으로 이동한다.
- 첫 화면에는 `정상 4`, `설정 필요 4`, `차단 2` 요약만 보여준다.
- 각 그룹은 disclosure 목록이며 소스, 수집 건수, 마지막 갱신만 요약한다.
- API 키 이름, robots.txt, Cloudflare 설명은 펼친 상세에서만 보여준다.

## 카테고리 정규화

화면에는 아래 10개 상품 카테고리만 노출한다.

`디지털`, `가전`, `식품`, `패션`, `뷰티`, `생활`, `홈/가구`, `육아`, `스포츠/레저`, `게임/취미`, `기타`

커뮤니티 원문 카테고리는 키워드와 소스별 매핑을 거쳐 위 체계로 변환한다. `기타국내`, `기타해외`, `네이버`, `펨코 인기 핫딜`은 사용자 카테고리로 노출하지 않는다.

## Responsive

- Desktop: 56px header + 68px sticky filter
- Mobile: 56px header, 검색 한 줄, 핵심 필터 한 줄, 나머지는 filter sheet로 이동
- Mobile featured row: 148~160px
- Mobile standard row: 104~116px
- 하단 내비게이션은 `실시간 랭킹`, `관심딜` 두 항목만 사용한다.
- 관리는 헤더의 관리 아이콘으로 진입한다.

## 승인 후 구현 범위

1. `/saved`, `/status` 실제 App Router 경로 추가
2. 공용 header와 route-aware navigation 분리
3. title parsing, seller/shipping extraction, category normalization 추가
4. ranking reason 계산과 표시 추가
5. active source 기반 filter와 source popover 구현
6. 관심딜 empty/builder flow 구현
7. source status grouping과 disclosure 구현
8. community detail의 실제 판매처 URL 보강과 `/go/{dealId}` 우선순위 검증
9. 전체 row outbound link와 저장 버튼의 독립 키보드 동작 구현
10. desktop/mobile/accessibility/E2E 검증
