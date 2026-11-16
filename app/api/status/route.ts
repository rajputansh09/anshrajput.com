// pings my client sites for the status board
export const dynamic = "force-dynamic";

const targets = [
  { id: "certcanada", url: "https://certcanada.ca" },
  { id: "twish", url: "https://twishcare.ca" },
];

async function check(url: string) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  const start = performance.now();
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow", cache: "no-store", signal: ctrl.signal });
    const ms = Math.round(performance.now() - start);
    return { up: res.status < 400, status: res.status, ms };
  } catch {
    return { up: false, status: 0, ms: null as number | null };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const results = await Promise.all(targets.map(async (t) => ({ id: t.id, ...(await check(t.url)) })));
  return Response.json(
    { checkedAt: new Date().toISOString(), results },
    // cache at the edge for 30s so lots of visitors don't mean lots of hits on the client sites
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=30" } },
  );
}
