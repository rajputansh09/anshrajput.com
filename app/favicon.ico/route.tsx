// /favicon.ico: browsers and search engines ask for it by name even when the page names an SVG icon
import { ImageResponse } from "next/og";
import { dragonMark } from "../../lib/dragonMark";

export const dynamic = "force-static";

const uri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: 48, height: 48, display: "flex" }}>
        <img src={uri(dragonMark("fi", false))} width={48} height={48} alt="" />
      </div>
    ),
    { width: 48, height: 48, headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
