import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

export const alt = `${BRAND.name} - ${BRAND.shortDescription}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function OpenGraphImage() {
  const pretendard = await readFile(join(
    process.cwd(),
    "node_modules/pretendard/dist/web/static/woff-subset/Pretendard-Regular.subset.woff"
  ));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          padding: "72px 84px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#17191d",
          background: "#ffffff",
          fontFamily: "Pretendard"
        }}
      >
        <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ fontSize: 92, fontWeight: 600, lineHeight: 1.08 }}>{BRAND.name}</div>
          <div style={{ marginTop: 24, color: "#626973", fontSize: 34, lineHeight: 1.4 }}>
            {BRAND.shortDescription}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Pretendard", data: pretendard, weight: 400, style: "normal" }]
    }
  );
}
