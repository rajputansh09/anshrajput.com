// the detailed dragon crest as a standalone SVG, used as the faint watermark behind the hero
import { dragonMark } from "../../lib/dragonMark";

export const dynamic = "force-static";

export function GET() {
  return new Response(dragonMark("wm", false), {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
  });
}
