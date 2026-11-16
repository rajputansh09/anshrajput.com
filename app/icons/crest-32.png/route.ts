import { crestPng } from "../../../lib/crestIcon";

export const dynamic = "force-static";

export function GET() {
  return crestPng(32);
}
