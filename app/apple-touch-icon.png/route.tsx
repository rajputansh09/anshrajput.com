// iPhone and iPad icon (Safari tabs, bookmarks, home screen), at the address iOS asks for by name
import { ImageResponse } from "next/og";
import { dragonMark } from "../../lib/dragonMark";

export const dynamic = "force-static";

const uri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: 180, height: 180, display: "flex", background: "#07110c" }}>
        <img src={uri(dragonMark("ai", false))} width={180} height={180} alt="" />
      </div>
    ),
    { width: 180, height: 180, headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
