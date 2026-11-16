// the AR dragon mark, drawn from geometry (512 grid)
type Pt = { x: number; y: number };

const f = (n: number) => (Math.round(n * 10) / 10).toString();
const pt = (p: Pt) => `${f(p.x)} ${f(p.y)}`;
const C = { x: 256, y: 262 };
const deg = Math.PI / 180;

// ---------- Body centreline ---------- s = 0 at the neck (upper right), running anticlockwise round the top
const TH0 = -52 * deg, SWEEP = 288 * deg;
const R = (s: number) => 150 + 5 * Math.sin(s * Math.PI * 4.2) * (0.4 + s * 0.6);
const W = (s: number) => {
  const base = 6 + 42 * Math.pow(1 - s, 0.8);
  return s < 0.05 ? base * (0.82 + (s / 0.05) * 0.18) : base;
};
const at = (s: number) => {
  const th = TH0 - s * SWEEP;
  const r = R(s);
  return { x: C.x + r * Math.cos(th), y: C.y + r * Math.sin(th), th };
};
// tangent toward the tail and outward normal (away from the centre)
const frame = (s: number) => {
  const a = at(Math.max(0, s - 0.002)), b = at(Math.min(1, s + 0.002));
  const tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty);
  const t = { x: tx / l, y: ty / l };
  // anticlockwise travel in screen space: the left-hand normal points outward
  const n = { x: t.y, y: -t.x };
  const p = at(s);
  const outward = (p.x - C.x) * n.x + (p.y - C.y) * n.y > 0 ? n : { x: -n.x, y: -n.y };
  return { p, t, n: outward };
};
const off = (s: number, k: number): Pt => {
  const { p, n } = frame(s);
  const w = W(s) / 2;
  return { x: p.x + n.x * w * k, y: p.y + n.y * w * k };
};
const N = 130;
const S = Array.from({ length: N + 1 }, (_, i) => i / N);
const edge = (k: number, from = 0, to = 1) => S.filter((s) => s >= from && s <= to).map((s) => off(s, k));
const smooth = (pts: Pt[]) => {
  // catmull-Rom to cubic Bézier
  let d = `M${pt(pts[0])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return d;
};

// tail blade: a barbed spade at s = 1, pointing along the tail
const tailEnd = frame(1);
const tip = { x: tailEnd.p.x + tailEnd.t.x * 8, y: tailEnd.p.y + tailEnd.t.y * 8 };
const tb = (u: number, v: number): Pt => ({ x: tailEnd.p.x + tailEnd.t.x * u + tailEnd.n.x * v, y: tailEnd.p.y + tailEnd.t.y * u + tailEnd.n.y * v });

const outer = edge(1), inner = edge(-1).reverse();
const bodyD = smooth(outer) + `L${pt(tb(2, 3))}L${pt(tip)}L${pt(tb(2, -3))}` + smooth(inner).replace(/^M/, "L") + "Z";
const bladeD = `M${pt(tb(-6, 4))}C${pt(tb(4, 9))} ${pt(tb(6, 19))} ${pt(tb(2, 22))}L${pt(tb(14, 15))}C${pt(tb(22, 12))} ${pt(tb(30, 6))} ${pt(tb(42, 0))}C${pt(tb(30, -6))} ${pt(tb(22, -12))} ${pt(tb(14, -15))}L${pt(tb(2, -22))}C${pt(tb(6, -19))} ${pt(tb(4, -9))} ${pt(tb(-6, -4))}Z`;
const bladeRib = `M${pt(tb(-2, 0))}L${pt(tb(36, 0))}M${pt(tb(10, 0))}L${pt(tb(6, 12))}M${pt(tb(10, 0))}L${pt(tb(6, -12))}M${pt(tb(20, 0))}L${pt(tb(17, 8))}M${pt(tb(20, 0))}L${pt(tb(17, -8))}`;

// belly: armoured plates along the inner side
const bellyOuter = edge(-0.42, 0, 0.97), bellyInner = edge(-0.97, 0, 0.97).reverse();
const bellyD = smooth(bellyOuter) + smooth(bellyInner).replace(/^M/, "L") + "Z";
let plates = "";
for (let s = 0.03; s < 0.95; s += 0.021 + s * 0.006) {
  const a = off(s, -0.44), m = off(s + 0.005, -0.7), b = off(s, -0.97);
  plates += `M${pt(a)}Q${pt(m)} ${pt(b)}`;
}

// scales: overlapping arcs in staggered rows over the back, opening toward the tail
let scales = "", scaleHi = "";
let row = 0;
for (let s = 0.015; s < 0.97; row++) {
  const w = W(s);
  const step = Math.max(0.01, (w * 0.3) / (2 * Math.PI * 150));
  const ks = row % 2 ? [-0.12, 0.3, 0.72] : [0.09, 0.51, 0.9];
  for (const k of ks) {
    const { p, t, n } = frame(s);
    const c = { x: p.x + n.x * (w / 2) * k, y: p.y + n.y * (w / 2) * k };
    const r = Math.max(1.8, w * 0.17);
    // arc: half-circle on the head side, endpoints across the body
    const e1 = { x: c.x + n.x * r, y: c.y + n.y * r }, e2 = { x: c.x - n.x * r, y: c.y - n.y * r };
    const bulge = { x: c.x - t.x * r * 1.25, y: c.y - t.y * r * 1.25 };
    scales += `M${pt(e1)}Q${pt(bulge)} ${pt(e2)}`;
    if (k > 0.3) scaleHi += `M${pt({ x: c.x + n.x * r * 0.7 - t.x * r * 0.5, y: c.y + n.y * r * 0.7 - t.y * r * 0.5 })}Q${pt({ x: c.x - t.x * r * 1.05, y: c.y - t.y * r * 1.05 })} ${pt({ x: c.x - t.x * r * 0.6, y: c.y - t.y * r * 0.6 })}`;
  }
  s += step;
}

// dorsal spines: curved bone blades along the outer edge, raking toward the tail
let spines = "";
for (let s = 0.16; s < 0.93; s += 0.032) {
  const { t, n } = frame(s);
  const w = W(s);
  const base = off(s, 0.92);
  const L = 5 + w * 0.42;
  const b1 = { x: base.x - t.x * w * 0.13, y: base.y - t.y * w * 0.13 };
  const b2 = { x: base.x + t.x * w * 0.1, y: base.y + t.y * w * 0.1 };
  const tp = { x: base.x + n.x * L + t.x * L * 0.7, y: base.y + n.y * L + t.y * L * 0.7 };
  const ctl = { x: base.x + n.x * L * 0.75 - t.x * L * 0.1, y: base.y + n.y * L * 0.75 - t.y * L * 0.1 };
  spines += `M${pt(b1)}Q${pt(ctl)} ${pt(tp)}Q${pt({ x: (b2.x + tp.x) / 2 + n.x * 1, y: (b2.y + tp.y) / 2 + n.y * 1 })} ${pt(b2)}Z`;
}

// sheen along the back
const sheenD = smooth(edge(0.62, 0.015, 0.88)) + smooth(edge(0.42, 0.015, 0.88).reverse()).replace(/^M/, "L") + "Z";
const spineLine = smooth(edge(0.2, 0.02, 0.95));

// ---------- Legs: clawed feet gripping the medallion ----------
const MED = 106;
const leg = (s: number, flip: number) => {
  // a foreleg reaching in from under the body; the hand grips the medallion's brass rim with four hooked talons
  const c0 = at(s);
  const ang = Math.atan2(c0.y - C.y, c0.x - C.x);
  const u = { x: Math.cos(ang), y: Math.sin(ang) }, v = { x: -u.y, y: u.x };
  const P2 = (r: number, k: number): Pt => ({ x: C.x + u.x * r + v.x * k, y: C.y + u.y * r + v.y * k });
  const rin = R(s) - W(s) / 2;
  const sh = flip * 5;
  const d = MED - 94;
  const limbs =
    `M${pt(P2(rin + 10, -17))}C${pt(P2(rin - 8, -16))} ${pt(P2(121 + d, -9 + sh))} ${pt(P2(115 + d, -7.5 + sh))}` +
    `C${pt(P2(111 + d, -10 + sh))} ${pt(P2(106 + d, -13 + sh))} ${pt(P2(103 + d, -12 + sh))}` +
    `Q${pt(P2(100 + d, sh))} ${pt(P2(103 + d, 12 + sh))}` +
    `C${pt(P2(106 + d, 13 + sh))} ${pt(P2(111 + d, 10 + sh))} ${pt(P2(115 + d, 7.5 + sh))}` +
    `C${pt(P2(121 + d, 9 + sh))} ${pt(P2(rin - 8, 16))} ${pt(P2(rin + 10, 17))}Z`;
  let lscale = "";
  for (const r of [rin - 4, Math.min(rin - 10, 124 + d)]) lscale += `M${pt(P2(r, -6 + sh * 0.6))}Q${pt(P2(r - 5, sh * 0.6))} ${pt(P2(r, 6 + sh * 0.6))}`;
  for (const k of [-8, 0, 8]) lscale += `M${pt(P2(109 + d, k * 1.05 + sh))}L${pt(P2(105 + d, k + sh))}`;
  // three talons, 8 apart, each hooking over the brass rim and ending on the seal's inner edge
  let claws = "";
  for (const k of [-8, 0, 8]) {
    const b = P2(104 + d, k + sh);
    const tipP = P2(MED - 4.5, k * 1.05 + sh);
    const c = P2(MED + 3, k * 1.05 + sh + 3.2);
    const w = { x: v.x * 2.3, y: v.y * 2.3 };
    claws += `M${pt({ x: b.x + w.x, y: b.y + w.y })}Q${pt(c)} ${pt(tipP)}Q${pt(P2(MED + 1, k * 1.05 + sh + 0.6))} ${pt({ x: b.x - w.x, y: b.y - w.y })}Z`;
  }
  return { limbs, claws, lscale };
};
const L1 = leg(0.31, -1), L2 = leg(0.67, 1);

const neck = frame(0);
const headAng = Math.atan2(-neck.t.y, -neck.t.x) / deg - 12;

// monogram outlines (Cinzel Black 104px, centred on the seal)
const AR = "M211.8 224.4L212.7 224.4L245.9 293.2Q247.5 295.9 249.6 297.0L249.6 297.0Q252.0 298.6 254.4 298.6L254.4 298.6L255.3 298.6L255.3 299.6L215.9 299.6L215.9 298.6L216.8 298.6Q218.9 298.6 220.5 296.9Q222.1 295.2 220.7 292.1L220.7 292.1L220.8 292.1L216.8 282.4L194.5 282.4L190.3 292.1L190.4 292.1Q189.4 294.1 190.0 295.6Q190.5 297.0 191.8 297.8Q193.1 298.6 194.3 298.6L194.3 298.6L195.3 298.6L195.3 299.6L172.1 299.6L172.1 298.6L173.0 298.6Q175.4 298.6 178.0 297.0L178.0 297.0Q180.0 295.9 181.4 293.5L181.4 293.5L205.9 239.8Q206.4 238.9 207.3 236.9Q208.2 234.9 209.1 232.5Q210.1 230.1 210.9 227.9Q211.7 225.7 211.8 224.4L211.8 224.4ZM214.6 277.2L205.9 256.3L196.8 277.2L214.6 277.2ZM262.8 292.1L262.8 292.1L262.8 234.4Q262.7 231.7 260.7 229.8Q258.8 227.9 256.1 227.9L256.1 227.9L254.8 227.9L254.8 226.8L295.4 226.8Q300.1 226.8 305.0 227.7Q309.9 228.5 313.9 230.6Q318.0 232.8 320.5 236.6Q323.0 240.5 323.0 246.5L323.0 246.5Q323.0 250.5 321.5 254.7Q320.1 258.9 316.5 262.1Q312.9 265.2 306.3 266.3L306.3 266.3Q310.7 267.5 313.9 270.5Q317.2 273.5 319.0 276.7L319.0 276.7Q319.2 277.0 320.1 278.4Q320.9 279.9 322.2 282.0Q323.5 284.2 325.0 286.4Q326.4 288.7 327.9 290.7L327.9 290.7Q330.3 293.9 332.0 295.6Q333.8 297.3 335.6 297.9Q337.4 298.5 339.9 298.6L339.9 298.6L339.9 299.6L326.9 299.6Q320.7 299.6 315.4 298.9Q310.1 298.2 305.9 295.7Q301.7 293.2 298.4 287.8L298.4 287.8Q297.3 285.9 296.6 284.0Q295.8 282.2 295.3 280.4Q294.8 278.6 294.4 277.0Q294.1 275.4 293.8 273.9Q293.4 272.4 293.0 271.0L293.0 271.0Q292.0 267.3 290.5 266.0Q289.1 264.6 287.6 264.1L287.6 264.1L287.6 263.0L289.3 263.0Q292.2 263.0 294.5 261.7Q296.8 260.3 298.3 257.5Q299.9 254.7 300.4 250.2L300.4 250.2Q300.5 249.4 300.6 248.4Q300.7 247.4 300.6 246.0L300.6 246.0Q300.2 238.3 296.8 235.3Q293.4 232.3 288.8 232.3L288.8 232.3L284.2 232.3L284.2 292.1Q284.2 294.8 286.2 296.7Q288.1 298.6 290.8 298.6L290.8 298.6L292.1 298.6L292.1 299.6L254.8 299.6L254.8 298.6L256.1 298.6Q258.8 298.6 260.7 296.7Q262.7 294.8 262.8 292.1Z";

// ---------- Medallion engraving ----------
let medTicks = "";
for (let k = 0; k < 72; k++) {
  const a = (k / 72) * Math.PI * 2, r1 = MED - 9, r2 = k % 6 ? MED - 12.5 : MED - 15;
  medTicks += `M${f(C.x + Math.cos(a) * r1)} ${f(C.y + Math.sin(a) * r1)}L${f(C.x + Math.cos(a) * r2)} ${f(C.y + Math.sin(a) * r2)}`;
}
// faint astrolabe rings on the field
let fieldTicks = "";
for (let k = 0; k < 120; k++) {
  const a = (k / 120) * Math.PI * 2, r1 = 214, r2 = k % 10 ? 208 : 200;
  fieldTicks += `M${f(C.x + Math.cos(a) * r1)} ${f(C.y + Math.sin(a) * r1)}L${f(C.x + Math.cos(a) * r2)} ${f(C.y + Math.sin(a) * r2)}`;
}

export function dragonMark(P: string, FLAME: boolean): string {
  const rivet = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="7" fill="url(#${P}-rivet)" stroke="#1a1006" stroke-width="1.2"/><circle cx="${x - 2}" cy="${y - 2}" r="1.8" fill="#fff6d8" opacity=".8"/>`;
  const HEAD = `
<g transform="translate(${f(neck.p.x)} ${f(neck.p.y)}) rotate(${f(headAng)}) scale(1.22)">
  <path d="M-40 -20 C-28 -31 -8 -30 2 -22 C10 -10 10 8 0 18 C-10 26 -28 25 -42 16 Z" fill="url(#${P}-body)"/>
  <path d="M-30 -14 Q-24 -18 -18 -14 M-30 0 Q-24 -4 -18 0 M-28 12 Q-22 8 -16 12 M-16 -20 Q-10 -24 -4 -20" fill="none" stroke="#9de8bf" stroke-opacity=".4" stroke-width="1.2"/>
  <path d="M-2 4 C-16 4 -34 10 -46 21 Q-39 24 -39 31 C-33 30 -29 35 -30 42 Q-23 40 -20 47 C-12 38 -4 28 4 16 Z" fill="url(#${P}-frill)" stroke="#06140c" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="M-2 8 C-16 10 -30 15 -42 22 M0 11 C-10 19 -22 28 -32 39 M2 14 C-4 24 -12 34 -20 43" fill="none" stroke="#c9aa6e" stroke-opacity=".75" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M10 -26 C-8 -46 -42 -60 -86 -64 C-48 -50 -18 -36 -2 -16 Z" fill="url(#${P}-bone)" stroke="#2a1a08" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M-16 -43 L-12 -38 M-30 -50 L-27 -45 M-45 -56 L-43 -51 M-60 -60 L-58 -56" stroke="#6a4a1c" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M-6 -20 C-30 -32 -62 -38 -104 -32 C-64 -26 -34 -16 -12 -4 Z" fill="url(#${P}-bone)" stroke="#2a1a08" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M-28 -27 L-26 -22 M-44 -31 L-43 -26 M-62 -33 L-61 -28 M-80 -33 L-80 -29" stroke="#6a4a1c" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M-4 12 C20 20 50 24 78 24 L90 20 L84 15 C60 14 34 10 8 2 Z" fill="url(#${P}-jaw)" stroke="#06140c" stroke-width="1.8" stroke-linejoin="round"/>
  <path d="M17 11 L18.5 15.5 M30 12.5 L31.5 18 M44 14 L45 19.5 M58 15.5 L58.5 20.5" stroke="#5a3e14" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M30 6 C50 11 66 13 84 14 L80 10 C62 9 48 6 34 2 Z" fill="#4a0d06"/>
  <path d="M56 16 L59 7 L62 16 Z M70 18 L72.5 10 L75 17.5 Z M80 18 L82 12 L84 17 Z" fill="#f2e6c4"/>
  <path d="M-16 -8 C-14 -22 -2 -30 14 -31 C26 -32 34 -27 42 -22 L64 -17 C80 -14 94 -11 104 -6 C108 -4 108 1 104 3 L92 6 C74 7 56 5 36 2 C22 0 12 4 2 12 C-6 16 -14 8 -16 -8 Z" fill="url(#${P}-head)" stroke="#06140c" stroke-width="2" stroke-linejoin="round"/>
  <path d="M-10 -16 C0 -26 16 -30 30 -27 C42 -24 60 -18 80 -14 C92 -12 100 -9 104 -6" fill="none" stroke="#b6f5d2" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/>
  <path d="M-12 2 C0 6 18 3 36 3 C56 6 74 7 92 6" fill="none" stroke="#04110a" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/>
  <path d="M0 -4 C10 0 20 0 32 -5" fill="none" stroke="#9de8bf" stroke-opacity=".35" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M44 3 L47 15 L51 4 Z M62 5 L65 18 L69 5.5 Z M78 6 L80.5 14 L83 6 Z M92 5 L93.5 10 L96 4.5 Z" fill="#f6ecd0" stroke="#3a2a10" stroke-width=".6"/>
  ${FLAME ? `<g class="logo-flame"><path d="M96 8 C120 -14 160 -18 196 -4 C176 0 168 6 190 14 C166 14 172 24 196 32 C158 40 118 30 96 14 Z" fill="url(#${P}-flame)"/><path d="M98 9 C118 0 140 0 160 6 C142 10 140 14 158 20 C136 22 116 18 98 13 Z" fill="#fff6d8" opacity=".85"/></g>` : ""}
  <path d="M48 -18 L54 -13 L48 -9 M60 -15 L66 -10.5 L60 -7 M72 -12.5 L77.5 -8.5 L72 -5.5 M84 -10 L88.5 -6.5 L84 -4" fill="none" stroke="#9de8bf" stroke-opacity=".55" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="M-6 -6 Q0 -11 6 -6 M0 3 Q6 -2 12 3 M10 -16 Q16 -21 22 -16 M-10 4 Q-4 -1 2 4" fill="none" stroke="#9de8bf" stroke-opacity=".35" stroke-width="1.2"/>
  <path d="M8 -24 C24 -30 40 -25 52 -15 C38 -19 24 -19 10 -16 Z" fill="#0b2a1a" stroke="#06140c" stroke-width="1"/>
  <path class="logo-eye" d="M18 -14 C26 -19 36 -18 44 -12 C36 -9 26 -9 18 -14 Z" fill="url(#${P}-eye)"/>
  <path d="M31 -17.5 C29.5 -14.5 29.5 -12 31 -9.5 C32.5 -12 32.5 -14.5 31 -17.5 Z" fill="#160600"/>
  <circle cx="27" cy="-15" r="1.3" fill="#fff6dc"/>
  <path d="M96 -6 C99 -7 102 -6 103 -4 C100 -4 98 -4 96 -6 Z" fill="#020604"/>
  <path d="M22 21 C21 27 17 32 11 36 M33 23 C32 29 29 35 23 40 M44 24.5 C44 31 41 37 35 42" fill="none" stroke="#d9c48c" stroke-opacity=".75" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M101 3 C101 18 92 30 76 37 C64 42 52 45 40 46" fill="none" stroke="url(#${P}-whisker)" stroke-width="2.2" stroke-linecap="round"/>
</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs>
  <radialGradient id="${P}-bg" cx="42%" cy="34%" r="78%"><stop offset="0" stop-color="#143a27"/><stop offset=".55" stop-color="#081c12"/><stop offset="1" stop-color="#030a06"/></radialGradient>
  <linearGradient id="${P}-brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe9b4"/><stop offset=".25" stop-color="#c99a4e"/><stop offset=".5" stop-color="#6b4a1c"/><stop offset=".72" stop-color="#b48640"/><stop offset="1" stop-color="#3a2810"/></linearGradient>
  <radialGradient id="${P}-rivet" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fbe9b4"/><stop offset=".5" stop-color="#a87a36"/><stop offset="1" stop-color="#3a2610"/></radialGradient>
  <linearGradient id="${P}-body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2f8456"/><stop offset=".35" stop-color="#21603f"/><stop offset=".7" stop-color="#18472f"/><stop offset="1" stop-color="#113524"/></linearGradient>
  <linearGradient id="${P}-belly" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d8c48a"/><stop offset=".5" stop-color="#a88a4a"/><stop offset="1" stop-color="#5e4718"/></linearGradient>
  <linearGradient id="${P}-head" x1="0" y1="-1" x2="0.4" y2="1"><stop offset="0" stop-color="#3a9466"/><stop offset=".45" stop-color="#1f5a3b"/><stop offset="1" stop-color="#0f3322"/></linearGradient>
  <linearGradient id="${P}-jaw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9b56c"/><stop offset="1" stop-color="#7a5622"/></linearGradient>
  <linearGradient id="${P}-bone" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#5a4320"/><stop offset=".45" stop-color="#c9aa6e"/><stop offset="1" stop-color="#fbf0d0"/></linearGradient>
  <linearGradient id="${P}-frill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a4a31"/><stop offset="1" stop-color="#0a2016"/></linearGradient>
  <linearGradient id="${P}-whisker" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3e2b0"/><stop offset="1" stop-color="#f3e2b0" stop-opacity="0"/></linearGradient>
  <radialGradient id="${P}-eye" cx="40%" cy="50%" r="60%"><stop offset="0" stop-color="#fff1b0"/><stop offset=".45" stop-color="#ffb43c"/><stop offset="1" stop-color="#d4430c"/></radialGradient>
  <linearGradient id="${P}-flame" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff3c8"/><stop offset=".4" stop-color="#ffb347"/><stop offset="1" stop-color="#ff5a1a" stop-opacity=".2"/></linearGradient>
  <radialGradient id="${P}-face" cx="45%" cy="38%" r="70%"><stop offset="0" stop-color="#173f2b"/><stop offset="1" stop-color="#06120b"/></radialGradient>
  <linearGradient id="${P}-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2c4"/><stop offset=".38" stop-color="#f0cf82"/><stop offset=".62" stop-color="#c08c3c"/><stop offset="1" stop-color="#8a5e22"/></linearGradient>
  <radialGradient id="${P}-glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".22"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/></radialGradient>
  <linearGradient id="${P}-limb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1f5236"/><stop offset="1" stop-color="#0f2c1c"/></linearGradient>
  <linearGradient id="${P}-talon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf0d0"/><stop offset=".6" stop-color="#b89a5e"/><stop offset="1" stop-color="#2a1a08"/></linearGradient>
  <path id="${P}-shape" d="${bodyD}"/>
  <path id="${P}-ar" d="${AR}"/>
  <clipPath id="${P}-clip"><use href="#${P}-shape"/></clipPath>
  <filter id="${P}-shadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#000" flood-opacity=".55"/></filter>
</defs>
<rect x="6" y="6" width="500" height="500" rx="112" fill="url(#${P}-bg)"/>
<circle cx="${C.x}" cy="${C.y}" r="214" fill="none" stroke="#d8b46a" stroke-opacity=".14" stroke-width="2"/>
<circle cx="${C.x}" cy="${C.y}" r="196" fill="none" stroke="#d8b46a" stroke-opacity=".1" stroke-width="1.5"/>
<path d="${fieldTicks}" stroke="#d8b46a" stroke-opacity=".16" stroke-width="1.5"/>
<rect x="6" y="6" width="500" height="500" rx="112" fill="none" stroke="url(#${P}-brass)" stroke-width="12"/>
<rect x="20" y="20" width="472" height="472" rx="99" fill="none" stroke="#1a1006" stroke-opacity=".7" stroke-width="2"/>
<rect x="24" y="24" width="464" height="464" rx="96" fill="none" stroke="#f0d79a" stroke-opacity=".25" stroke-width="1.2"/>
${rivet(62, 62)}${rivet(450, 62)}${rivet(62, 450)}${rivet(450, 450)}
<circle cx="${C.x}" cy="${C.y}" r="130" fill="url(#${P}-glow)"/>
<circle cx="${C.x}" cy="${C.y}" r="${MED}" fill="url(#${P}-face)"/>
<circle cx="${C.x}" cy="${C.y}" r="${MED}" fill="none" stroke="url(#${P}-brass)" stroke-width="9"/>
<circle cx="${C.x}" cy="${C.y}" r="${MED - 6}" fill="none" stroke="#1a1006" stroke-opacity=".8" stroke-width="1.5"/>
<path d="${medTicks}" stroke="#d8b46a" stroke-opacity=".55" stroke-width="1.6"/>
<g transform="translate(256 262) scale(0.95) translate(-256 -262)">
  <use href="#${P}-ar" fill="#020805" transform="translate(0.6 2.2)" opacity=".7"/>
  <use href="#${P}-ar" fill="url(#${P}-gold)" stroke="#5a3a10" stroke-width="1.6" stroke-linejoin="round"/>
  <use href="#${P}-ar" fill="none" stroke="#fff6d8" stroke-opacity=".55" stroke-width="1" transform="translate(-0.6 -0.9)"/>
</g>
<g filter="url(#${P}-shadow)">
  <path d="${L1.limbs}${L2.limbs}" fill="url(#${P}-limb)" stroke="#06140c" stroke-width="1.8"/>
  <path d="${L1.lscale}${L2.lscale}" fill="none" stroke="#a8f0c8" stroke-opacity=".4" stroke-width="1.2"/>
  <path d="${L1.claws}${L2.claws}" fill="#eadcb2" stroke="#3a2810" stroke-width="1.1"/>
  <path d="${spines}" fill="#e2d1a6" stroke="#2a1a08" stroke-width="1.2" stroke-linejoin="round"/>
  <path d="${bladeD}" fill="url(#${P}-bone)" stroke="#2a1a08" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="${bladeRib}" stroke="#6a4a1c" stroke-width="1.2" stroke-linecap="round"/>
  <use href="#${P}-shape" fill="url(#${P}-body)"/>
  <g clip-path="url(#${P}-clip)">
    <path d="${bellyD}" fill="url(#${P}-belly)"/>
    <path d="${plates}" fill="none" stroke="#5a3e14" stroke-opacity=".75" stroke-width="1.6"/>
    <path d="${scales}" fill="none" stroke="#06261a" stroke-opacity=".8" stroke-width="1.5"/>
    <path d="${scaleHi}" fill="none" stroke="#a8f0c8" stroke-opacity=".45" stroke-width="1"/>
    <path d="${spineLine}" fill="none" stroke="#062216" stroke-opacity=".5" stroke-width="2.2"/>
    <path d="${sheenD}" fill="#c8ffe0" fill-opacity=".22"/>
  </g>
  <use href="#${P}-shape" fill="none" stroke="#04110a" stroke-width="2.4" stroke-linejoin="round"/>
  ${HEAD}
</g>
</svg>`;
}

// bold version of the same mark for small sizes (header logo, browser tab, email): a thick body
export function dragonMarkSmall(P: string, FLAME: boolean): string {
  const C = { x: 256, y: 270 };
  const TH0 = -66 * deg, SWEEP = 282 * deg, RR = 152;
  const W = (s: number) => 14 + 58 * Math.pow(1 - s, 0.85) * (s < 0.04 ? 0.88 + (s / 0.04) * 0.12 : 1);
  const at = (s: number) => { const th = TH0 - s * SWEEP; return { x: C.x + RR * Math.cos(th), y: C.y + RR * Math.sin(th) }; };
  const frame = (s: number) => {
    const a = at(Math.max(0, s - 0.002)), b = at(Math.min(1, s + 0.002));
    const l = Math.hypot(b.x - a.x, b.y - a.y), t = { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
    const p = at(s); let n = { x: t.y, y: -t.x };
    if ((p.x - C.x) * n.x + (p.y - C.y) * n.y < 0) n = { x: -n.x, y: -n.y };
    return { p, t, n };
  };
  const off = (s: number, k: number): Pt => { const { p, n } = frame(s); const w = W(s) / 2; return { x: p.x + n.x * w * k, y: p.y + n.y * w * k }; };
  const S = Array.from({ length: 61 }, (_, i) => i / 60);
  const edge = (k: number, a = 0, b = 1) => S.filter((s) => s >= a && s <= b).map((s) => off(s, k));
  const smooth = (pts: Pt[]) => {
    let d = `M${pt(pts[0])}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
      d += `C${pt({ x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 })} ${pt({ x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 })} ${pt(p2)}`;
    }
    return d;
  };
  const end = frame(1);
  const tb = (u: number, v: number): Pt => ({ x: end.p.x + end.t.x * u + end.n.x * v, y: end.p.y + end.t.y * u + end.n.y * v });
  const body = smooth(edge(1)) + `L${pt(tb(4, 0))}` + smooth(edge(-1).reverse()).replace(/^M/, "L") + "Z";
  const blade = `M${pt(tb(-10, 10))}C${pt(tb(2, 16))} ${pt(tb(6, 28))} ${pt(tb(0, 32))}L${pt(tb(22, 20))}C${pt(tb(34, 14))} ${pt(tb(46, 6))} ${pt(tb(62, 0))}C${pt(tb(46, -6))} ${pt(tb(34, -14))} ${pt(tb(22, -20))}L${pt(tb(0, -32))}C${pt(tb(6, -28))} ${pt(tb(2, -16))} ${pt(tb(-10, -10))}Z`;
  const belly = smooth(edge(-0.4, 0, 0.96)) + smooth(edge(-1, 0, 0.96).reverse()).replace(/^M/, "L") + "Z";
  let plates = "";
  for (let s = 0.1; s < 0.92; s += 0.05) plates += `M${pt(off(s, -0.42))}L${pt(off(s, -1))}`;
  let spines = "";
  for (let s = 0.17; s < 0.86; s += 0.085) {
    const { t, n } = frame(s), w = W(s), b = off(s, 0.85), L = 14 + w * 0.42;
    spines += `M${pt({ x: b.x - t.x * w * 0.22, y: b.y - t.y * w * 0.22 })}Q${pt({ x: b.x + n.x * L * 0.8, y: b.y + n.y * L * 0.8 })} ${pt({ x: b.x + n.x * L + t.x * L * 0.75, y: b.y + n.y * L + t.y * L * 0.75 })}L${pt({ x: b.x + t.x * w * 0.18, y: b.y + t.y * w * 0.18 })}Z`;
  }
  const sheen = smooth(edge(0.6, 0.015, 0.84)) + smooth(edge(0.3, 0.015, 0.84).reverse()).replace(/^M/, "L") + "Z";
  const neck = frame(0);
  const ang = Math.atan2(-neck.t.y, -neck.t.x) / deg + -6;
  const HS = 1.38;
  const MED = 110, ARS = 1.06;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs>
  <radialGradient id="${P}-bg" cx="42%" cy="30%" r="80%"><stop offset="0" stop-color="#1f5a3c"/><stop offset=".6" stop-color="#0c2618"/><stop offset="1" stop-color="#050f09"/></radialGradient>
  <linearGradient id="${P}-brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fdeec0"/><stop offset=".3" stop-color="#d2a458"/><stop offset=".55" stop-color="#7a5622"/><stop offset=".78" stop-color="#c39248"/><stop offset="1" stop-color="#4a3414"/></linearGradient>
  <linearGradient id="${P}-body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a9466"/><stop offset=".4" stop-color="#1f5a3b"/><stop offset="1" stop-color="#0c2618"/></linearGradient>
  <linearGradient id="${P}-belly" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e6cf8e"/><stop offset="1" stop-color="#8a6526"/></linearGradient>
  <linearGradient id="${P}-bone" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#8a6a34"/><stop offset=".5" stop-color="#dcc28a"/><stop offset="1" stop-color="#fff6dc"/></linearGradient>
  <linearGradient id="${P}-head" x1="0" y1="-1" x2="0.3" y2="1"><stop offset="0" stop-color="#43a072"/><stop offset=".5" stop-color="#1f5a3b"/><stop offset="1" stop-color="#0f3322"/></linearGradient>
  <linearGradient id="${P}-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4cc"/><stop offset=".4" stop-color="#f3d488"/><stop offset=".7" stop-color="#c8923e"/><stop offset="1" stop-color="#946624"/></linearGradient>
  <radialGradient id="${P}-face" cx="45%" cy="38%" r="70%"><stop offset="0" stop-color="#14402a"/><stop offset="1" stop-color="#04100a"/></radialGradient>
  <radialGradient id="${P}-eye" cx="40%" cy="50%" r="60%"><stop offset="0" stop-color="#fff6c0"/><stop offset=".5" stop-color="#ffb43c"/><stop offset="1" stop-color="#e0480c"/></radialGradient>
  <linearGradient id="${P}-flame" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff3c8"/><stop offset=".4" stop-color="#ffb347"/><stop offset="1" stop-color="#ff5a1a" stop-opacity=".2"/></linearGradient>
  <clipPath id="${P}-clip"><path d="${body}"/></clipPath>
</defs>
<rect x="10" y="10" width="492" height="492" rx="110" fill="url(#${P}-bg)"/>
<rect x="10" y="10" width="492" height="492" rx="110" fill="none" stroke="url(#${P}-brass)" stroke-width="20"/>
<rect x="26" y="26" width="460" height="460" rx="96" fill="none" stroke="#120a03" stroke-opacity=".6" stroke-width="3"/>
<circle cx="${C.x}" cy="${C.y}" r="${MED}" fill="url(#${P}-face)"/>
<circle cx="${C.x}" cy="${C.y}" r="${MED}" fill="none" stroke="url(#${P}-brass)" stroke-width="14"/>
<g transform="translate(${C.x} ${C.y}) scale(${ARS}) translate(-256 -262)">
  <path d="${AR}" fill="#010604" opacity=".75" transform="translate(0.6 2.6)"/>
  <path d="${AR}" fill="url(#${P}-gold)" stroke="#5a3a10" stroke-width="2"/>
</g>
<path d="${spines}" fill="url(#${P}-bone)" stroke="#1a1006" stroke-width="4" stroke-linejoin="round"/>
<path d="${body}" fill="url(#${P}-body)"/>
<g clip-path="url(#${P}-clip)">
  <path d="${belly}" fill="url(#${P}-belly)"/>
  <path d="${plates}" stroke="#5a3e14" stroke-width="4"/>
  <path d="${sheen}" fill="#c8ffe0" fill-opacity=".38"/>
</g>
<path d="${body}" fill="none" stroke="#04110a" stroke-width="6" stroke-linejoin="round"/>
<path d="${blade}" fill="url(#${P}-bone)" stroke="#1a1006" stroke-width="4" stroke-linejoin="round"/>
<g transform="translate(${f(neck.p.x)} ${f(neck.p.y)}) rotate(${f(ang)}) scale(${HS})">
  <path d="M8 -24 C-6 -42 -30 -54 -62 -58 C-36 -44 -16 -30 -4 -12 Z" fill="url(#${P}-bone)" stroke="#1a1006" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M-8 -16 C-26 -26 -50 -30 -78 -26 C-50 -18 -28 -8 -12 2 Z" fill="url(#${P}-bone)" stroke="#1a1006" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M-6 12 C20 22 50 26 80 25 L92 19 L84 14 C60 14 34 10 8 2 Z" fill="#c9a45e" stroke="#04110a" stroke-width="3" stroke-linejoin="round"/>
  <path d="M30 6 C50 11 66 13 86 14 L80 9 C62 8 48 5 34 2 Z" fill="#5a0e06"/>
  ${FLAME ? `<g class="logo-flame"><path d="M94 8 C120 -14 160 -18 196 -4 C176 0 168 6 190 14 C166 14 172 24 196 32 C158 40 118 30 94 14 Z" fill="url(#${P}-flame)"/><path d="M96 9 C118 0 140 0 160 6 C142 10 140 14 158 20 C136 22 116 18 96 13 Z" fill="#fff6d8" opacity=".85"/></g>` : ""}
  <path d="M-18 -8 C-16 -24 -2 -32 14 -33 C28 -34 36 -28 44 -23 L66 -17 C82 -14 96 -11 106 -6 C110 -3 110 2 106 4 L92 6 C74 7 56 5 36 2 C22 0 12 4 2 12 C-8 18 -16 8 -18 -8 Z" fill="url(#${P}-head)" stroke="#04110a" stroke-width="3" stroke-linejoin="round"/>
  <path d="M-10 -18 C2 -28 18 -32 32 -29 C46 -26 64 -19 84 -14 C96 -12 102 -9 106 -6" fill="none" stroke="#c8ffe0" stroke-opacity=".55" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M44 3 L48 17 L53 4 Z M66 5 L70 19 L74 5.5 Z M86 6 L89 13 L92 5.5 Z" fill="#fff8e0" stroke="#3a2a10" stroke-width="1"/>
  <path d="M6 -26 C24 -33 42 -27 54 -16 C40 -20 24 -20 8 -17 Z" fill="#06180e"/>
  <path class="logo-eye" d="M14 -14 C24 -22 38 -21 48 -12 C38 -7 24 -7 14 -14 Z" fill="url(#${P}-eye)"/>
  <path d="M31 -19.5 C29 -15.5 29 -11.5 31 -8.5 C33 -11.5 33 -15.5 31 -19.5 Z" fill="#160600"/>
  <path d="M97 -6 C100 -7.5 104 -6 105 -3.5 C101 -3.5 99 -3.5 97 -6 Z" fill="#020604"/>
</g>
</svg>`;
}
