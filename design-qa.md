# Design QA

## Target and Evidence

- Source: `audit/33-approved-tds-dense-scan.png`
- Source pixels: 1487 x 1058
- Desktop implementation: `audit/34-tds-dense-desktop.png`
- Desktop capture pixels: 1425 x 1013 from a requested 1440 x 1024 in-app browser viewport
- Side-by-side comparison: `audit/36-tds-dense-comparison.png`
- Comparison normalization: both halves normalized to 1440 x 1024; browser chrome and device scale account for the raw capture difference
- State: real feed data, price-confirmed filter on, all sources, real-time ranking sort, no saved deal

## Responsive Evidence

- Mobile feed: `audit/35-tds-dense-mobile.png` at 375 x 812
- Focused evidence is included because the desktop trailing actions move below product context on mobile.

## Comparison Findings

- Layout: the selected dense-scan direction is implemented as natural ListRows. The score/table header is removed, reaction metrics sit below product titles, and price/actions form the trailing zone.
- Spacing: rank 1 is a compact 216px row; later rows use 108px desktop and 154px mobile minimums without nested containers.
- Typography: Pretendard Variable is applied globally with zero letter spacing. Prices, titles, and metadata preserve the reference hierarchy without viewport-scaled font sizes.
- Color: white, cool gray, graphite, and limited verification green are tokenized. There are no gradients, decorative color blocks, card shadows, or heavy panel borders.
- Shape: page bands and rows use 0px radius, SearchField 14px, primary action 12px, media 10px, and clear icon buttons reveal a circular surface only on interaction.
- Assets: product imagery uses the collected source images. The selected thin double-slash mark is a transparent bitmap asset paired with the Pretendard wordmark.
- Icons: Material Symbols Rounded is used consistently for navigation, filters, metrics, saving, status, and outbound actions.
- Responsiveness: at 375px the trailing price/actions move below product context, the first action group aligns right, and navigation uses a stable bottom bar without horizontal overflow.
- Accessibility: semantic buttons, headings, tables, labels, alt handling, focus-visible outlines, 40px minimum primary icon targets, and reduced-motion support are present.

## Iteration History

1. P2: desktop content was too narrow and the extra ranking heading pushed the feed down. Expanded the responsive page width and merged freshness controls into the filter row.
2. P2: the first-place image lacked the reference's visual weight. Increased the desktop media slot to 220px and adjusted the grid gap.
3. P2: mobile compact rows were too tall. Grouped save/outbound actions and reduced each row to a three-row, 160px layout.
4. P1: the 805px tablet capture exposed horizontal overflow in the comparison grid. Reduced intermediate breakpoint minimum column widths; the follow-up capture has no horizontal scrollbar.
5. P1: the generated tag/radar-style brand mark still felt heavy and illustrative. Removed the full symbol family and replaced it with a type-only Pretendard wordmark.
6. P1: the selected TDS direction still looked like a rigid spreadsheet. Removed the score and table header, reduced fixed columns to three ListRow zones, and moved reactions below product context.
7. P2: the generated logo accent was too faint at 22px. Preserved the selected shape while increasing its raster stroke coverage for small-size legibility.

## Functional Checks

- Feed, interest, and source-health navigation states render and switch correctly.
- Saving and unsaving the top deal updates the control state and saved-deal count.
- Search, category, sort, price-confirmed, and source controls remain present and labelled.
- Affiliate-aware outbound links remain routed through `/go/{dealId}` and open in a new tab.
- Browser logs contain one historical hot-reload error from the moment `globals.css` was replaced. Later reloads render normally; lint, tests, and a production build are used as the final code validation.

## Final Result

passed
