"use client";
// one dragon: body, flying, fire breathing and drawing
import type { P, Spark, Wall } from "./types";
import type { Pal } from "./palette";
import { makeParts } from "./parts";
import { drawHead } from "./head";
import { drawBody } from "./body";

export const N = 96;
export const wrap = (a: number) => {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
};
export type Env = { readonly s: number; readonly dpr: number; readonly t: number };
export type Box = { x0: number; y0: number; x1: number; y1: number };

// points around the face in the head's frame (+x toward the snout)
const FACE: [number, number][] = [
  [58, 0], [53, 6], [53, -6], [42, 10], [42, -10], [26, 13.5], [26, -13.5], [10, 18], [10, -18],
  [-4, 20], [-4, -20], [-16, 13], [-16, -13], [-21, 0],
];

const FACE_TURN = 0.09;
const FACE_BACK = 3;

export const inRect = (x: number, y: number, wl: Wall, m = 0) => x > wl.x - m && x < wl.x + wl.w + m && y > wl.y - m && y < wl.y + wl.h + m;

export class Creature {
  seg: P[] = [];
  prevSeg: P[] = [];
  trail: P[] = [];
  heading = 0;
  speed = 0;
  turnBoost = 0;
  gait = 0;
  mouth = 0;
  aimOpen = 0;
  breath = 0;
  breathLen = 0.75;
  breathId = 0;
  fireAt: P | null = null;
  fireUntil = 0;
  holdFire: P | null = null;
  look: P = { x: 0, y: 0 };
  blinkAt = 2 + Math.random() * 3;
  blinkLen = 0.16;
  blocked = false;
  alpha = 1;
  spin = 0;
  looping = false;
  stuck = 0;
  flinchBid = -1;
  flinchAt = -9;
  face = 0;
  course = 0;
  omega = 0;
  private wave = Math.random() * 6;
  private waveAmp = 0;
  private revSide = 1;
  private revUntil = 0;
  neck = 0;
  glance: P | null = null;
  aimFn: (() => P | null) | null = null;
  prey: unknown = null;
  firePower = 1;
  dbg = { diff: 0, self: 0, wall: 0, neckLim: 0, by: 0 };
  private prevFace = 0;
  private faceNow: number | null = null;
  private still = 0;
  private slideFor = 0;
  private steps = 0;
  private detour = 1;
  private detourUntil = 0;
  private parts: ReturnType<typeof makeParts>;
  private drawBuf: P[] = Array.from({ length: N }, () => ({ x: 0, y: 0 }));

  constructor(private ctx: CanvasRenderingContext2D, public pal: Pal, private env: Env, public id: number, private altPhase = 0) {
    this.parts = makeParts(ctx);
  }

  get s() { return this.env.s; }
  get time() { return this.env.t; }
  HS = () => 1.36 * this.env.s;
  head() { return this.seg[0]; }

  // laid out in a gentle wave behind the head, facing ang
  place(x: number, y: number, ang: number) {
    const s = this.s, back = ang + Math.PI;
    this.seg = Array.from({ length: N }, (_, i) => ({
      x: x + Math.cos(back) * i * 7 * s - Math.sin(back) * Math.sin(i * 0.18) * 30 * s,
      y: y + Math.sin(back) * i * 7 * s + Math.cos(back) * Math.sin(i * 0.18) * 30 * s,
    }));
    this.prevSeg = this.seg.map((p) => ({ ...p }));
    this.trail = this.seg.map((p) => ({ ...p }));
    this.heading = Math.atan2(this.seg[0].y - this.seg[1].y, this.seg[0].x - this.seg[1].x);
    this.face = this.prevFace = this.course = this.heading;
    this.speed = 0;
    this.omega = 0;
    this.neck = 0;
  }

  // crossing a size breakpoint: rescale the body around the head so it keeps its shape instead of folding
  rescale(k: number) {
    const hx = this.seg[0].x, hy = this.seg[0].y;
    for (const arr of [this.seg, this.prevSeg, this.trail]) for (const p of arr) { p.x = hx + (p.x - hx) * k; p.y = hy + (p.y - hy) * k; }
  }

  shift(dx: number, dy: number) {
    for (const arr of [this.seg, this.prevSeg, this.trail]) for (const p of arr) { p.x += dx; p.y += dy; }
    for (const p of [this.fireAt, this.holdFire]) if (p) { p.x += dx; p.y += dy; }
  }

  // body radius along its length
  private radii = new Float32Array(N);
  private radT = NaN;
  private radS = NaN;
  rad = (i: number) => {
    const t = this.env.t, s = this.s;
    if (t !== this.radT || s !== this.radS) {
      this.radT = t; this.radS = s;
      for (let j = 0; j < N; j++) {
        const u = j / (N - 1);
        const v = u < 0.07 ? 0.62 + (u / 0.07) * 0.38 : Math.pow(1 - (u - 0.07) / 0.93, 0.8);
        const lung = 1 + 0.035 * Math.sin(t * 1.5 + this.altPhase - u * 2.2) * (u < 0.6 ? 1 : 0.4);
        this.radii[j] = Math.max(1.3 * s, 18 * s * v * lung);
      }
    }
    return this.radii[i];
  };
  dirAt = (i: number) => {
    if (i === 0) return this.faceNow ?? this.face;
    const a = this.seg[Math.max(0, i - 1)], b = this.seg[Math.min(N - 1, i + 1)];
    return Math.atan2(a.y - b.y, a.x - b.x);
  };
  headPt = (x: number, y: number) => {
    const hp = this.seg[0], d = this.dirAt(0), k = this.HS();
    return { x: hp.x + Math.cos(d) * x * k - Math.sin(d) * y * k, y: hp.y + Math.sin(d) * x * k + Math.cos(d) * y * k };
  };

  // would the face at (x, y) facing a touch any wall (grown by margin m)?
  faceHits(x: number, y: number, a: number, walls: Wall[], m: number) {
    const k = this.HS(), c = Math.cos(a), sn = Math.sin(a);
    for (const wl of walls) {
      // quick reject, the face fits in a circle of about 60
      if (x < wl.x - m - 62 * k || x > wl.x + wl.w + m + 62 * k || y < wl.y - m - 62 * k || y > wl.y + wl.h + m + 62 * k) continue;
      for (const [u, v] of FACE) if (inRect(x + c * u * k - sn * v * k, y + sn * u * k + c * v * k, wl, m)) return true;
    }
    return false;
  }

  // how far the face reaches into the walls (grown by m)
  faceDepth(x: number, y: number, a: number, walls: Wall[], m: number) {
    const k = this.HS(), c = Math.cos(a), sn = Math.sin(a);
    let deep = 0;
    for (const wl of walls) {
      if (x < wl.x - m - 62 * k || x > wl.x + wl.w + m + 62 * k || y < wl.y - m - 62 * k || y > wl.y + wl.h + m + 62 * k) continue;
      for (const [u, v] of FACE) {
        const px = x + c * u * k - sn * v * k, py = y + sn * u * k + c * v * k;
        if (!inRect(px, py, wl, m)) continue;
        const d = Math.min(px - (wl.x - m), wl.x + wl.w + m - px, py - (wl.y - m), wl.y + wl.h + m - py);
        if (d > deep) deep = d;
      }
    }
    return deep;
  }

  // smallest gap between this face and the other dragons' bodies
  faceGap(x: number, y: number, a: number, others: Creature[]) {
    const k = this.HS(), c = Math.cos(a), sn = Math.sin(a);
    let best = Infinity;
    for (const o of others) {
      if (o.alpha < 0.5) continue;
      // quick reject, nowhere near the other body
      let near = false;
      for (let i = 0; i < N; i += 8) if (Math.abs(o.seg[i].x - x) < 140 * k && Math.abs(o.seg[i].y - y) < 140 * k) { near = true; break; }
      if (!near) continue;
      for (const [u, v] of FACE) {
        const g = o.bodyGap({ x: x + c * u * k - sn * v * k, y: y + sn * u * k + c * v * k }, 0, true).gap;
        if (g < best) best = g;
      }
    }
    return best;
  }

  pad = 0;
  bodyGap(p: P, from = 0, solid = false) {
    let best = Infinity, at = -1, qx = 0, qy = 0;
    const thick = solid ? this.rad(7) : 0;
    for (let i = from; i < N; i += 2) {
      const q = this.seg[i], d = Math.hypot(q.x - p.x, q.y - p.y) - (solid && i > 7 ? thick : this.rad(i));
      if (d < best) { best = d; at = i; qx = q.x; qy = q.y; }
    }
    if (from === 0 && this.seg.length) {
      const h = this.seg[0], a = this.dirAt(0), k = this.HS(), c = Math.cos(a), sn = Math.sin(a);
      const ax = h.x - c * 4 * k, ay = h.y - sn * 4 * k, L = 46 * k;
      const u = Math.max(0, Math.min(L, (p.x - ax) * c + (p.y - ay) * sn));
      const cx = ax + c * u, cy = ay + sn * u, r = (15 - 8 * (u / L)) * k;
      const d = Math.hypot(p.x - cx, p.y - cy) - r;
      if (d < best) { best = d; at = 0; qx = cx; qy = cy; }
    }
    return { gap: solid ? best - this.pad : best, i: at, x: qx, y: qy };
  }

  begin() {
    for (let i = 0; i < N; i++) { this.prevSeg[i].x = this.seg[i].x; this.prevSeg[i].y = this.seg[i].y; }
    this.prevFace = this.face;
  }

  breatheAt(p: P, t: number, dur = 4, aimFn: (() => P | null) | null = null) {
    this.fireAt = { x: p.x, y: p.y };
    this.fireUntil = t + dur;
    this.turnBoost = Math.max(this.turnBoost, 0.6);
    this.aimFn = aimFn;
    this.prey = null;
  }
  // how far the fire reaches from the centre of the head
  range() { return 260 * this.s * this.firePower; }

  // head points between the path and the overall course (so the wave sways the body more than the head
  private faceWant(raw: number) { return raw + wrap(this.course - raw) * 0.6 + this.neck; }

  // head angle if it moves to (x, y), measured from one section back along the path (same rule follow() uses)
  dirAfter(x: number, y: number) {
    const want = this.faceWant(this.rawAfter(x, y));
    return this.face + Math.max(-FACE_TURN, Math.min(FACE_TURN, wrap(want - this.face)));
  }
  private rawAfter(x: number, y: number) {
    const tr = this.trail, gap = 7 * this.s * FACE_BACK;
    let ax = x, ay = y, walked = 0;
    const start = Math.hypot(x - tr[0].x, y - tr[0].y) > 0.75 ? 0 : 1;
    for (let i = start; i < tr.length; i++) {
      const bx = tr[i].x, by = tr[i].y, L = Math.hypot(bx - ax, by - ay);
      if (walked + L >= gap) {
        const u = L > 0 ? (gap - walked) / L : 0;
        return Math.atan2(y - (ay + (by - ay) * u), x - (ax + (bx - ax) * u));
      }
      walked += L;
      ax = bx; ay = by;
    }
    return Math.atan2(y - ay, x - ax);
  }

  // where the face is blocked: direction away from the nearest wall or the other dragon's body
  normal(walls: Wall[], others: Creature[]) {
    const hd = this.seg[0];
    let best = Infinity, nx = 0, ny = 0;
    for (const wl of walls) {
      const qx = Math.max(wl.x, Math.min(hd.x, wl.x + wl.w)), qy = Math.max(wl.y, Math.min(hd.y, wl.y + wl.h));
      let dx = hd.x - qx, dy = hd.y - qy, d = Math.hypot(dx, dy);
      if (d < 1e-3) { dx = hd.x - (wl.x + wl.w / 2); dy = hd.y - (wl.y + wl.h / 2); d = Math.hypot(dx, dy) || 1; }
      if (d < best) { best = d; nx = dx / d; ny = dy / d; }
    }
    for (const o of others) {
      if (o.alpha < 0.5) continue;
      const g = o.bodyGap(hd, 0, true), dx = hd.x - g.x, dy = hd.y - g.y, d = Math.hypot(dx, dy) || 1;
      if (g.gap < best) { best = g.gap; nx = dx / d; ny = dy / d; }
    }
    return { x: nx, y: ny };
  }

  // away from the other dragon, measured where the face is closest to it (head to head that's the snout)
  contactNormal(others: Creature[]) {
    const hd = this.seg[0], a = this.dirAt(0), k = this.HS(), c = Math.cos(a), sn = Math.sin(a);
    let best = Infinity, nx = 0, ny = 0;
    for (const o of others) {
      if (o.alpha < 0.5) continue;
      for (const [u, v] of FACE) {
        const px = hd.x + c * u * k - sn * v * k, py = hd.y + sn * u * k + c * v * k;
        const g = o.bodyGap({ x: px, y: py }, 0, true);
        if (g.gap < best) { best = g.gap; const dx = px - g.x, dy = py - g.y, L = Math.hypot(dx, dy) || 1; nx = dx / L; ny = dy / L; }
      }
    }
    return { x: nx, y: ny };
  }

  // most open direction to escape to
  escape(walls: Wall[], home: P): P {
    const s = this.s, hd = this.seg[0];
    let best = -Infinity, at = { x: home.x, y: home.y };
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      let clear = 0;
      for (const L of [60, 120, 180, 240]) {
        if (this.faceHits(hd.x + Math.cos(a) * L * s, hd.y + Math.sin(a) * L * s, a, walls, 8 * s)) break;
        clear++;
      }
      const toward = Math.cos(a - Math.atan2(home.y - hd.y, home.x - hd.x));
      const ahead = Math.cos(a - this.course);
      const score = clear * 2 + toward * 1.2 + ahead * 1.6;
      if (score > best) { best = score; at = { x: hd.x + Math.cos(a) * 260 * s, y: hd.y + Math.sin(a) * 260 * s }; }
    }
    return at;
  }

  // scripted flight for the duel: the head is placed at (x, y) and the body follows like normal
  track(x: number, y: number, dir?: number) {
    const hd = this.seg[0], dx = x - hd.x, dy = y - hd.y, L = Math.hypot(dx, dy);
    if (dir !== undefined) this.course = this.heading = dir;
    else if (L > 0.3 * this.s) this.course = this.heading = Math.atan2(dy, dx);
    this.speed = L;
    this.omega = 0;
    this.still = 0;
    this.blocked = false;
    hd.x = x; hd.y = y;
    this.follow();
    const raw = Math.atan2(this.seg[0].y - this.seg[FACE_BACK].y, this.seg[0].x - this.seg[FACE_BACK].x);
    const aimP = this.holdFire ?? this.fireAt ?? this.glance;
    let nb = 0;
    if (aimP) {
      const base = raw + wrap(this.course - raw) * 0.6, off = wrap(Math.atan2(aimP.y - hd.y, aimP.x - hd.x) - base);
      nb = Math.abs(off) > 1.9 ? 0 : Math.max(-0.62, Math.min(0.62, off));
    }
    this.neck += Math.max(-0.04, Math.min(0.04, (nb - this.neck) * 0.25));
    this.face += Math.max(-FACE_TURN, Math.min(FACE_TURN, wrap(this.faceWant(raw) - this.face)));
    this.gait += (0.35 + L / (4.6 * this.s)) * (8 / 60);
  }

  // rear back: the head slides back along its path with the body, like a snake pulling back before it strikes
  retreat(v: number, dir?: number) {
    const tr = this.trail;
    let left = v, i = 0, hx = tr[0].x, hy = tr[0].y;
    while (i < tr.length - 1) {
      const a = tr[i], b = tr[i + 1], L = Math.hypot(b.x - a.x, b.y - a.y);
      if (L >= left) {
        const u = L > 0 ? left / L : 0;
        hx = a.x + (b.x - a.x) * u; hy = a.y + (b.y - a.y) * u;
        break;
      }
      left -= L;
      i++;
      hx = tr[i].x; hy = tr[i].y;
    }
    // extend the tail end of the path by the same amount so the body keeps its length
    const n = tr.length, z = tr[n - 1], y0 = tr[Math.max(0, n - 2)];
    const ang = Math.atan2(z.y - y0.y, z.x - y0.x);
    tr.push({ x: z.x + Math.cos(ang) * v, y: z.y + Math.sin(ang) * v });
    tr.splice(0, i + 1, { x: hx, y: hy });
    this.seg[0].x = hx; this.seg[0].y = hy;
    this.follow();
    const raw = Math.atan2(this.seg[0].y - this.seg[FACE_BACK].y, this.seg[0].x - this.seg[FACE_BACK].x);
    this.course = this.heading = dir ?? raw;
    this.omega = 0;
    this.speed = 0;
    this.still = 0;
    this.blocked = false;
    this.neck += Math.max(-0.04, Math.min(0.04, (0 - this.neck) * 0.1));
    this.face += Math.max(-FACE_TURN, Math.min(FACE_TURN, wrap(this.faceWant(raw) - this.face)));
    this.gait += 0.2 * (8 / 60);
  }

  // sway the head sideways by (dx, dy)
  sway(dx: number, dy: number, reach: number) {
    const tr = this.trail, w: number[] = [0];
    for (let i = 1; i < tr.length; i++) w.push(w[i - 1] + Math.hypot(tr[i].x - tr[i - 1].x, tr[i].y - tr[i - 1].y));
    for (let i = 0; i < tr.length; i++) {
      const f = 1 - w[i] / reach;
      if (f <= 0) break;
      const e = f * f * (3 - 2 * f);
      tr[i].x += dx * e; tr[i].y += dy * e;
    }
    this.seg[0].x = tr[0].x; this.seg[0].y = tr[0].y;
    this.follow();
    const raw = Math.atan2(this.seg[0].y - this.seg[FACE_BACK].y, this.seg[0].x - this.seg[FACE_BACK].x);
    this.face += Math.max(-FACE_TURN, Math.min(FACE_TURN, wrap(this.faceWant(raw) - this.face)));
    this.still = 0;
  }

  // fly toward tg
  move(tg: P, o: { top: number; base: number; walls: Wall[]; others?: Creature[]; steer?: number; slow?: number; hold?: boolean; area?: Box; edge?: boolean }) {
    const s = this.s, hd = this.seg[0];
    this.steps++;
    const dx = tg.x - hd.x, dy = tg.y - hd.y;
    const dist = Math.hypot(dx, dy);
    let want = Math.atan2(dy, dx) + (o.steer ?? 0);
    const others = o.others ?? [];
    // look ahead and start turning around a wall early
    let wallAhead = false;
    if (o.walls.length) {
      const probe = (a: number, L: number) => this.faceHits(hd.x + Math.cos(a) * L, hd.y + Math.sin(a) * L, a, o.walls, 10 * s);
      const outside = (a: number, L: number) => {
        const b = o.area;
        if (!b) return false;
        const x = hd.x + Math.cos(a) * L, y = hd.y + Math.sin(a) * L, m = 30 * s;
        return x < b.x0 + m || x > b.x1 - m || y < b.y0 + m || y > b.y1 - m;
      };
      if (probe(this.course, 70 * s) || probe(this.course, 140 * s)) {
        wallAhead = true;
        if (this.steps > this.detourUntil) this.detour = Math.sign(wrap(want - this.course)) || 1;
        this.detourUntil = this.steps + 30;
        let found = false;
        for (const d of [0.5, 0.9, 1.3, 1.7, 2.2]) {
          for (const sg of [this.detour, -this.detour]) {
            const a = this.course + sg * d;
            if (!probe(a, 80 * s) && !probe(a, 40 * s) && !outside(a, 160 * s)) {
              want = a;
              found = true;
              // any turning next goes this way too, toward the open side
              this.revSide = sg;
              this.revUntil = this.steps + 45;
              break;
            }
          }
          if (found) break;
        }
        this.turnBoost = Math.max(this.turnBoost, 0.7);
      }
    }
    // its own body: never steer back across it (it was chasing its own tail)
    this.dbg.self = 0;
    // checked along the actual curve it's flying, not a straight line
    {
      let th = this.course, px = hd.x, py = hd.y, walked = 0;
      const ds = 10 * s, w = this.omega * (ds / Math.max(this.speed, 0.5 * s));
      for (let n = 1; n <= 12; n++) {
        th += w; px += Math.cos(th) * ds; py += Math.sin(th) * ds; walked += ds;
        if (n % 4) continue;
        const { gap, i } = this.bodyGap({ x: px, y: py }, 30);
        if (gap < 26 * s) {
          const q = this.seg[i], cr = Math.cos(this.course) * (q.y - hd.y) - Math.sin(this.course) * (q.x - hd.x);
          want += (cr > 0 ? -1 : 1) * 0.7 * (1 - Math.max(0, gap) / (26 * s));
          this.turnBoost = Math.max(this.turnBoost, 0.4);
          this.dbg.self = n;
          break;
        }
      }
      void walked;
    }
    // about to leave its area: blend the direction back toward the inside, more the further out it would go
    let edgeNow = !!o.edge;
    if (o.area) {
      const b = o.area, L = 300 * s, m = 70 * s;
      const px = hd.x + Math.cos(this.course) * L, py = hd.y + Math.sin(this.course) * L;
      const out = Math.max(b.x0 + m - px, px - (b.x1 - m), b.y0 + m - py, py - (b.y1 - m), 0);
      if (out > 0) {
        const toC = Math.atan2((b.y0 + b.y1) / 2 - hd.y, (b.x0 + b.x1) / 2 - hd.x);
        want += wrap(toC - want) * Math.min(1, out / (70 * s));
        edgeNow = true;
      }
    }
    // how close the face is to the other body (negative means inside its space)
    const now = others.length ? this.faceGap(hd.x, hd.y, this.dirAt(0), others) : Infinity;
    // bodies got tangled: turn away from the other right away so they separate instead of sliding inside each other
    if (now < 0) {
      const n = this.contactNormal(others), away = Math.atan2(n.y, n.x);
      want += wrap(away - want) * Math.min(1, 0.5 - now / (12 * s));
      this.turnBoost = Math.max(this.turnBoost, 0.8);
    }
    let diff = wrap(want - this.course);
    this.dbg.diff = diff; this.dbg.wall = wallAhead ? 1 : 0;
    // target almost straight behind: pick a side and swing around in a wide arc
    if (Math.abs(diff) > 2.3) {
      if (this.steps > this.revUntil) {
        this.revSide = Math.sign(diff) || 1;
        // turn around on whichever side is open
        if (o.walls.length) {
          const side = (sg: number) => this.faceHits(hd.x + Math.cos(this.course + sg * 1.3) * 110 * s, hd.y + Math.sin(this.course + sg * 1.3) * 110 * s, this.course + sg * 1.3, o.walls, 10 * s);
          if (side(this.revSide) && !side(-this.revSide)) this.revSide = -this.revSide;
        }
      }
      this.revUntil = this.steps + 45;
      diff = this.revSide * Math.abs(diff);
    }
    // turning circle is about 90px (scaled), tighter when needed (trial, aiming, sliding along a wall)
    const behind = Math.abs(diff) > 1.7 && !this.blocked && !this.stuck && !edgeNow && o.base < 0.08 ? 1.6 : edgeNow ? 0.75 : 1;
    // slower means tighter turns, about 90px at cruising speed and 60px when slow
    const R = ((0.065 / o.base) * (40 + 19 * (this.speed / s)) * s) * behind * (this.blocked || this.stuck > 0 ? 0.6 : 1 - this.turnBoost * 0.3);
    const maxW = Math.max(0.012, Math.min(0.12, this.speed / R));
    const wantW = Math.max(-maxW, Math.min(maxW, diff * 0.1 * (1 + this.turnBoost * 0.6)));
    this.omega += (wantW - this.omega) * 0.15;
    this.omega = Math.max(-maxW * 1.1, Math.min(maxW * 1.1, this.omega));
    const before = this.course;
    this.course += this.omega;
    // course can only be so far from the neck line so it never folds back into itself
    {
      const neck = Math.atan2(this.seg[0].y - this.seg[2].y, this.seg[0].x - this.seg[2].x);
      const off = wrap(this.course - neck), lim = this.stuck > 0 ? 0.85 : 0.6;
      this.dbg.neckLim = Math.abs(off) > lim ? 1 : 0;
      if (Math.abs(off) > lim) { this.course = neck + Math.sign(off) * lim; this.omega *= 0.6; }
    }
    // turning one way for most of a loop means it's starting to fly in circles
    this.spin = this.spin * 0.997 + wrap(this.course - before);
    this.looping = Math.abs(this.spin) > 4.4;
    if (this.looping) this.spin = 0;
    this.turnBoost = Math.max(0, this.turnBoost - 1 / 40);
    let wantV = this.holdFire ? Math.min(o.top, Math.max(0, (dist - 110 * s) * 0.03)) : Math.min(o.top, 1.1 * s + dist * 0.04);
    wantV *= o.slow ?? 1;
    // target close and off to the side, inside the turning circle: slow down and turn in instead of circling it
    if (Math.abs(diff) > 0.9 && dist < R * 2.6) wantV = Math.min(wantV, Math.max(1.2 * s, this.speed * 0.9));
    this.speed += (wantV - this.speed) * 0.06;
    if (this.stuck > 0) this.speed = Math.max(this.speed, 1.6 * s);
    // snake wave, calmer while turning hard, near walls, aiming or slow
    {
      const calm = this.blocked || this.stuck > 0 || wallAhead || !!this.holdFire || this.speed < 0.9 * s;
      // also calmer next to the other dragon so the bodies don't look like they're rubbing
      let near = 1;
      for (const q of others) near = Math.min(near, Math.max(0, Math.min(1, (q.bodyGap(hd).gap - 40 * s) / (120 * s))));
      const ampWant = calm ? 0 : 0.3 * (1 - 0.7 * Math.min(1, Math.abs(this.omega) / maxW)) * (this.fireAt ? 0.4 : 1) * near;
      this.waveAmp += (ampWant - this.waveAmp) * 0.025;
      this.wave += (this.speed / (310 * s)) * Math.PI * 2;
      this.heading = this.course + this.waveAmp * Math.sin(this.wave);
    }
    // neck bends toward what it's breathing at, or glances at the rival
    {
      const aimP = this.holdFire ?? this.fireAt ?? this.glance;
      let nb = 0;
      if (aimP) {
        const raw = Math.atan2(hd.y - this.seg[FACE_BACK].y, hd.x - this.seg[FACE_BACK].x);
        const base = raw + wrap(this.course - raw) * 0.6;
        const lim = this.holdFire || this.fireAt ? 0.62 : 0.3;
        nb = Math.max(-lim, Math.min(lim, wrap(Math.atan2(aimP.y - hd.y, aimP.x - hd.x) - base)));
        // target far behind, so turn the body instead of the neck
        if (Math.abs(wrap(Math.atan2(aimP.y - hd.y, aimP.x - hd.x) - base)) > 1.9) nb = 0;
      }
      this.neck += Math.max(-0.04, Math.min(0.04, (nb - this.neck) * 0.25));
    }
    // near the other dragon's body: curve away gently well before touching and only slow a little
    if (now < 70 * s) {
      const n = this.contactNormal(others), k = 1 - Math.max(0, now) / (70 * s);
      const away = Math.atan2(n.y, n.x), off = wrap(away - this.course);
      if (Math.abs(off) > 0.35) {
        const turn = Math.sign(off) * Math.min(Math.abs(off) - 0.35, 0.03 * k);
        this.course += turn;
        this.omega += (turn - this.omega) * 0.1 * k;
      }
      this.speed = Math.max(1.1 * s, this.speed * (1 - 0.01 * k));
    }
    let mx = Math.cos(this.heading) * this.speed, my = Math.sin(this.heading) * this.speed;
    if (others.length && now < 24 * s) {
      const n = this.contactNormal(others), dot = mx * n.x + my * n.y;
      if (dot < 0) {
        // fully gone before touching so the hard stop below never kicks in
        const k = Math.min(1, Math.max(0, (24 * s - Math.max(0, now)) / (15 * s)));
        mx -= dot * n.x * k; my -= dot * n.y * k;
      }
    }
    // already inside the other's space: ease back out, in proportion to how far in it is
    if (others.length && now < 0) {
      const n = this.contactNormal(others), k = Math.min(2.5 * s, -now * 0.3);
      mx += n.x * k; my += n.y * k;
    }
    if (o.walls.length) {
      const zone = 16 * s, d = this.faceDepth(hd.x, hd.y, this.dirAt(0), o.walls, zone);
      if (d > 0) {
        const n = this.normal(o.walls, []), dot = mx * n.x + my * n.y;
        if (dot < 0) { const k = Math.min(1, d / (zone - 4 * s)); mx -= dot * n.x * k; my -= dot * n.y * k; }
      }
    }
    this.blocked = false;
    this.dbg.by = 0;
    let holdFace = false;
    if (o.walls.length || others.length) {
      // rule is never deeper: a move is only refused if it pushes the face further into a wall than it already is
      const m = 3 * s;
      // measured on the pose the face is drawn in now
      const depthNow = o.walls.length ? this.faceDepth(hd.x, hd.y, this.dirAt(0), o.walls, m) : 0;
      // drawnOnly: only test the pose the face will actually be drawn in (used for glides)
      let lastDepth = 0;
      const hits = (x: number, y: number, drawnOnly = false) => {
        void this.dirAfter;
        lastDepth = 0;
        if (o.walls.length) {
          // only the drawn pose counts
          void drawnOnly;
          // judged at the current head angle
          const dNew = this.faceDepth(x, y, this.dirAt(0), o.walls, m);
          lastDepth = dNew;
          // going deeper is refused past half the margin so the face can't creep into the brick
          if (dNew > m * 0.5 && dNew > depthNow + 1e-4) { this.dbg.by = 1; return true; }
        }
        if (!others.length) return false;
        // judged at the current head angle, the move not the turn (a turn that would touch is held back below)
        const g = this.faceGap(x, y, this.dirAt(0), others);
        // only refused if it would actually touch (the easing above usually stops it way before)
        if (g < 1.5 * s && g < now) { this.dbg.by = 2; return true; }
        return false;
      };
      let slid = false;
      const wallBlocks = (x: number, y: number) => {
        if (!o.walls.length) return false;
        const d = this.faceDepth(x, y, this.dirAt(0), o.walls, m);
        return d > m * 0.5 && d > depthNow + 1e-4;
      };
      if (others.length && this.slideFor > 0 && now < 14 * s) {
        this.slideFor--;
        const n = this.contactNormal(others), dot = mx * n.x + my * n.y;
        if (dot < 0) { mx -= dot * n.x * 1.15; my -= dot * n.y * 1.15; }
      }
      if (others.length && !wallBlocks(hd.x + mx, hd.y + my) && hits(hd.x + mx, hd.y + my)) {
        // against the other dragon: keep its momentum and drop only the part going into the other body
        const n = this.contactNormal(others), dot = mx * n.x + my * n.y;
        let sx = mx, sy = my;
        if (dot < 0) { sx = mx - dot * n.x * 1.15; sy = my - dot * n.y * 1.15; }
        // take as much of that slide as fits (no sideways jump, the wall glide below isn't used here)
        let lo = 0, hi = 1;
        if (!hits(hd.x + sx, hd.y + sy, true)) lo = 1;
        else for (let q = 0; q < 6; q++) { const f = (lo + hi) / 2; if (hits(hd.x + sx * f, hd.y + sy * f, true)) hi = f; else lo = f; }
        mx = sx * lo; my = sy * lo;
        // no slide fits (pressed right up against it): ease straight out and turn the course to peel away
        if (lo < 0.05) {
          const v = Math.max(0.9 * s, this.speed * 0.6);
          mx = n.x * v; my = n.y * v;
          let tx = -n.y, ty = n.x;
          if (tx * Math.cos(this.course) + ty * Math.sin(this.course) < 0) { tx = -tx; ty = -ty; }
          const turn = Math.max(-0.05, Math.min(0.05, wrap(Math.atan2(n.y + ty * 0.6, n.x + tx * 0.6) - this.course)));
          this.course += turn; this.heading += turn; this.omega += (turn - this.omega) * 0.2;
        }
        slid = true; this.blocked = true; this.slideFor = 10;
      } else if (this.slideFor > 0) { slid = true; this.blocked = true; }
      if (!slid && o.hold && hits(hd.x + mx, hd.y + my)) {
        mx = 0; my = 0;
        this.blocked = true;
        this.still = 0;
      } else if (!slid && hits(hd.x + mx, hd.y + my)) {
        // glide along the surface instead of stopping: try the way closest to where it was going (or the target)
        this.blocked = true;
        const n = this.normal(o.walls, others);
        let tx = -n.y, ty = n.x;
        const fwd = tx * Math.cos(this.heading) + ty * Math.sin(this.heading);
        const toT = tx * dx + ty * dy;
        if ((Math.abs(fwd) > 0.25 ? fwd : toT) < 0) { tx = -tx; ty = -ty; }
        const v = Math.max(this.speed, 1.3 * s);
        const tries: [number, number][] = [[tx * v, ty * v], [-tx * v, -ty * v], [n.x * v * 0.8, n.y * v * 0.8]];
        mx = 0; my = 0;
        let found = false;
        for (const [ax, ay] of tries) if (!hits(hd.x + ax, hd.y + ay, true)) { mx = ax; my = ay; found = true; break; }
        if (!found && o.walls.length) {
          // the head turn is what's blocked (the jaw would sweep through the brick)
          let best = -Infinity;
          for (let k = 0; k < 16; k++) {
            const a = (k / 16) * Math.PI * 2, ax = Math.cos(a) * v * 0.8, ay = Math.sin(a) * v * 0.8;
            const dNew = this.faceDepth(hd.x + ax, hd.y + ay, this.face, o.walls, m);
            if (dNew > Math.max(depthNow, m * 0.5) + 1e-4) continue;
            if (others.length && this.faceGap(hd.x + ax, hd.y + ay, this.face, others) < Math.min(3 * s, now)) continue;
            const sc = Math.cos(a - this.course) + 0.5 * Math.cos(a - Math.atan2(dy, dx)) - dNew;
            if (sc > best) { best = sc; mx = ax; my = ay; found = true; holdFace = true; }
          }
        }
        if (!found) {
          // last resort (neck folded in a tight spot)
          let best = Infinity;
          for (let k = 0; k < 12; k++) {
            const a = (k / 12) * Math.PI * 2, ax = Math.cos(a) * v * 0.8, ay = Math.sin(a) * v * 0.8;
            const blocked = hits(hd.x + ax, hd.y + ay, true);
            const g = others.length ? this.faceGap(hd.x + ax, hd.y + ay, this.dirAfter(hd.x + ax, hd.y + ay), others) : Infinity;
            if (g < 0) continue;
            const d = blocked ? lastDepth : 0;
            if (d <= Math.max(depthNow, m * 0.5) && d < best) { best = d; mx = ax; my = ay; }
          }
        }
        // turn the heading the way it's gliding so the face turns along the wall
        if (mx || my) {
          const turn = Math.max(-0.08, Math.min(0.08, wrap(Math.atan2(my, mx) - this.course)));
          this.course += turn;
          this.heading += turn;
          this.omega += (turn - this.omega) * 0.2;
        }
        this.speed = Math.max(this.speed * 0.92, 1.3 * s);
        this.turnBoost = Math.max(this.turnBoost, 0.9);
      }
    }
    hd.x += mx;
    hd.y += my;
    // watchdog: barely moving for over half a second (and not holding still on purpose) means it's pinned
    if (Math.hypot(mx, my) < 0.35 * s && !this.holdFire && !(o.hold && this.blocked) && o.top > 0.05 * s) this.still++;
    else this.still = Math.max(0, this.still - 2);
    if (this.still > 36) { this.stuck = 50; this.still = 0; }
    if (this.stuck > 0) this.stuck--;
    this.follow();
    // pinned with nowhere to go, so keep the head pose instead of turning into the wall
    if (!holdFace && (mx || my || !o.walls.length)) {
      const raw = Math.atan2(this.seg[0].y - this.seg[FACE_BACK].y, this.seg[0].x - this.seg[FACE_BACK].x);
      const nf = this.face + Math.max(-FACE_TURN, Math.min(FACE_TURN, wrap(this.faceWant(raw) - this.face)));
      // a head turn that would put the face against the other dragon waits until there's room
      let turnOk = true;
      if (others.length && now < 30 * s) {
        const gNew = this.faceGap(hd.x, hd.y, nf, others);
        turnOk = gNew > 1.5 * s || gNew >= this.faceGap(hd.x, hd.y, this.face, others);
      }
      // and a turn can't sweep the jaw into a wall either
      if (turnOk && o.walls.length) {
        const m = 3 * s, dTurn = this.faceDepth(hd.x, hd.y, nf, o.walls, m);
        if (dTurn > m * 0.5) turnOk = dTurn <= this.faceDepth(hd.x, hd.y, this.face, o.walls, m) + 1e-4;
      }
      if (turnOk) this.face = nf;
    }
    // leg cycle follows speed smoothly instead of jumping
    this.gait += (0.35 + this.speed / (4.6 * s)) * (8 / 60);
    return dist;
  }

  // body: place each section along the head's path, 7px (scaled) apart
  private follow() {
    const seg = this.seg, trail = this.trail, hd = seg[0], gap = 7 * this.s;
    if (Math.hypot(hd.x - trail[0].x, hd.y - trail[0].y) > 0.75) trail.unshift({ x: hd.x, y: hd.y });
    else { trail[0].x = hd.x; trail[0].y = hd.y; }
    let ti = 0, walked = 0;
    for (let i = 1; i < N; i++) {
      const want = i * gap;
      let placed = false;
      while (ti < trail.length - 1) {
        const a = trail[ti], b = trail[ti + 1];
        const L = Math.hypot(b.x - a.x, b.y - a.y);
        if (walked + L >= want) {
          const u = L > 0 ? (want - walked) / L : 0;
          seg[i].x = a.x + (b.x - a.x) * u;
          seg[i].y = a.y + (b.y - a.y) * u;
          placed = true;
          break;
        }
        walked += L;
        ti++;
      }
      if (!placed) {
        // path isn't long enough yet (just started), so continue straight
        const a = seg[i - 1], b = trail.length > 1 ? trail[trail.length - 2] : seg[i - 1], c = trail[trail.length - 1];
        const ang = trail.length > 1 ? Math.atan2(c.y - b.y, c.x - b.x) : Math.atan2(seg[i].y - a.y, seg[i].x - a.x);
        seg[i].x = a.x + Math.cos(ang) * gap;
        seg[i].y = a.y + Math.sin(ang) * gap;
      }
    }
    if (trail.length > ti + 3) trail.length = ti + 3;
  }

  // eyes watch lookAt (smoothed) and blink now and then
  eyes(lookAt: P | null, t: number) {
    const hd = this.seg[0], s = this.s;
    if (t > this.blinkAt + this.blinkLen) {
      this.blinkAt = t + 2.2 + Math.random() * 4.5;
      this.blinkLen = Math.random() < 0.2 ? 0.42 : 0.16;
    }
    if (lookAt) {
      const rel = wrap(Math.atan2(lookAt.y - hd.y, lookAt.x - hd.x) - this.dirAt(0));
      const near = Math.min(1, Math.hypot(lookAt.x - hd.x, lookAt.y - hd.y) / (60 * s));
      this.look.x += (Math.cos(rel) * near - this.look.x) * 0.12;
      this.look.y += (Math.sin(rel) * near - this.look.y) * 0.12;
    }
  }

  // fire: open the jaw as it lines up with the target, breathe once facing it
  fire(sparks: Spark[], t: number, maxDist = this.range(), aim = 0.4) {
    const s = this.s, hd = this.seg[0];
    if (this.fireAt && t > this.fireUntil && this.fireUntil > 0) this.fireAt = null;
    if (this.breath <= 0) this.holdFire = null;
    // moving target (rising lantern, rival's body): keep aiming at it
    if (this.aimFn) {
      if (!this.fireAt && !this.holdFire) { this.aimFn = null; this.prey = null; }
      else {
        const q = this.aimFn();
        if (!q) {
          this.aimFn = null; this.prey = null; this.fireAt = null; this.holdFire = null;
          this.breath = Math.min(this.breath, 0.1);
        } else for (const p of [this.fireAt, this.holdFire]) if (p) { p.x = q.x; p.y = q.y; }
      }
    }
    if (this.fireAt) {
      const face = Math.abs(wrap(Math.atan2(this.fireAt.y - hd.y, this.fireAt.x - hd.x) - this.dirAt(0)));
      const fd = Math.hypot(this.fireAt.x - hd.x, this.fireAt.y - hd.y);
      this.aimOpen = face < 1.1 ? 0.3 : 0;
      if ((face < aim && fd < maxDist) || (fd < 60 * s && face < 1.2)) {
        this.breath = this.breathLen;
        this.breathId++;
        this.holdFire = this.fireAt;
        this.fireAt = null;
      }
    }
    {
      const want = this.breath > 0 ? 1 : this.fireAt ? this.aimOpen : 0;
      this.mouth += Math.max(-0.07, Math.min(0.11, (want - this.mouth) * (want > this.mouth ? 0.3 : 0.14)));
      if (this.mouth < 0.002) this.mouth = 0;
    }
    if (this.breath > 0) this.breath -= 1 / 60;
    if (this.breath > 0 && this.mouth > 0.55) {
      const mo = this.headPt(56, 0);
      // flame goes out along the head, nudged toward the target
      let d = this.dirAt(0);
      if (this.holdFire) d += Math.max(-0.22, Math.min(0.22, wrap(Math.atan2(this.holdFire.y - mo.y, this.holdFire.x - mo.x) - d)));
      for (let k = 0; k < 9; k++) {
        const a = d + (Math.random() - 0.5) * 0.26;
        const v = (7 + Math.random() * 6) * s * this.firePower;
        const life = 34 + Math.random() * 26;
        sparks.push({
          x: mo.x, y: mo.y, vx: Math.cos(a) * v + Math.cos(this.heading) * this.speed, vy: Math.sin(a) * v + Math.sin(this.heading) * this.speed,
          life, max: life, r: (5 + Math.random() * 7) * s, smoke: false, own: this.id, bid: this.breathId,
        });
      }
    } else if (Math.random() < 0.05) this.smoke(sparks, 1);
  }

  // smoke from the nostrils, a lazy curl or a sharp warning snort
  smoke(sparks: Spark[], n: number, hard = false) {
    const s = this.s, d = this.dirAt(0);
    for (let k = 0; k < n; k++) {
      const side = k % 2 ? -2.6 : 2.6;
      const no = this.headPt(50, Math.random() < 0.5 && !hard ? -side : side);
      const v = hard ? 2.2 + Math.random() * 1.6 : 0.6;
      const a = d + (hard ? (side > 0 ? 0.5 : -0.5) + (Math.random() - 0.5) * 0.4 : 0);
      sparks.push({ x: no.x, y: no.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.3, life: hard ? 46 : 60, max: hard ? 46 : 60, r: (hard ? 4 : 3) * s, smoke: true });
      if (hard && k % 3 === 0) {
        const life = 16 + Math.random() * 10;
        sparks.push({ x: no.x, y: no.y, vx: Math.cos(a) * v * 1.4, vy: Math.sin(a) * v * 1.4, life, max: life, r: 2.5 * s, smoke: false, fx: true });
      }
    }
  }

  // drawing
  edges() {
    const L: P[] = [], R: P[] = [];
    for (let i = 0; i < N; i++) {
      const d = this.dirAt(i), r = this.rad(i), p = this.seg[i];
      L.push({ x: p.x + Math.cos(d + Math.PI / 2) * r, y: p.y + Math.sin(d + Math.PI / 2) * r });
      R.push({ x: p.x + Math.cos(d - Math.PI / 2) * r, y: p.y + Math.sin(d - Math.PI / 2) * r });
    }
    return { L, R };
  }
  bodyPath = (L: P[], R: P[]) => {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(L[0].x, L[0].y);
    for (let i = 1; i < N; i++) ctx.lineTo(L[i].x, L[i].y);
    for (let i = N - 1; i >= 0; i--) ctx.lineTo(R[i].x, R[i].y);
    ctx.closePath();
  };

  // shadow: draw the shape far off screen so only its blurred shadow lands on the page
  private shadow(L: P[], R: P[]) {
    const { ctx, env } = this, s = env.s, dpr = env.dpr;
    const alt = 0.5 + 0.5 * Math.sin(env.t * 0.7 + this.altPhase);
    const off = 10000;
    ctx.save();
    ctx.translate(-off, 0);
    ctx.shadowColor = `rgba(0, 0, 0, ${(0.5 - alt * 0.22) * this.alpha})`;
    ctx.shadowBlur = (10 + alt * 22) * dpr;
    ctx.shadowOffsetX = (off + (18 + alt * 34) * s) * dpr;
    ctx.shadowOffsetY = (26 + alt * 46) * s * dpr;
    ctx.fillStyle = "#000";
    this.bodyPath(L, R);
    ctx.fill();
    const hp = this.seg[0], d = this.dirAt(0);
    ctx.beginPath();
    ctx.ellipse(hp.x + Math.cos(d) * 14 * s, hp.y + Math.sin(d) * 14 * s, 50 * s, 30 * s, d, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // draw between the last two steps (k from 0 to 1) so it stays smooth on 90/120Hz screens
  draw(k: number) {
    if (this.alpha <= 0.01) return;
    const { ctx, env } = this, s = env.s;
    const live = this.seg, buf = this.drawBuf;
    for (let i = 0; i < N; i++) {
      const p = live[i], q = this.prevSeg[i];
      buf[i].x = q.x + (p.x - q.x) * k;
      buf[i].y = q.y + (p.y - q.y) * k;
    }
    this.seg = buf;
    this.faceNow = this.prevFace + wrap(this.face - this.prevFace) * k;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    const { L, R } = this.edges();
    this.shadow(L, R);
    // fire glow around the mouth
    if (this.breath > 0) {
      const hp = this.seg[0], d = this.dirAt(0);
      const gx = hp.x + Math.cos(d) * 120 * s, gy = hp.y + Math.sin(d) * 120 * s;
      const gl = ctx.createRadialGradient(gx, gy, 0, gx, gy, 260 * s);
      gl.addColorStop(0, `rgba(255, 140, 40, ${0.22 * Math.min(1, this.breath * 2) * this.mouth})`);
      gl.addColorStop(1, "rgba(255, 120, 30, 0)");
      ctx.fillStyle = gl;
      ctx.fillRect(gx - 260 * s, gy - 260 * s, 520 * s, 520 * s);
    }
    const { limb, boneFill, blade } = this.parts;
    drawBody({ ctx, seg: this.seg, N, s, gait: this.gait, rad: this.rad, dirAt: this.dirAt, bodyPath: this.bodyPath, L, R, limb, blade, boneFill, pal: this.pal });
    drawHead({
      ctx, seg: this.seg, dirAt: this.dirAt, HS: this.HS, mouth: this.mouth, t: env.t, blinkAt: this.blinkAt, blinkLen: this.blinkLen,
      look: this.look, s, dpr: env.dpr, blade, boneFill, pal: this.pal,
    });
    ctx.restore();
    this.seg = live;
    this.faceNow = null;
  }
}
