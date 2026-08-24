# 딜레이더 UI/UX 승인 규격

## 승인 기준

- Visual target: `audit/33-approved-tds-dense-scan.png`
- 핵심 구조: 1위 강조 ListRow + 2위 이하 자연스러운 ListRow
- 색상: white, cool gray, charcoal 중심
- 상태색: 검증과 정상 상태에만 green
- 브랜드: 얇은 이중 슬래시 심벌 + Pretendard 워드마크

## 실시간 랭킹

1. 헤더에서 랭킹, 관심딜, 수집 상태를 전환한다.
2. 페이지 제목과 수집 상태를 한 줄에서 확인한다.
3. 검색, 카테고리, 정렬, 가격 확인, 소스 탭으로 결과를 좁힌다.
4. 1위 딜은 큰 이미지와 가격으로 빠르게 판단한다.
5. 2위 이하는 상품 설명 아래의 반응과 우측 가격을 비교한다.
6. 하트로 저장하고 판매처 링크로 이동한다.

## 관심딜

- 관심 키워드와 목표가는 neutral input으로 입력한다.
- 조건은 한 줄 목록으로 표시하고 switch와 삭제 행동만 제공한다.
- 저장한 딜은 랭킹과 같은 목록 문법을 사용한다.
- 빈 상태는 박스 장식 없이 아이콘, 한 문장, 필요한 행동만 표시한다.

## 수집 상태

- 데이터 소스별 상태는 표 형태로 비교한다.
- 성공은 green text/icon, 오류는 danger text/icon으로만 구분한다.
- 행 전체에 색상 배경이나 상태 카드를 사용하지 않는다.

## Responsive

- 760px 이하에서 헤더 내 탐색은 하단 고정 탐색으로 이동한다.
- 필터는 검색 한 줄, 카테고리/정렬 두 열, 소스 가로 스크롤 순서로 배치한다.
- 1위 이미지는 104px, 일반 행 이미지는 76px로 줄인다.
- 가격과 행동을 콘텐츠 아래에 배치한다.

## States

- Loading: 행 높이를 유지하는 neutral skeleton
- Empty: 120px 내에서 아이콘과 한 문장
- Error: 상단 1px danger rule과 짧은 메시지
- Focus: 키보드 접근이 보이는 2px outline
- Saved: filled heart와 `aria-label` 변경
