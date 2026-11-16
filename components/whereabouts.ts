// shared by the check-in page and the header clock
export const KEY = "whereabouts-key";
const LAST = "whereabouts-last";
const EVERY = 30 * 60 * 1000;

type Result = { ok: true; city: string; timeZone: string } | { ok: false; error: string };

export async function checkIn(key: string, force = false): Promise<Result> {
  if (!key) return { ok: false, error: "no_key" };
  try {
    if (!force && Date.now() - Number(localStorage.getItem(LAST) || 0) < EVERY) return { ok: false, error: "recent" };
  } catch {}
  try {
    const res = await fetch("/api/whereabouts", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      // the browser knows its own time zone exactly; the city comes from the connection on the server
      body: JSON.stringify({ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || "failed" };
    try {
      localStorage.setItem(LAST, String(Date.now()));
    } catch {}
    return { ok: true, city: data.place.city, timeZone: data.place.timeZone };
  } catch {
    return { ok: false, error: "offline" };
  }
}

export function savedKey() {
  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}
