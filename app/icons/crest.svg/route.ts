import { dragonMark } from "../../../lib/dragonMark";
import { iconHeaders } from "../../../lib/crestIcon";

export const dynamic = "force-static";

export function GET() {
  return new Response(dragonMark("ic", false), { headers: { "Content-Type": "image/svg+xml", ...iconHeaders } });
}
