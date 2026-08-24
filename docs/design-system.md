# 딜레이더 디자인 시스템

## 경험 원칙

1. 가격과 반응을 조작 UI보다 먼저 보여준다.
2. 순위는 크기와 정렬로 강조하고 장식색으로 경쟁시키지 않는다.
3. 표면은 하나로 유지하고 간격과 구분선으로 정보를 묶는다.
4. 색상은 상태를 설명할 때만 사용한다.
5. 반복해서 보는 화면답게 빠른 비교와 스캔을 우선한다.

## Foundation

### Color

| Token | Value | Role |
| --- | --- | --- |
| `canvas` | `#F5F6F8` | 콘텐츠 바깥 배경 |
| `surface` | `#FFFFFF` | 기본 제품 표면 |
| `surface-muted` | `#F3F4F6` | 검색과 선택 상태 |
| `text-primary` | `#202124` | 제목, 가격, 활성 상태 |
| `text-secondary` | `#69707A` | 메타데이터 |
| `text-tertiary` | `#9298A1` | 보조 설명 |
| `stroke-subtle` | `#E5E7EB` | 행과 주요 영역 구분 |
| `success` | `#23856D` | 검증 완료와 정상 상태 |
| `danger` | `#C94B46` | 오류 상태에만 사용 |

제품 UI와 브랜드에는 장식용 색상을 사용하지 않는다. 전경, 배경, 외곽선 역할을 섞지 않는다.

### Typography

- Font: Pretendard Variable
- Page title: 28/38, 650
- Section title: 18/26, 600
- Deal title: 16/24, 550
- Featured price: 24/32, 650
- Row price: 16/24, 600
- Body: 14/21, 500
- Metadata: 12/18, 400~500
- 숫자는 tabular lining number를 사용한다.

### Layout

- Desktop content width: 최대 1488px
- Desktop grid: 12 columns, 24px gutter
- Mobile horizontal padding: 16px
- Breakpoint: 760px
- Touch target: 최소 40x40px
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40px

### Shape And Separation

- SearchField radius: 14px
- Primary action radius: 12px
- Media radius: 10px
- Clear icon button은 평상시 표면이 없고 hover/pressed 상태만 원형 표면을 사용한다.
- 페이지 밴드와 목록 행은 0px radius를 사용한다.
- 일반 버튼과 목록에는 pill radius를 사용하지 않는다.
- 목록 행은 카드로 감싸지 않고 `#E5E7EB` 1px 구분선만 사용한다.
- 그림자와 그라디언트를 사용하지 않는다.

### Interaction

- Hover: 해당 행 또는 선택 항목에 `surface-muted` 사용
- Focus: 2px `text-primary` outline, 2px offset
- Pressed: 배경 명도 한 단계 감소
- Selected: 굵기, 짧은 underline 또는 neutral fill 중 하나만 사용
- Disabled: opacity 0.4, pointer feedback 제거
- Loading: 회색 표면의 opacity pulse, 색상 이동 없음

## Core Components

### Ranked Deal

- Rank 1: 중간 크기 이미지, 제목, 가격, 반응, 저장, 판매처 행동을 한 행에서 제공한다.
- Rank 2+: 순위+이미지, 상품 맥락, 가격+행동의 세 영역으로 구성한다.
- 반응 지표는 별도 열이 아니라 상품 제목 아래의 보조 정보로 제공한다.
- 검증 점수 숫자는 노출하지 않고 기준가 근거 상태만 의미 색상으로 제공한다.
- Mobile: 가격과 행동을 상품 정보 아래로 이동한다.

### Filter Bar

- 검색은 채워진 neutral surface로 표시한다.
- 카테고리와 정렬은 borderless menu control을 사용한다.
- 소스 선택은 text tab과 짧은 underline을 사용한다.
- 가격 확인은 작은 성공 아이콘과 텍스트로만 표현한다.

### Brand

- 대표 브랜드는 얇은 이중 슬래시 심벌과 Pretendard 텍스트 워드마크를 사용한다.
- 가격표, 레이더, 장바구니처럼 서비스를 직역한 심벌은 사용하지 않는다.
- 심벌은 단색 graphite 투명 PNG이며 20~22px로 표시한다.
- 워드마크는 Pretendard 700과 `text-primary`를 사용한다.
