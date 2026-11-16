// Tab icon
import { dragonMark } from "../../../lib/dragonMark";

export const dynamic = "force-static";

export function GET() {
  return new Response(dragonMark("ic", false), {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" },
  });
}
