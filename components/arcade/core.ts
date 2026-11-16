// shared stuff for the browser versions of my Unreal games: the input every game reads

export const W = 960;
export const H = 540;

export type Input = {
  ax: number;
  ay: number;
  aimX: number;
  aimY: number;
  aimed: boolean;
  fire: boolean;
  firePressed: boolean;
  alt: boolean;
  altPressed: boolean;
  touch: boolean;
  bx: number;
  by: number;
  drag?: number;
  assist?: boolean;
};

export const idle = (): Input => ({ ax: 0, ay: 0, aimX: 0, aimY: 0, aimed: false, fire: false, firePressed: false, alt: false, altPressed: false, touch: false, bx: 0, by: 0 });

export type State = "play" | "won" | "lost";

export interface Game {
  state: State;
  upFires?: boolean;
  level: number;
  reset(): void;
  step(dt: number, inp: Input): void;
  draw(c: CanvasRenderingContext2D, t: number): void;
  hud(): { label: string; value: string }[];
  result(): string;
  score(): number;
  goals(): [string, string, string];
  stars(): [boolean, boolean, boolean];
}

export type Rect = { x: number; y: number; w: number; h: number };
export type V = { x: number; y: number };

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
export const dist = (a: V, b: V) => Math.hypot(a.x - b.x, a.y - b.y);
export const rnd = (a: number, b: number) => a + Math.random() * (b - a);

// turn from toward to by at most rate radians
export const turnTo = (from: number, to: number, rate: number) => {
  const d = wrap(to - from);
  return Math.abs(d) <= rate ? to : from + Math.sign(d) * rate;
};

export const inRect = (x: number, y: number, r: Rect, m = 0) => x > r.x - m && x < r.x + r.w + m && y > r.y - m && y < r.y + r.h + m;
export const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// where a segment first enters a rectangle (0..1 along it), or -1
export const segRect = (x0: number, y0: number, x1: number, y1: number, r: Rect) => {
  let t0 = 0, t1 = 1;
  const dx = x1 - x0, dy = y1 - y0;
  const p = [-dx, dx, -dy, dy], q = [x0 - r.x, r.x + r.w - x0, y0 - r.y, r.y + r.h - y0];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return -1; continue; }
    const t = q[i] / p[i];
    if (p[i] < 0) { if (t > t1) return -1; if (t > t0) t0 = t; }
    else { if (t < t0) return -1; if (t < t1) t1 = t; }
  }
  return t0;
};
// closest hit along a segment against a list of rectangles
export const trace = (x0: number, y0: number, x1: number, y1: number, rs: Rect[]) => {
  let best = 1;
  for (const r of rs) { const t = segRect(x0, y0, x1, y1, r); if (t >= 0 && t < best) best = t; }
  return best;
};
// where a ray from (x0, y0) to (x1, y1) first hits a circle (0..1), or -1
export const segCircle = (x0: number, y0: number, x1: number, y1: number, cx: number, cy: number, r: number) => {
  const dx = x1 - x0, dy = y1 - y0, fx = x0 - cx, fy = y0 - cy;
  const a = dx * dx + dy * dy, b = 2 * (fx * dx + fy * dy), c = fx * fx + fy * fy - r * r;
  const disc = b * b - 4 * a * c;
  if (disc < 0 || a === 0) return -1;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : c < 0 ? 0 : -1;
};

// push a circle out of a rectangle
export const circleOut = (p: V, r: number, b: Rect): V | null => {
  const cx = clamp(p.x, b.x, b.x + b.w), cy = clamp(p.y, b.y, b.y + b.h);
  let dx = p.x - cx, dy = p.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  if (d2 === 0) {
    // centre is inside, push out the nearest side
    const l = p.x - b.x, rr = b.x + b.w - p.x, t = p.y - b.y, bb = b.y + b.h - p.y, m = Math.min(l, rr, t, bb);
    if (m === l) { p.x = b.x - r; return { x: -1, y: 0 }; }
    if (m === rr) { p.x = b.x + b.w + r; return { x: 1, y: 0 }; }
    if (m === t) { p.y = b.y - r; return { x: 0, y: -1 }; }
    p.y = b.y + b.h + r; return { x: 0, y: 1 };
  }
  const d = Math.sqrt(d2);
  dx /= d; dy /= d;
  p.x = cx + dx * r; p.y = cy + dy * r;
  return { x: dx, y: dy };
};

// particles sparks are additive, chunks are debris that tumble, rings are shockwaves, texts float up, decals
export type Part = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; col: string; g: number; kind: "spark" | "chunk" | "smoke"; rot: number; vr: number };
type Ring = { x: number; y: number; r: number; max: number; life: number; dur: number; col: string; w: number };
type Txt = { x: number; y: number; s: string; col: string; life: number; size: number };
type Decal = { x: number; y: number; r: number; col: string; life: number; max: number; rot: number; shape: "blot" | "bar" };
export class Fx {
  parts: Part[] = [];
  rings: Ring[] = [];
  texts: Txt[] = [];
  decals: Decal[] = [];
  shake = 0;
  flash = 0;
  burst(x: number, y: number, col: string, n = 18, speed = 220, g = 0, r = 3) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random() * 0.7), life = 0.35 + Math.random() * 0.45;
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, r: r * (0.6 + Math.random() * 0.8), col, g, kind: "spark", rot: 0, vr: 0 });
    }
  }
  // spray in one direction, like sparks off a wall
  spray(x: number, y: number, ang: number, spread: number, col: string, n = 8, speed = 260, r = 2) {
    for (let k = 0; k < n; k++) {
      const a = ang + (Math.random() - 0.5) * spread, v = speed * (0.4 + Math.random() * 0.6), life = 0.18 + Math.random() * 0.25;
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, r: r * (0.6 + Math.random() * 0.8), col, g: 0, kind: "spark", rot: 0, vr: 0 });
    }
  }
  chunks(x: number, y: number, col: string, n = 10, speed = 240, g = 900, size = 6) {
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.6, v = speed * (0.4 + Math.random() * 0.8), life = 0.7 + Math.random() * 0.7;
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, r: size * (0.5 + Math.random() * 0.9), col, g, kind: "chunk", rot: Math.random() * 6, vr: (Math.random() - 0.5) * 18 });
    }
  }
  smoke(x: number, y: number, n = 8, col = "rgba(120,130,125,1)", size = 14, rise = -40) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, v = 30 + Math.random() * 60, life = 0.8 + Math.random() * 0.9;
      this.parts.push({ x: x + (Math.random() - 0.5) * 16, y: y + (Math.random() - 0.5) * 16, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5, life, max: life, r: size * (0.6 + Math.random() * 0.8), col, g: rise, kind: "smoke", rot: 0, vr: 0 });
    }
  }
  ring(x: number, y: number, max: number, col = "rgba(255,210,150,1)", dur = 0.45, w = 6) {
    this.rings.push({ x, y, r: 4, max, life: dur, dur, col, w });
  }
  text(x: number, y: number, s: string, col = "#f0d79a", size = 16) {
    this.texts.push({ x, y, s, col, life: 1.1, size });
  }
  decal(x: number, y: number, r: number, col: string, life = 12, shape: Decal["shape"] = "blot", rot = Math.random() * Math.PI) {
    this.decals.push({ x, y, r, col, life, max: life, rot, shape });
    if (this.decals.length > 260) this.decals.shift();
  }
  step(dt: number) {
    this.shake = Math.max(0, this.shake - dt * 3);
    this.flash = Math.max(0, this.flash - dt * 4);
    for (let k = this.parts.length - 1; k >= 0; k--) {
      const p = this.parts[k];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.rot += p.vr * dt;
      const drag = p.kind === "chunk" ? 0.6 : p.kind === "smoke" ? 1.6 : 2;
      p.vx *= 1 - drag * dt; p.vy *= 1 - (p.g && p.kind !== "smoke" ? 0.5 : drag) * dt;
      p.life -= dt;
      if (p.life <= 0) this.parts.splice(k, 1);
    }
    if (this.parts.length > 900) this.parts.splice(0, this.parts.length - 900);
    for (let k = this.rings.length - 1; k >= 0; k--) { const r = this.rings[k]; r.life -= dt; r.r = r.max * (1 - (r.life / r.dur) ** 2); if (r.life <= 0) this.rings.splice(k, 1); }
    for (let k = this.texts.length - 1; k >= 0; k--) { const t = this.texts[k]; t.life -= dt; t.y -= 38 * dt; if (t.life <= 0) this.texts.splice(k, 1); }
    for (let k = this.decals.length - 1; k >= 0; k--) { const d = this.decals[k]; d.life -= dt; if (d.life <= 0) this.decals.splice(k, 1); }
  }
  // floor marks, drawn before anything standing on the floor
  drawUnder(c: CanvasRenderingContext2D) {
    c.save();
    for (const d of this.decals) {
      c.globalAlpha = Math.min(1, (d.life / d.max) * 2.5);
      c.fillStyle = d.col;
      if (d.shape === "bar") { c.save(); c.translate(d.x, d.y); c.rotate(d.rot); c.fillRect(-d.r, -1.5, d.r * 2, 3); c.restore(); }
      else {
        const g = c.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
        g.addColorStop(0, d.col); g.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = g; c.beginPath(); c.arc(d.x, d.y, d.r, 0, Math.PI * 2); c.fill();
      }
    }
    c.restore();
  }
  draw(c: CanvasRenderingContext2D) {
    c.save();
    for (const p of this.parts) {
      if (p.kind === "spark") continue;
      const a = Math.max(0, p.life / p.max);
      if (p.kind === "smoke") {
        c.globalAlpha = a * 0.35; c.fillStyle = p.col;
        c.beginPath(); c.arc(p.x, p.y, p.r * (1.6 - a * 0.6), 0, Math.PI * 2); c.fill();
      } else {
        c.globalAlpha = Math.min(1, a * 2); c.fillStyle = p.col;
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.7); c.restore();
      }
    }
    c.globalCompositeOperation = "lighter";
    for (const p of this.parts) {
      if (p.kind !== "spark") continue;
      c.globalAlpha = Math.max(0, p.life / p.max);
      c.fillStyle = p.col;
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fill();
    }
    for (const r of this.rings) {
      c.globalAlpha = Math.max(0, r.life / r.dur) * 0.8;
      c.strokeStyle = r.col; c.lineWidth = r.w * (r.life / r.dur) + 1;
      c.beginPath(); c.arc(r.x, r.y, r.r, 0, Math.PI * 2); c.stroke();
    }
    c.restore();
    for (const t of this.texts) {
      c.globalAlpha = Math.min(1, t.life * 2);
      label(c, t.s, t.x, t.y, t.size, t.col, "center", 800);
    }
    c.globalAlpha = 1;
  }
  // drawn last: the white flash from a big explosion
  drawFlash(c: CanvasRenderingContext2D) {
    if (this.flash <= 0) return;
    c.fillStyle = `rgba(255,236,200,${this.flash * 0.35})`;
    c.fillRect(0, 0, W, H);
  }
  offset(): V {
    const s = this.shake * this.shake * 10;
    return { x: (Math.random() - 0.5) * s, y: (Math.random() - 0.5) * s };
  }
}

// navigation Grid version of Unreal's nav mesh: cells a pawn of radius r fits in, plus a BFS from the goal
export class Nav {
  cols: number; rows: number; open: Uint8Array;
  constructor(public walls: Rect[], public r: number, public cell = 20) {
    this.cols = Math.ceil(W / cell); this.rows = Math.ceil(H / cell);
    this.open = new Uint8Array(this.cols * this.rows);
    for (let j = 0; j < this.rows; j++) for (let i = 0; i < this.cols; i++) {
      const x = (i + 0.5) * cell, y = (j + 0.5) * cell;
      this.open[j * this.cols + i] = walls.some((w) => inRect(x, y, w, r + 2)) ? 0 : 1;
    }
  }
  idx(x: number, y: number) { return clamp(Math.floor(y / this.cell), 0, this.rows - 1) * this.cols + clamp(Math.floor(x / this.cell), 0, this.cols - 1); }
  // closest open cell to a point, so a goal right next to a wall still gets a path
  near(x: number, y: number) {
    const s = this.idx(x, y);
    if (this.open[s]) return s;
    let best = -1, bd = Infinity;
    for (let k = 0; k < this.open.length; k++) if (this.open[k]) { const cx = ((k % this.cols) + 0.5) * this.cell, cy = (Math.floor(k / this.cols) + 0.5) * this.cell, d = (cx - x) ** 2 + (cy - y) ** 2; if (d < bd) { bd = d; best = k; } }
    return best;
  }
  path(from: V, to: V): V[] {
    const s = this.near(from.x, from.y), g = this.near(to.x, to.y);
    if (s < 0 || g < 0) return [to];
    const prev = new Int32Array(this.open.length).fill(-1);
    const q = [g]; prev[g] = g;
    for (let h = 0; h < q.length && prev[s] < 0; h++) {
      const k = q[h], i = k % this.cols, j = (k - i) / this.cols;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= this.cols || nj >= this.rows) continue;
        const n = nj * this.cols + ni;
        if (!this.open[n] || prev[n] >= 0) continue;
        if (di && dj && (!this.open[j * this.cols + ni] || !this.open[nj * this.cols + i])) continue;
        prev[n] = k; q.push(n);
      }
    }
    if (prev[s] < 0) return [to];
    const out: V[] = [];
    for (let k = prev[s]; k !== g; k = prev[k]) out.push({ x: ((k % this.cols) + 0.5) * this.cell, y: (Math.floor(k / this.cols) + 0.5) * this.cell });
    out.push(to);
    return out;
  }
  // farthest waypoint you can reach in a straight line from p
  steer(p: V, path: V[], solids: Rect[]): V {
    let pick = path[0];
    for (let k = 0; k < Math.min(path.length, 12); k++) {
      const w = path[k];
      if (clearLine(p, w, solids, this.r)) pick = w; else break;
    }
    return pick;
  }
}
// true if a circle of radius r can slide from a to b without hitting a wall
export const clearLine = (a: V, b: V, solids: Rect[], r: number) => {
  for (const w of solids) if (segRect(a.x, a.y, b.x, b.y, { x: w.x - r, y: w.y - r, w: w.w + r * 2, h: w.h + r * 2 }) >= 0) return false;
  return true;
};

// colours and drawing
export const C = {
  bg: "#07110c", bg2: "#0b1912", floor: "#0e2017", line: "#1e3b2c", wall: "#22392d", wallTop: "#2f4d3d",
  text: "#e6efe8", muted: "#8da597", moss: "#6fcf97", brass: "#d8b46a", danger: "#f08c7a", fire: "#ffb04a", ice: "#9fd9f2",
};

export const box = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
};

export const label = (c: CanvasRenderingContext2D, text: string, x: number, y: number, size = 14, col = C.text, align: CanvasTextAlign = "center", weight = 600) => {
  c.font = `${weight} ${size}px "Schibsted Grotesk Variable", system-ui, sans-serif`;
  c.textAlign = align;
  c.textBaseline = "middle";
  c.fillStyle = col;
  c.fillText(text, x, y);
};

// health bar above something
export const bar = (c: CanvasRenderingContext2D, x: number, y: number, w: number, frac: number, col: string) => {
  c.fillStyle = "rgba(0,0,0,0.55)";
  box(c, x - w / 2, y, w, 5, 3); c.fill();
  c.fillStyle = col;
  box(c, x - w / 2, y, Math.max(0, w * frac), 5, 3); c.fill();
};

export const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}.${Math.floor((s % 1) * 10)}`;

// dark vignette around the edges
export const vignette = (c: CanvasRenderingContext2D, strength = 0.55) => {
  const g = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${strength})`);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
};

// static background painted once into its own canvas and copied every frame
export const painted = (paint: (c: CanvasRenderingContext2D) => void): HTMLCanvasElement | null => {
  if (typeof document === "undefined") return null;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  paint(cv.getContext("2d")!);
  return cv;
};

// seeded random so textures look the same every visit
export const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

// big centred banner for countdowns and level names
export const banner = (c: CanvasRenderingContext2D, title: string, sub: string, life: number, col = C.brass) => {
  if (life <= 0) return;
  const a = Math.min(1, life * 2.5);
  c.save();
  c.globalAlpha = a * 0.75; c.fillStyle = "#020604"; c.fillRect(0, H / 2 - 58, W, 116);
  c.globalAlpha = a;
  c.fillStyle = col; c.fillRect(0, H / 2 - 58, W, 2); c.fillRect(0, H / 2 + 56, W, 2);
  label(c, title, W / 2, H / 2 - 12, 40, col, "center", 800);
  if (sub) label(c, sub, W / 2, H / 2 + 28, 16, C.text, "center", 600);
  c.restore();
};

// lock on marker for touch: four brass corners closing in on the target
export function lockOn(c: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  const k = r + 6 + Math.sin(t * 6) * 2.5, L = 9;
  c.save();
  c.translate(x, y);
  c.strokeStyle = "rgba(240,215,154,0.9)"; c.lineWidth = 2.5; c.lineCap = "round";
  for (let q = 0; q < 4; q++) {
    c.rotate(Math.PI / 2);
    c.beginPath(); c.moveTo(-k, -k + L); c.lineTo(-k, -k); c.lineTo(-k + L, -k); c.stroke();
  }
  c.restore();
}
