// artwork for the email banner: a dark Chinatown night behind the dragon crest

const W = 1200, H = 360;
const CREST = { x0: 290, x1: 610, y0: 22, y1: 330 };
const TEXT = { x0: 622, x1: 1040, y0: 104, y1: 284 };

// deterministic "random" so the banner is identical on every render
const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const f = (n: number) => (Math.round(n * 10) / 10).toString();

// one solid pagoda roof sitting on a wall top at (x, y), half-width rw: upturned eaves, sloped sides
export const roof = (x: number, y: number, rw: number, ridgeHalf: number | null) => {
  const e = rw + 10, lift = 9, ridge = ridgeHalf ?? rw * 0.32, top = y - 22;
  if (ridgeHalf !== null)
    return `M${f(x - e)} ${f(y - lift)}` +
      `Q${f(x - rw * 0.92)} ${f(y + 3)} ${f(x - rw * 0.7)} ${f(y + 3)}H${f(x + rw * 0.7)}` +
      `Q${f(x + rw * 0.92)} ${f(y + 3)} ${f(x + e)} ${f(y - lift)}` +
      `Q${f(x + rw * 0.8)} ${f(y - 4)} ${f(x + rw * 0.55)} ${f(y - 11)}L${f(x + ridge)} ${f(top)}H${f(x - ridge)}` +
      `L${f(x - rw * 0.55)} ${f(y - 11)}Q${f(x - rw * 0.8)} ${f(y - 4)} ${f(x - e)} ${f(y - lift)}Z`;
  return `M${f(x - e)} ${f(y - lift)}` +
    `Q${f(x - rw * 0.92)} ${f(y + 3)} ${f(x - rw * 0.7)} ${f(y + 3)}` +
    `H${f(x + rw * 0.7)}` +
    `Q${f(x + rw * 0.92)} ${f(y + 3)} ${f(x + e)} ${f(y - lift)}` +
    `Q${f(x + rw * 0.8)} ${f(y - 4)} ${f(x + rw * 0.55)} ${f(y - 11)}` +
    `L${f(x + ridge)} ${f(top)}` +
    `Q${f(x + ridge + 5)} ${f(top - 1)} ${f(x + ridge + 8)} ${f(top - 6)}` +
    `Q${f(x + ridge + 2)} ${f(top - 3)} ${f(x + ridge - 2)} ${f(top - 3)}` +
    `H${f(x - ridge + 2)}` +
    `Q${f(x - ridge - 2)} ${f(top - 3)} ${f(x - ridge - 8)} ${f(top - 6)}` +
    `Q${f(x - ridge - 5)} ${f(top - 1)} ${f(x - ridge)} ${f(top)}` +
    `L${f(x - rw * 0.55)} ${f(y - 11)}` +
    `Q${f(x - rw * 0.8)} ${f(y - 4)} ${f(x - e)} ${f(y - lift)}Z`;
};

// a house of 1 to 3 tiers
type House = { svg: string; left: number; right: number; top: number };
const house = (x: number, base: number, w: number, tiers: number, lit: boolean, r: () => number, fill: string, stroke: string): House => {
  let svg = "", y = base, ww = w, top = base;
  for (let i = 0; i < tiers; i++) {
    const h = i === 0 ? 30 : 22;
    const hw = ww / 2;
    svg += `<rect x="${f(x - hw)}" y="${f(y - h)}" width="${f(ww)}" height="${h + 2}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
    if (lit) {
      if (i === 0) {
        // door with an arched top, and a window either side
        svg += `<path d="M${f(x - 6)} ${f(y)}V${f(y - 13)}Q${f(x)} ${f(y - 20)} ${f(x + 6)} ${f(y - 13)}V${f(y)}Z" fill="#020604"/>`;
        // side windows only where there is room beside the door
        if (hw * 0.55 - 5 > 9) for (const k of [-1, 1]) if (r() < 0.8) svg += `<rect x="${f(x + k * hw * 0.55 - 5)}" y="${f(y - h + 8)}" width="10" height="12" rx="2" fill="#ffb347" opacity="${f(0.5 + r() * 0.35)}"/>`;
      } else if (r() < 0.75) {
        svg += `<rect x="${f(x - 5)}" y="${f(y - h + 6)}" width="10" height="11" rx="2" fill="#ffb347" opacity="${f(0.45 + r() * 0.4)}"/>`;
      }
    }
    const rw = ww * 0.62;
    const above = i < tiers - 1 ? (ww * 0.7) / 2 - 2 : null;
    svg += `<path d="${roof(x, y - h, rw, above)}" fill="${fill}" stroke="${stroke}" stroke-width="1.1" stroke-linejoin="round"/>`;
    top = y - h - 28;
    y = y - h - 10;
    ww *= 0.7;
  }
  const half = w * 0.62 + 12;
  return { svg, left: x - half, right: x + half, top };
};

// a hanging paper lantern with a soft glow and tassel
const lantern = (x: number, len: number, s: number, glow: number) => {
  const cy = len + 5 * s + 22 * s;
  return `
  <line x1="${x}" y1="0" x2="${x}" y2="${f(len)}" stroke="#d8b46a" stroke-opacity=".45" stroke-width="1.5"/>
  <circle cx="${x}" cy="${f(cy)}" r="${f(glow * s)}" fill="url(#glow)"/>
  <rect x="${f(x - 10 * s)}" y="${f(len)}" width="${f(20 * s)}" height="${f(5 * s)}" rx="2" fill="#2a1a0f"/>
  <ellipse cx="${x}" cy="${f(cy)}" rx="${f(19 * s)}" ry="${f(22 * s)}" fill="url(#paper)"/>
  <ellipse cx="${x}" cy="${f(cy)}" rx="${f(9 * s)}" ry="${f(22 * s)}" fill="none" stroke="#5a1408" stroke-opacity=".55" stroke-width="1.2"/>
  <ellipse cx="${x}" cy="${f(cy)}" rx="${f(15 * s)}" ry="${f(22 * s)}" fill="none" stroke="#5a1408" stroke-opacity=".4" stroke-width="1"/>
  <rect x="${f(x - 10 * s)}" y="${f(cy + 20 * s)}" width="${f(20 * s)}" height="${f(5 * s)}" rx="2" fill="#2a1a0f"/>
  <line x1="${x}" y1="${f(cy + 25 * s)}" x2="${x}" y2="${f(cy + 38 * s)}" stroke="#d8b46a" stroke-width="2"/>`;
};

const overlaps = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1;

// lay houses left to right without any two touching, keeping clear of the crest
const row = (r: () => number, base: number, wMin: number, wMax: number, gap: number, maxTiers: number, lit: boolean, fill: string, stroke: string) => {
  let out = "", x = 6;
  while (x < W) {
    let w = wMin + r() * (wMax - wMin);
    // near the right edge, shrink the last house to fit rather than dropping it
    if (x + (w * 0.62 + 12) * 2 > W - 6) w = Math.min(w, (W - 6 - x - 24) / 1.24);
    if (w < wMin * 0.5) break;
    const half = w * 0.62 + 12;
    const cx = x + half;
    if (overlaps(cx - half, cx + half, CREST.x0, CREST.x1)) { x = CREST.x1 + 4; continue; }
    const underTitle = overlaps(cx - half, cx + half, TEXT.x0, TEXT.x1);
    if (cx + half > W - 6) break;
    const tiers = underTitle ? 1 : Math.min(maxTiers, (lit ? 2 : 1) + Math.floor(r() * 2));
    const hs = house(cx, base, underTitle ? w * 0.8 : w, tiers, lit, r, fill, stroke);
    // single-storey houses under the title must stay below it
    if (!underTitle || hs.top > TEXT.y1 + 4) out += hs.svg;
    x = cx + half + gap + r() * gap;
  }
  return out;
};

export function emailBannerScene(): string {
  const r = rng(11);
  const far = row(r, H - 44, 46, 66, 4, 3, false, "#0d271a", "#0d271a");
  const near = row(r, H + 2, 62, 90, 8, 3, true, "#0a1a12", "rgba(216,180,106,.22)");
  // embers, kept out of the crest square, the title block and the lanterns
  let embers = "";
  const lanterns = [[150, 40, 1.15], [258, 92, 0.85], [700, 14, 0.8], [858, 22, 0.85], [1118, 96, 1.1]] as const;
  for (let i = 0, tries = 0; i < 40 && tries < 400; tries++) {
    const x = 12 + r() * (W - 24), y = 24 + r() * 210, rr = 0.8 + r() * 2;
    if (x > CREST.x0 - 6 && x < CREST.x1 + 6 && y > CREST.y0 - 6 && y < CREST.y1 + 6) continue;
    if (x > TEXT.x0 - 8 && x < TEXT.x1 + 8 && y > TEXT.y0 - 10 && y < TEXT.y1 + 6) continue;
    if (lanterns.some(([lx, len, s]) => Math.abs(x - lx) < 26 * s && y < len + 70 * s)) continue;
    embers += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="${r() < 0.5 ? "#ffcf7a" : "#ff8a3c"}" opacity="${f(0.3 + r() * 0.5)}"/>`;
    i++;
  }
  // astrolabe rings sized to sit just around the crest, not under the title
  let ticks = "";
  for (let k = 0; k < 72; k++) {
    const a = (k / 72) * Math.PI * 2, r1 = 168, r2 = k % 6 ? 162 : 155;
    ticks += `M${f(450 + Math.cos(a) * r1)} ${f(175 + Math.sin(a) * r1)}L${f(450 + Math.cos(a) * r2)} ${f(175 + Math.sin(a) * r2)}`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>
  <radialGradient id="sky" cx="38%" cy="45%" r="75%"><stop offset="0" stop-color="#173f2b"/><stop offset=".55" stop-color="#0a1f15"/><stop offset="1" stop-color="#040a06"/></radialGradient>
  <radialGradient id="moon" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#f0d79a" stop-opacity=".2"/><stop offset="1" stop-color="#f0d79a" stop-opacity="0"/></radialGradient>
  <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ff9a3a" stop-opacity=".5"/><stop offset="1" stop-color="#ff5a1a" stop-opacity="0"/></radialGradient>
  <radialGradient id="paper" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#ffd58a"/><stop offset=".55" stop-color="#e0612b"/><stop offset="1" stop-color="#7d1c10"/></radialGradient>
  <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1f15" stop-opacity="0"/><stop offset="1" stop-color="#040a06" stop-opacity=".9"/></linearGradient>
  <linearGradient id="brass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6b4a1c"/><stop offset=".5" stop-color="#f0d79a"/><stop offset="1" stop-color="#6b4a1c"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<circle cx="450" cy="170" r="220" fill="url(#moon)"/>
<circle cx="450" cy="175" r="168" fill="none" stroke="#d8b46a" stroke-opacity=".12" stroke-width="1.5"/>
<path d="${ticks}" stroke="#d8b46a" stroke-opacity=".16" stroke-width="1.4"/>
${embers}
<g opacity=".8">${far}</g>
<rect y="${H - 120}" width="${W}" height="120" fill="url(#mist)"/>
${near}
${lanterns.map(([x, len, s]) => lantern(x, len, s, x > 600 && x < 1000 ? 40 : 58)).join("")}
<rect x="0" y="0" width="${W}" height="3" fill="url(#brass)"/>
<rect x="0" y="${H - 3}" width="${W}" height="3" fill="url(#brass)"/>
</svg>`;
}
