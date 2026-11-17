// checks that an email's domain can actually receive mail before I bother sending anything

// the disposable inbox services I see most often
const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "sharklasers.com", "grr.la",
  "10minutemail.com", "10minutemail.net", "tempmail.com", "temp-mail.org", "temp-mail.io", "tempmail.net",
  "throwawaymail.com", "yopmail.com", "yopmail.net", "getnada.com", "nada.email", "dispostable.com",
  "maildrop.cc", "mailnesia.com", "trashmail.com", "trashmail.net", "fakeinbox.com", "mintemail.com",
  "mohmal.com", "emailondeck.com", "spamgourmet.com", "mytemp.email", "tempinbox.com", "tempr.email",
  "discard.email", "mailcatch.com", "inboxkitten.com", "burnermail.io", "33mail.com", "moakt.com",
  "tmail.ws", "tmpmail.org", "tmpmail.net", "emailfake.com", "fakemail.net", "mail.tm", "linshiyouxiang.net",
]);

export type DomainCheck = "ok" | "disposable" | "no_mail";

export async function checkEmailDomain(email: string): Promise<DomainCheck> {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (DISPOSABLE.has(domain)) return "disposable";
  // I ask Google's public DNS over HTTPS instead of the server's resolver
  try {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, {
      headers: { accept: "application/dns-json" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return "ok";
    const data = (await res.json()) as { Status?: number; Answer?: { type: number; data: string }[] };
    if (data.Status === 3) return "no_mail";
    if (data.Status !== 0) return "ok";
    // MX answers look like "10 mx.example.com." A domain that refuses mail publishes "0 ." instead
    const hosts = (data.Answer ?? []).filter((a) => a.type === 15).map((a) => a.data.split(" ")[1] ?? "");
    const real = hosts.filter((h) => /^[a-z0-9-]+(\.[a-z0-9-]+)+\.?$/i.test(h));
    return real.length ? "ok" : "no_mail";
  } catch {
    // couldn't reach DNS at all: let the message through rather than lose a real person
    return "ok";
  }
}
