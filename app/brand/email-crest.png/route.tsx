// crest as a PNG for emails
import { ImageResponse } from "next/og";
import { dragonMark } from "../../../lib/dragonMark";

export const dynamic = "force-static";

const uri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: 192, height: 192, display: "flex" }}>
        <img src={uri(dragonMark("ec", false))} width={192} height={192} alt="" />
      </div>
    ),
    { width: 192, height: 192, headers: { "Cache-Control": "public, max-age=86400, immutable" } },
  );
}
