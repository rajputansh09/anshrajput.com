// site icon at any size, drawn from the crest
import { ImageResponse } from "next/og";
import { dragonMark } from "./dragonMark";

export const iconHeaders = { "Cache-Control": "public, max-age=0, must-revalidate" };

const uri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

// fill: solid background behind the corners, iOS shows transparent corners as black
export function crestPng(size: number, fill = false) {
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", background: fill ? "#07110c" : "transparent" }}>
        <img src={uri(dragonMark(`p${size}`, false))} width={size} height={size} alt="" />
      </div>
    ),
    { width: size, height: size, headers: iconHeaders },
  );
}
