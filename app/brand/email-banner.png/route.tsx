// email banner as a PNG since email clients can't render SVG
import { ImageResponse } from "next/og";
import { dragonMark } from "../../../lib/dragonMark";
import { emailBannerScene } from "../../../lib/emailArt";

export const dynamic = "force-static";

const uri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 360, display: "flex", position: "relative", fontFamily: "serif" }}>
        <img src={uri(emailBannerScene())} width={1200} height={360} style={{ position: "absolute", left: 0, top: 0 }} alt="" />
        <img src={uri(dragonMark("eb", false))} width={290} height={290} style={{ position: "absolute", left: 305, top: 30 }} alt="" />
        <div style={{ position: "absolute", left: 640, top: 118, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 24, letterSpacing: 9, color: "#6fcf97", textTransform: "uppercase" }}>anshrajput.com</div>
          <div style={{ fontSize: 66, color: "#f0d79a", fontWeight: 700, marginTop: 6, letterSpacing: 1 }}>Ansh Rajput</div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 10, color: "#d8b46a", fontSize: 22, letterSpacing: 4 }}>
            <div style={{ width: 9, height: 9, background: "#d8b46a", transform: "rotate(45deg)", marginRight: 16, marginLeft: 4 }} />
            SOFTWARE ENGINEER
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 360, headers: { "Cache-Control": "public, max-age=86400, immutable" } },
  );
}
