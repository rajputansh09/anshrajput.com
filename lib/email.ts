// HTML emails for the contact form, same forest and brass style as the site
import { site } from "./site";

const C = {
  page: "#030805",
  card: "#0a1810",
  panel: "#06110b",
  line: "#21402f",
  frame: "#4a3c1c", // dim brass for frames
  text: "#e6efe8",
  muted: "#8da597",
  moss: "#6fcf97",
  forest: "#1f6b45",
  brass: "#d8b46a",
  brassHi: "#f0d79a",
  ember: "#ff9a3a",
};
const SERIF = "'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
// both images are PNGs rendered by the site from the crest
const BANNER = `${site.url}/brand/email-banner.png`;
const CREST = `${site.url}/brand/email-crest.png`;

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const para = (s: string) => esc(s).replace(/\n/g, "<br/>");

// hidden preview text that shows next to the subject in the inbox
const preheader = (s: string) =>
  `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all">${esc(s)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>`;

const button = (href: string, label: string, primary = true) =>
  `<a href="${href}" style="display:inline-block;padding:14px 26px;border-radius:6px;font-family:${SANS};font-size:15px;font-weight:700;letter-spacing:.3px;text-decoration:none;${
    primary
      ? `background:${C.brass};background-image:linear-gradient(180deg,${C.brassHi},${C.brass} 55%,#a8823e);color:#1a1206;border:1px solid #f6e3ad`
      : `background:${C.panel};color:${C.brassHi};border:1px solid ${C.frame}`
  }">${label}</a>`;

// divider: brass lines with a small diamond in the middle
const ornament = (bg: string) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
  <td style="border-top:1px solid ${C.frame};font-size:0;line-height:0" width="44%">&nbsp;</td>
  <td align="center" style="padding:0 12px;color:${C.brass};font-family:${SERIF};font-size:13px;letter-spacing:7px;white-space:nowrap" bgcolor="${bg}">&#9670;&#10070;&#9670;</td>
  <td style="border-top:1px solid ${C.frame};font-size:0;line-height:0" width="44%">&nbsp;</td>
</tr></table>`;

// small caps label between two diamonds
const kicker = (s: string) =>
  `<div style="font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${C.moss}"><span style="color:${C.brass}">&#9670;</span>&nbsp;&nbsp;${esc(s)}&nbsp;&nbsp;<span style="color:${C.brass}">&#9670;</span></div>`;

// message box with a brass line and a big quote mark
const quote = (html: string, rule: string, color: string) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
  <td bgcolor="${C.panel}" style="background:${C.panel};border:1px solid ${C.line};border-left:3px solid ${rule};border-radius:12px;padding:16px 22px 20px">
    <div style="font-family:${SERIF};font-size:44px;line-height:30px;height:26px;color:${C.brass};opacity:.55">&ldquo;</div>
    <div style="font-family:${SANS};font-size:16px;line-height:1.75;color:${color}">${html}</div>
  </td></tr></table>`;

function shell(opts: { preview: string; kicker: string; body: string; footer: string }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="dark"/><meta name="supported-color-schemes" content="dark"/>
<title>${esc(opts.kicker)}</title></head>
<body style="margin:0;padding:0;background:${C.page}" bgcolor="${C.page}">
${preheader(opts.preview)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page}">
<tr><td align="center" style="padding:28px 10px 44px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">
    <tr><td bgcolor="${C.frame}" style="background:${C.frame};background-image:linear-gradient(135deg,#8a6a30,${C.frame} 30%,#2a2210 60%,#8a6a30);border-radius:22px;padding:2px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.card}" style="background:${C.card};border-radius:20px;overflow:hidden">
        <tr><td style="padding:0;font-size:0;line-height:0">
          <a href="${site.url}" style="text-decoration:none"><img src="${BANNER}" width="596" alt="Ansh Rajput, software engineer" style="display:block;width:100%;max-width:596px;height:auto;border:0;border-radius:20px 20px 0 0;color:${C.brassHi};font-family:${SERIF};font-size:24px"/></a>
        </td></tr>
        <tr><td style="height:3px;line-height:3px;font-size:0;background:${C.brass};background-image:linear-gradient(90deg,#6b4a1c,${C.brassHi},#6b4a1c)">&nbsp;</td></tr>
        <tr><td align="center" style="padding:22px 30px 0">${kicker(opts.kicker)}</td></tr>
        <tr><td style="padding:18px 32px 34px">
          ${opts.body}
        </td></tr>
      </table>
    </td></tr>
    <tr><td align="center" style="padding:26px 16px 0">
      <img src="${CREST}" width="44" height="44" alt="" style="display:block;border:0;margin:0 auto 12px"/>
      <div style="font-family:${SANS};font-size:12px;line-height:1.7;color:${C.muted}">${opts.footer}</div>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

export type Inquiry = { name: string; email: string; company: string; reason: string; message: string; ref: string };

const firstName = (n: string) => n.trim().split(/\s+/)[0] || n;
const when = () =>
  new Date().toLocaleString("en-CA", {
    timeZone: site.timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

// email I get
export function ownerEmail(q: Inquiry) {
  const first = firstName(q.name);
  const reply = `mailto:${encodeURIComponent(q.email)}?subject=${encodeURIComponent(`Re: ${q.reason}`)}`;
  const row = (label: string, value: string) =>
    `<tr><td style="padding:9px 0;border-bottom:1px dotted ${C.frame};font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${C.brass}" width="104" valign="top">${label}</td>
     <td style="padding:9px 0;border-bottom:1px dotted ${C.frame};font-family:${SANS};font-size:15px;color:${C.text}" valign="top">${value}</td></tr>`;
  const body = `
    <h1 style="margin:0 0 6px;font-family:${SERIF};font-size:32px;line-height:1.15;font-weight:600;color:${C.brassHi};text-align:center">A new message has arrived</h1>
    <p style="margin:0 0 24px;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.muted};text-align:center">${esc(first)} wrote to you through anshrajput.com about <span style="color:${C.moss};font-weight:700">${esc(q.reason)}</span>.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px">
      ${row("From", `<strong style="color:${C.text}">${esc(q.name)}</strong>`)}
      ${row("Email", `<a href="mailto:${esc(q.email)}" style="color:${C.moss};text-decoration:none">${esc(q.email)}</a>`)}
      ${q.company ? row("Company", esc(q.company)) : ""}
      ${row("Received", esc(when()))}
    </table>
    ${quote(para(q.message), C.brass, C.text)}
    <div style="margin:28px 0 10px;text-align:center">${button(reply, `Reply to ${esc(first)}`)}</div>
    <p style="margin:10px 0 0;font-family:${SANS};font-size:13px;color:${C.muted};text-align:center">Or just hit reply. It goes straight to ${esc(q.email)}.</p>`;
  return shell({
    preview: `${q.reason}: ${q.message.slice(0, 90)}`,
    kicker: "New message",
    body,
    footer: `Sent by the contact form on <a href="${site.url}" style="color:${C.brass};text-decoration:none">anshrajput.com</a> &middot; ref ${esc(q.ref)}`,
  });
}

// confirmation the visitor gets
export function senderEmail(q: Inquiry) {
  const first = firstName(q.name);
  const link = (href: string, label: string) =>
    `<a href="${href}" style="color:${C.moss};text-decoration:none;font-weight:600">${label}</a>`;
  const body = `
    <h1 style="margin:0 0 12px;font-family:${SERIF};font-size:32px;line-height:1.15;font-weight:600;color:${C.brassHi};text-align:center">Your message reached me, ${esc(first)}</h1>
    <p style="margin:0 0 26px;font-family:${SANS};font-size:16px;line-height:1.7;color:${C.text};text-align:center">Thanks for writing about <span style="color:${C.moss};font-weight:700">${esc(q.reason)}</span>. I read every message myself and I'll reply to this address soon.</p>
    <div style="margin:30px 0 26px">${ornament(C.card)}</div>
    <p style="margin:0 0 16px;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.text};text-align:center">While you wait, here's what I've been building:</p>
    <div style="text-align:center">${button(`${site.url}/#work`, "See my work")} &nbsp; ${button(`${site.url}/resume`, "Resume", false)}</div>
    <div style="margin:32px 0 0">${ornament(C.card)}</div>
    <p style="margin:22px 0 0;font-family:${SERIF};font-size:22px;font-style:italic;color:${C.brass};text-align:center">Ansh Rajput</p>
    <p style="margin:4px 0 0;font-family:${SANS};font-size:13px;line-height:1.7;color:${C.muted};text-align:center">Software engineer &middot; Edmonton<br/>
      ${link(site.url, "anshrajput.com")} &middot; ${link(site.linkedin, "LinkedIn")} &middot; ${link(site.github, "GitHub")}</p>`;
  return shell({
    preview: "Thanks for reaching out. Your message came through and I'll reply soon.",
    kicker: "Message received",
    body,
    footer: `You're getting this because you used the contact form on anshrajput.com. Reference ${esc(q.ref)}.`,
  });
}
