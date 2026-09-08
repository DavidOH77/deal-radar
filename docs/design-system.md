# SPIKE 디자인 시스템

> 구현 기준: A / Signal Ledger + A / Align
> 승인일: 2026-09-07

## 경험 원칙

1. 상품명, 구매가, 추천 반응을 같은 읽기 순서로 반복한다.
2. 추천을 주 신호로, 조회는 보조 신호로만 표시한다.
3. 목록 전체만 하나의 surface로 취급하고 행마다 카드를 만들지 않는다.
4. 검증되지 않은 할인율과 기준가는 숨긴다.
5. 행 클릭은 판매처 이동, 정보와 저장 아이콘만 별도 행동을 소유한다.

## Foundation

~~~css
:root {
  --canvas: #ffffff;
  --surface: #ffffff;
  --surface-subtle: #f4f5f6;
  --surface-hover: #f8f9fa;
  --text-primary: #17191d;
  --text-secondary: #626973;
  --text-tertiary: #9299a3;
  --border: rgb(23 25 29 / 9%);
  --border-strong: rgb(23 25 29 / 15%);
  --accent: #3d5ce8;
  --hot: #e85b48;
  --success: #21835f;
  --danger: #d84f45;
  --focus: #3659f5;
  --radius-control: 8px;
  --radius-media: 8px;
  --radius-surface: 12px;
  --radius-pill: 999px;
}
~~~

- Font: Pretendard Variable
- 본문 14/21, 상품명 15/22, 가격 15/22, 메타데이터 11~12/17
- 기본 weight는 400, 상품명과 label은 500, 선택과 주요 가격만 600
- 모든 letter spacing은 0, 가격과 반응 숫자만 tabular numerals
- control 8px, image 8px, list surface 12px, category chip만 pill
- 그림자는 segmented control의 선택 상태 외에는 사용하지 않는다.

## Signal Ledger

### Desktop

rank 36 | image 76 | product flexible | purchase 132 | reaction 150 | actions 72

- row 최소 102px, padding 12px 16px, gap 16px
- 제목 최대 2줄
- 추천 수를 반응 열의 첫 줄에 표시
- 상위 3개 또는 실제 반응 증가가 있는 행에만 선정 이유 표시

### Mobile

rank 22 | image 84 | product flexible | actions 32

- row 최소 132px
- 제목 최대 3줄
- 가격은 제목과 같은 14px
- 가격과 배송, 추천과 댓글 및 조회 순으로 세로 재배치
- 하단 navigation은 랭킹, 관심딜, 알림만 노출

## Brand Assets

- Header/App mark: public/brand/spike-align.svg
- Monochrome mark: public/brand/spike-align-mono.svg
- Browser icon: src/app/icon.svg
- 장식용 3D 오브젝트는 사용하지 않고 평면 마크와 워드마크만 유지한다.

## 상태와 접근성

- 가격 없음: 빈 가격 열을 유지하고 가격 확인 문구를 반복하지 않는다.
- 이미지 없음: neutral surface와 image_not_supported 아이콘
- 수집 오류: 기존 목록은 유지하고 오류 banner와 재시도 제공
- focus: 2px focus token, 2px offset
- 최소 터치 영역 32px, 주요 control 40px
- 390px에서 가로 overflow가 없어야 하며 제목 3줄을 보장한다.
- prefers-reduced-motion에서는 회전 외 전환을 즉시 완료한다.
