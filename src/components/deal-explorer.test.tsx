import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealExplorer } from "./deal-explorer";

describe("DealExplorer", () => {
  it("keeps the ranking overview focused on the product heading", () => {
    const markup = renderToStaticMarkup(
      <DealExplorer
        initialData={{
          deals: [],
          lastRun: null,
          asOf: "2026-09-07T03:00:00.000Z"
        }}
      />
    );

    expect(markup).toContain("지금 반응이 오르는 딜");
    expect(markup).not.toContain("LIVE RANKING");
    expect(markup).not.toContain("spike-align-object-v1.png");
  });
});
