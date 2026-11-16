// where I am right now, for the "It's 8:38 PM in Edmonton" line in the header
import { get, put } from "@vercel/blob";
import { createHash, timingSafeEqual } from "node:crypto";
import { site } from "../../../lib/site";

const FILE = "whereabouts.json";
const homeCity = site.location.split(",")[0].trim();
type Place = { city: string; region: string; country: string; timeZone: string; updatedAt: string | null };
const home: Place = { city: homeCity, region: "AB", country: "CA", timeZone: site.timeZone, updatedAt: null };

const validZone = (tz: string) => {
  if (!tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

// constant time compare of the SHA-256 hashes so the token can't leak through timing
const digest = (s: string) => createHash("sha256").update(s).digest();
const authorized = (req: Request) => {
  const want = process.env.WHEREABOUTS_TOKEN;
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!want || !got) return false;
  return timingSafeEqual(digest(got), digest(want));
};

// limit wrong token attempts per IP to slow down guessing
const misses = new Map<string, number[]>();
const MISS_LIMIT = 10;
const MISS_WINDOW = 15 * 60 * 1000;
const ipOf = (req: Request) => (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim();

// plain text only, no control or markup characters, capped
const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f<>"`]/g, "").trim().slice(0, max) : "";
const header = (v: string | null) => {
  if (!v) return "";
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
};

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  let place = home;
  try {
    const res = await get(FILE, { access: "private", useCache: false });
    if (res) {
      const saved = (await new Response(res.stream).json()) as Partial<Place>;
      const city = clean(saved.city, 60);
      const timeZone = clean(saved.timeZone, 64);
      if (city && validZone(timeZone)) {
        place = {
          city,
          region: clean(saved.region, 20),
          country: clean(saved.country, 4),
          timeZone,
          updatedAt: clean(saved.updatedAt, 40) || null,
        };
      }
    }
  } catch (err) {
    // nothing saved yet or the read failed: use Edmonton and log it
    console.error("whereabouts: read failed, using home base", err instanceof Error ? err.message : err);
  }
  return Response.json(place, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } });
}

export async function POST(req: Request) {
  const ip = ipOf(req);
  const now = Date.now();
  const recent = (misses.get(ip) ?? []).filter((t) => now - t < MISS_WINDOW);
  if (recent.length >= MISS_LIMIT) return json({ error: "rate_limited" }, 429);
  if (!authorized(req)) {
    misses.set(ip, [...recent, now]);
    if (misses.size > 5000) misses.clear();
    return json({ error: "unauthorized" }, 401);
  }

  const h = req.headers;
  // optional manual override, e.g
  let body: Record<string, unknown> = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed;
  } catch {
    // empty body is the normal case
  }
  const place: Place = {
    city: clean(body.city, 60) || clean(header(h.get("x-vercel-ip-city")), 60),
    region: clean(body.region, 20) || clean(header(h.get("x-vercel-ip-country-region")), 20),
    country: clean(body.country, 4) || clean(header(h.get("x-vercel-ip-country")), 4),
    timeZone: clean(body.timeZone, 64) || clean(header(h.get("x-vercel-ip-timezone")), 64),
    updatedAt: new Date().toISOString(),
  };
  if (!place.city || !validZone(place.timeZone)) return json({ error: "location_unknown" }, 422);

  try {
    await put(FILE, JSON.stringify(place), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
  } catch (err) {
    console.error("whereabouts: save failed", err instanceof Error ? err.message : err);
    return json({ error: "save_failed" }, 502);
  }
  return json({ ok: true, place });
}
