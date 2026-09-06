import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

export const alt = `${BRAND.name} - ${BRAND.shortDescription}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function OpenGraphImage() {
  const [pretendard, objectImage] = await Promise.all([
    readFile(join(
      process.cwd(),
      "node_modules/pretendard/dist/web/static/woff-subset/Pretendard-Regular.subset.woff"
    )),
    readFile(join(process.cwd(), "public/brand/spike-align-object-v1.png"))
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          padding: "72px 84px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "#17191d",
          background: "#ffffff",
          fontFamily: "Pretendard"
        }}
      >
        <div style={{ width: 650, display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#3d5ce8", fontSize: 24, fontWeight: 600 }}>LIVE DEAL SIGNAL</div>
          <div style={{ marginTop: 18, fontSize: 84, fontWeight: 600, lineHeight: 1.08 }}>{BRAND.name}</div>
          <div style={{ marginTop: 24, color: "#626973", fontSize: 34, lineHeight: 1.4 }}>
            {BRAND.shortDescription}
          </div>
        </div>
        <img
          src={`data:image/png;base64,${objectImage.toString("base64")}`}
          width={360}
          height={360}
          alt=""
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Pretendard", data: pretendard, weight: 400, style: "normal" }]
    }
  );
}
