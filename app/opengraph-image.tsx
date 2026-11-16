import { ImageResponse } from "next/og";
import { dragonMark } from "../lib/dragonMark";

const uri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

export const alt = "Ansh Rajput, full-stack developer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#07110c", color: "#e6efe8", padding: 72, position: "relative", fontFamily: "sans-serif" }}>
        {/* the detailed dragon crest as a faint watermark, bleeding off the right edge */}
        <img src={uri(dragonMark("og", false))} width={720} height={720} style={{ position: "absolute", right: -210, top: -45, opacity: 0.14 }} alt="" />
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28 }}>
          <img src={uri(dragonMark("om", false))} width={56} height={56} alt="" />
          Ansh Rajput
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -3, lineHeight: 1, maxWidth: 900 }}>I build software that real businesses run on.</div>
          <div style={{ fontSize: 28, color: "#8da597", marginTop: 28, display: "flex", gap: 24 }}>
            <span style={{ color: "#6fcf97" }}>● certcanada.ca</span>
            <span style={{ color: "#6fcf97" }}>● twishcare.ca</span>
            <span style={{ color: "#d8b46a" }}>● UCert</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
