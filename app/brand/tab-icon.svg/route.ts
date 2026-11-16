// the browser tab icon: the dragon crest, the same artwork as the header logo
import { dragonMark } from "../../../lib/dragonMark";

export const dynamic = "force-static";

export function GET() {
  return new Response(dragonMark("ic", false), {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" },
  });
}
