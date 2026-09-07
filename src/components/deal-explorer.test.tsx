import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DealExplorer } from "./deal-explorer";

describe("DealExplorer", () => {
  it("uses the approved 3D Align object as an above-the-fold brand signal", () => {
    const markup = renderToStaticMarkup(
      <DealExplorer
        initialData={{
          deals: [],
          lastRun: null,
          asOf: "2026-09-07T03:00:00.000Z"
        }}
      />
    );

    expect(markup).toContain("overview-brand-object");
    expect(markup).toContain("spike-align-object-v1.png");
    expect(markup).toContain("지금 반응이 오르는 딜");
  });
});
