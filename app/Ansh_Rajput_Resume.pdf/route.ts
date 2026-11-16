// the downloadable resume
import p1 from "../../lib/resumePdf/p1";
import p2 from "../../lib/resumePdf/p2";
import p3 from "../../lib/resumePdf/p3";
import p4 from "../../lib/resumePdf/p4";

export const dynamic = "force-static";

export function GET() {
  return new Response(Buffer.from(p1 + p2 + p3 + p4, "base64"), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="Ansh_Rajput_Resume.pdf"',
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
