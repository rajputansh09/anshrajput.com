// contact form API
import { site } from "../../../lib/site";
import { ownerEmail, senderEmail } from "../../../lib/email";

const HOUR = 60 * 60 * 1000;
const PER_EMAIL = 3;
const PER_IP = 5;
const GLOBAL = 40;
const MAX_BODY = 8_000;

const byEmail = new Map<string, number[]>();
const byIp = new Map<string, number[]>();
let all: number[] = [];

const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;
const REASONS = ["Co-op or internship", "Freelance project", "Collaboration", "Just saying hi"];

const recent = (list: number[] | undefined, now: number) => (list ?? []).filter((t) => now - t < HOUR);

// single line text: strip control chars and line breaks (no header injection), collapse spaces, cap length
const line = (v: unknown, max: number) =>
  String(v ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

// multi line text: keep line breaks, strip other control chars
const text = (v: unknown) =>
  String(v ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "")
    .trim();

// only allow requests from my site: production, Vercel previews and localhost
function allowedOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const { protocol, hostname } = new URL(origin);
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    if (protocol !== "https:") return false;
    return (
      hostname === "anshrajput.com" ||
      hostname === "www.anshrajput.com" ||
      /^ansh-rajput[a-z0-9-]*\.vercel\.app$/.test(hostname)
    );
  } catch {
    return false;
  }
}

function clientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : req.headers.get("x-real-ip") ?? "unknown").trim();
}

async function send(key: string, payload: Record<string, unknown>) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Resend ${res.status}: ${body.slice(0, 300)}`);
  try {
    return (JSON.parse(body) as { id?: string }).id ?? "";
  } catch {
    return "";
  }
}

// mask the address in logs, e.g
const mask = (a: string) => a.replace(/^(.{2})[^@]*(@.*)$/, "$1***$2");

const fail = (error: string, status: number) => Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  if (!allowedOrigin(req)) return fail("forbidden", 403);
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return fail("bad_request", 415);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return fail("too_large", 413);

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return fail("too_large", 413);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fail("bad_request", 400);
    body = parsed as Record<string, unknown>;
  } catch {
    return fail("bad_request", 400);
  }

  const name = line(body.name, 80);
  const email = line(body.email, 200).toLowerCase();
  const company = line(body.company, 120);
  const reasonIn = line(body.reason, 60);
  const reason = REASONS.includes(reasonIn) ? reasonIn : "General";
  const message = text(body.message);
  const ref = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();

  if (body.website) return Response.json({ ok: true, ref });

  if (name.length < 2 || !EMAIL_RE.test(email) || message.length < 10 || message.length > 2000) {
    return fail("invalid", 400);
  }

  const now = Date.now();
  const ip = clientIp(req);
  const mine = recent(byEmail.get(email), now);
  const fromIp = recent(byIp.get(ip), now);
  all = recent(all, now);
  if (mine.length >= PER_EMAIL || fromIp.length >= PER_IP || all.length >= GLOBAL) return fail("rate_limited", 429);

  const key = process.env.RESEND_API_KEY;
  const envTo = (process.env.CONTACT_TO || "").trim().replace(/^["']|["']$/g, "");
  const to = EMAIL_RE.test(envTo) ? envTo : site.email;
  if (envTo && to !== envTo) console.error("contact: CONTACT_TO is not a valid email, using the default");
  const from = process.env.CONTACT_FROM || "Ansh Rajput <hello@anshrajput.com>";
  if (!key) {
    console.error("contact: RESEND_API_KEY is not set");
    return fail("not_configured", 503);
  }

  const inquiry = { name, email, company, reason, message, ref };
  try {
    const id = await send(key, {
      from,
      to: [to],
      reply_to: email,
      subject: `New message from ${name}: ${reason}`,
      text: `${reason} (ref ${ref})\n\nFrom: ${name} <${email}>${company ? `\nCompany: ${company}` : ""}\n\n${message}\n\nReply to this email to answer ${name.split(" ")[0]} directly.`,
      html: ownerEmail(inquiry),
    });
    console.log(`contact: notification accepted by Resend for ${mask(to)} (id ${id}, ref ${ref})`);
  } catch (err) {
    console.error("contact: owner email failed", err instanceof Error ? err.message : err);
    return fail("send_failed", 502);
  }
  // only count successful sends so a random failure doesn't lock someone out
  byEmail.set(email, [...mine, now]);
  byIp.set(ip, [...fromIp, now]);
  all.push(now);
  if (byEmail.size > 5000) byEmail.clear();
  if (byIp.size > 5000) byIp.clear();

  // if the confirmation fails that's fine, I still got the message
  try {
    await send(key, {
      from,
      to: [email],
      subject: "Your message reached me",
      reply_to: site.email,
      text: `Hi ${greetName(name)},\n\nThanks for reaching out. Your message came through and I'll reply to this address soon.\n\nAnsh Rajput\nhttps://anshrajput.com\nReference ${ref}`,
      html: senderEmail({ ...inquiry, name: greetName(name) }),
    });
  } catch (err) {
    console.error("contact: confirmation email failed", err instanceof Error ? err.message : err);
  }
  return Response.json({ ok: true, ref }, { headers: { "Cache-Control": "no-store" } });
}

// first name for the greeting
function greetName(name: string) {
  const first = name.split(" ")[0] ?? "";
  return first.length <= 24 && /^[\p{L}\p{M}'.-]+$/u.test(first) && !/\./.test(first) ? first : "there";
}
