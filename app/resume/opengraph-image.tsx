import { ImageResponse } from "next/og";
import { dragonMark } from "../../lib/dragonMark";

const uri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

export const alt = "Ansh Rajput, resume";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// a sheet of paper on the right with ruled lines, so the card reads as "resume" before anyone reads a word
const lines = [0.62, 0.9, 0.78, 0.86, 0.55, 0.92, 0.7, 0.84, 0.6, 0.66, 0.88, 0.74, 0.5, 0.9, 0.8];

export default function ResumeOG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#07110c", color: "#e6efe8", padding: 72, position: "relative", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28 }}>
            <img src={uri(dragonMark("om", false))} width={56} height={56} alt="" />
            Ansh Rajput
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 30, color: "#d8b46a", letterSpacing: 6, textTransform: "uppercase" }}>Resume</div>
            <div style={{ fontSize: 68, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05, marginTop: 18 }}>Software Engineer</div>
            <div style={{ fontSize: 30, color: "#8da597", marginTop: 22, lineHeight: 1.35, display: "flex", flexDirection: "column" }}><span>Computer Engineering Co-op</span><span>University of Alberta</span></div>
          </div>
          <div style={{ fontSize: 26, color: "#6fcf97" }}>anshrajput.com/resume</div>
        </div>
        <div style={{ position: "absolute", right: 96, top: 70, width: 340, height: 470, display: "flex", flexDirection: "column", background: "#e9efe9", borderRadius: 10, padding: "40px 36px", transform: "rotate(3deg)", boxShadow: "0 30px 60px rgba(0,0,0,0.45)" }}>
          <div style={{ width: 170, height: 18, background: "#0f2a1c", borderRadius: 4 }} />
          <div style={{ width: 230, height: 8, background: "#b48640", borderRadius: 4, marginTop: 14 }} />
          {lines.map((w, i) => (
            <div key={i} style={{ width: `${w * 100}%`, height: 9, background: i % 3 === 0 ? "#2f5a43" : "#c3cfc6", borderRadius: 4, marginTop: i % 3 === 0 ? 22 : 11 }} />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
