"use client";
// how the two dragons share the page: wandering, keeping clear of each other
import type { P, Spark, Wall } from "./types";
import { Creature, inRect, wrap, type Box } from "./creature";
import type { Sky } from "./world";

export const DUEL_LEN = 15;
// a random point in box that is clear of walls and anything else `bad` rejects
export function freePoint(box: Box, walls: Wall[], s: number, bad: (p: P) => boolean, tries = 24): P {
  let p = { x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 };
  for (let k = 0; k < tries; k++) {
    p = { x: box.x0 + Math.random() * (box.x1 - box.x0), y: box.y0 + Math.random() * (box.y1 - box.y0) };
    if (walls.some((wl) => !wl.ghost && inRect(p.x, p.y, wl, 90 * s))) continue;
    if (bad(p)) continue;
    return p;
  }
  return p;
}

const clampTo = (p: P, box: Box, m: number): P => ({
  x: Math.max(box.x0 + m, Math.min(box.x1 - m, p.x)),
  y: Math.max(box.y0 + m, Math.min(box.y1 - m, p.y)),
});

// steering clear of the other dragon
export class Avoid {
  side = 0;
  until = 0;
  threat = 0;
  close = 0;
  lock = 0;
  // room: how wide a berth to give (more when both share the screen
  steer(me: Creature, other: Creature, s: number, t: number, room = 1): { bias: number; slow: number } {
    if (other.alpha < 0.5) { this.threat = 0; return { bias: 0, slow: 1 }; }
    const hd = me.seg[0], c = me.course, oh = other.seg[0];
    // far apart: nothing to do (cheap early out)
    if (Math.hypot(oh.x - hd.x, oh.y - hd.y) > 900 * s && other.bodyGap(hd).gap > 420 * s) { this.threat = 0; return { bias: 0, slow: 1 }; }
    let threat = 0, qx = 0, qy = 0;
    for (const L of [35, 85, 145, 215, 295, 380]) {
      const px = hd.x + Math.cos(c) * L * s, py = hd.y + Math.sin(c) * L * s;
      const steps = (L * s) / Math.max(me.speed, 1.2 * s);
      const fx = oh.x + Math.cos(other.course) * other.speed * steps, fy = oh.y + Math.sin(other.course) * other.speed * steps;
      const { gap, i } = other.bodyGap({ x: px, y: py }, 0, true);
      const gh = Math.hypot(px - fx, py - fy) - 60 * s;
      const g = Math.min(gap, gh);
      const th = Math.max(0, 1 - g / (190 * room * s)) * (1 - L / 480);
      if (th > threat) {
        threat = th;
        const q = gap < gh ? other.seg[i] : { x: fx, y: fy };
        qx = q.x; qy = q.y;
      }
    }
    // ease the threat in and out, so the swerve itself is a smooth curve
    this.threat += (threat - this.threat) * 0.2;
    if (this.threat < 0.02 && this.lock < 0.02 && other.bodyGap(hd).gap > 200 * room * s) { this.lock = 0; return { bias: 0, slow: 1 }; }
    if (threat > 0.02) {
      const dx = qx - hd.x, dy = qy - hd.y, cr = Math.cos(c) * dy - Math.sin(c) * dx, L = Math.hypot(dx, dy) || 1;
      // dead ahead: keep to the same hand as the other does (both turn clockwise), so they pass instead of mirroring
      const want = Math.abs(cr) < 0.18 * L ? 1 : cr > 0 ? -1 : 1;
      if (t > this.until || (want !== this.side && Math.abs(cr) > 0.4 * L)) this.side = want;
      this.until = t + 0.9;
    }
    // flying side by side, close: they would stay locked together (each one's way on lies across the other
    let lock = 0, slow = 1;
    {
      const g = other.bodyGap(hd, 0, true).gap, par = Math.abs(Math.atan2(Math.sin(other.course - c), Math.cos(other.course - c))) < 0.9;
      if (par && g < 170 * room * s) {
        const dx = oh.x - hd.x, dy = oh.y - hd.y, cr = Math.cos(c) * dy - Math.sin(c) * dx, along = Math.cos(c) * dx + Math.sin(c) * dy;
        lock = Math.min(1, 1.2 * (1 - g / (170 * room * s)));
        this.side = cr > 0 ? -1 : 1;
        this.until = t + 0.9;
        if (along > 0) slow = 1 - 0.28 * lock;
      }
    }
    this.lock += (lock - this.lock) * 0.1;
    // pressed close for over a second: the brain should pick somewhere else to go
    this.close = this.threat > 0.45 || this.lock > 0.4 ? this.close + 1 / 60 : 0;
    // it keeps its pace (slowing down beside the other looked like sniffing it); only the course bends
    return { bias: this.side * Math.max(this.threat, this.lock) * 1.35, slow: Math.min(1 - 0.08 * this.threat, 1 - (1 - slow) * Math.min(1, this.lock * 1.5)) };
  }
}

// a dragon outside its box (scrolled out of its area, or flying in from off-screen) heads straight back in
export function homeward(me: Creature, box: Box, s: number, slack = 0, walls: Wall[] = []): P | null {
  const hd = me.seg[0];
  if (me.stuck > 0) return null;
  if (hd.x > box.x0 - slack && hd.x < box.x1 + slack && hd.y > box.y0 - slack && hd.y < box.y1 + slack) return null;
  const k = Math.min(160 * s, (box.x1 - box.x0) / 3, (box.y1 - box.y0) / 3);
  const p = clampTo(hd, box, k);
  for (const wl of walls) {
    if (wl.ghost) continue;
    let hit = false;
    for (let u = 0.15; u <= 1 && !hit; u += 0.17) hit = inRect(hd.x + (p.x - hd.x) * u, hd.y + (p.y - hd.y) * u, wl, 55 * s);
    if (!hit) continue;
    // round the wall on the side nearer to where it is
    const cy = wl.y + wl.h / 2, cx = wl.x + wl.w / 2;
    if (wl.w >= wl.h) p.y = hd.y < cy ? Math.min(p.y, wl.y - 150 * s) : Math.max(p.y, wl.y + wl.h + 150 * s);
    else p.x = hd.x < cx ? Math.min(p.x, wl.x - 150 * s) : Math.max(p.x, wl.x + wl.w + 150 * s);
    return clampTo(p, { x0: box.x0 - 200 * s, y0: box.y0, x1: box.x1 + 200 * s, y1: box.y1 }, 0);
  }
  return p;
}

const off = (me: Creature, p: P) => Math.abs(Math.atan2(Math.sin(Math.atan2(p.y - me.seg[0].y, p.x - me.seg[0].x) - me.course), Math.cos(Math.atan2(p.y - me.seg[0].y, p.x - me.seg[0].x) - me.course)));

// a dragon's own wander
export class Wander {
  at: P = { x: 0, y: 0 };
  until = 0;
  huntAt = 0;
  // from: somewhere to drift away from (the other dragon, after a close pass or a duel)
  partFrom: (() => P) | null = null;
  partUntil = 0;
  part(from: () => P, t: number, secs: number) { this.partFrom = from; this.partUntil = t + secs; }
  pick(t: number, box: Box, walls: Wall[], s: number, bad: (p: P) => boolean, me?: Creature, from?: P) {
    if (!from && this.partFrom && t < this.partUntil) from = this.partFrom();
    const mx = Math.min(90 * s, (box.x1 - box.x0) / 3), my = Math.min(90 * s, (box.y1 - box.y0) / 3);
    const inner = { x0: box.x0 + mx, y0: box.y0 + my, x1: box.x1 - mx, y1: box.y1 - my };
    this.until = t + 5 + Math.random() * 3;
    if (me && me.seg.length) {
      const hd = me.seg[0];
      for (const cone of [1.0, 1.6, 2.3]) {
        let best: P | null = null, bs = -Infinity;
        for (let k = 0; k < 14; k++) {
          const a = me.course + (Math.random() * 2 - 1) * cone, L = (260 + Math.random() * 380) * s;
          const p = { x: hd.x + Math.cos(a) * L, y: hd.y + Math.sin(a) * L };
          if (p.x < inner.x0 || p.x > inner.x1 || p.y < inner.y0 || p.y > inner.y1) continue;
          if (walls.some((wl) => !wl.ghost && inRect(p.x, p.y, wl, 90 * s))) continue;
          if (bad(p)) continue;
          const sc = -Math.abs(a - me.course) + Math.random() * 0.6 + (from ? Math.min(1.6, Math.hypot(p.x - from.x, p.y - from.y) / (380 * s)) : 0);
          if (sc > bs) { bs = sc; best = p; }
        }
        if (best) { this.at = best; return; }
      }
    }
    this.at = freePoint(inner, walls, s, bad);
  }
  set(p: P, t: number, hold = 3) {
    this.at = p;
    this.until = t + hold;
  }
  // reached, overdue, or too tight to reach without circling (close by and well off to one side, or behind it)
  due(t: number, me: Creature, s: number) {
    const hd = me.seg[0], d = Math.hypot(this.at.x - hd.x, this.at.y - hd.y), o = off(me, this.at);
    return t > this.until || d < 90 * s || (d < 220 * s && o > 1.2) || (d < 420 * s && o > 2.3);
  }
  // breathe at a rising lantern ahead, unless the other dragon has it in its sights or is clearly nearer to it
  hunt(t: number, me: Creature, sky: Sky[], s: number, rival?: Creature, area?: Box) {
    if (t < this.huntAt || me.fireAt || me.breath > 0) return;
    this.huntAt = t + 0.45;
    const hd = me.seg[0], rv = rival && rival.alpha > 0.5 ? rival : null;
    let best: Sky | null = null, bs = Infinity;
    for (const o of sky) {
      if (o.a < 0.6 || (rv && rv.prey === o)) continue;
      // only lanterns well inside its area (not ones still rising from below the edge of the screen)
      if (area && (o.x < area.x0 + 60 * s || o.x > area.x1 - 60 * s || o.y < area.y0 + 60 * s || o.y > area.y1 - 90 * s)) continue;
      const d = Math.hypot(o.x - hd.x, o.y - hd.y), ang = off(me, o);
      if (d > 420 * s || d < 110 * s || ang > 1.0) continue;
      if (rv && Math.hypot(o.x - rv.seg[0].x, o.y - rv.seg[0].y) < d * 0.85) continue;
      const sc = d * (1 + ang);
      if (sc < bs) { bs = sc; best = o; }
    }
    if (!best || Math.random() > 0.55) return;
    const o = best;
    me.breatheAt({ x: o.x, y: o.y }, t, 2.6, () => (sky.includes(o) && o.a > 0.35 ? { x: o.x, y: o.y + o.vy * 10 } : null));
    me.prey = o;
  }
}

// the duel, choreographed so it always reads as a real fight
const bump = (x: number, up: number, len: number) => x <= 0 || x >= len ? 0 : x < up ? Math.sin((x / up) * Math.PI / 2) : 0.5 + 0.5 * Math.cos(((x - up) / (len - up)) * Math.PI);
export type DuelFx = { clash: (p: P) => void; knock: (p: P) => void; snort: (c: Creature) => void };
const STANCE = 180;
const LANE = 56;
const G1 = 2.7, S1 = 3.7, G2 = 9.4, S2 = 10.4, EXIT = 1.4;
type Way = { pts: P[]; len: number[]; total: number; pos: number; v: number; ox: number; oy: number; push: number; nx: number; ny: number; fade: number };
type Mode = "way" | "hold" | "lunge" | "exit";
type Lunge = { vx: number; vy: number; sp: number; passed: boolean; t0: number; final: boolean };
export class Duel {
  on = false;
  t0 = 0;
  axis: "x" | "y" = "x";
  mid = 0;
  sign: [number, number] = [-1, 1];
  box: Box = { x0: 0, y0: 0, x1: 0, y1: 0 };
  clashed = false;
  clashAt = 0;
  meetAt: P | null = null;
  knocked = false;
  lined: [boolean, boolean] = [false, false];
  charging: [boolean, boolean] = [false, false];
  ready = 0;
  attacker: 0 | 1 = 0;
  mode: [Mode, Mode] = ["way", "way"];
  private vB = 0;
  private lane: [number, number] = [0, 0];
  private way: [Way | null, Way | null] = [null, null];
  private lunge: [Lunge | null, Lunge | null] = [null, null];
  private exitV: [P, P] = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
  wlog: number[][][] = [[], []];
  private vel = [{ u: 0, v: 0 }, { u: 0, v: 0 }];
  private wv: [P, P] = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
  private hitAt: [number, number] = [-9, -9];
  private recoilAt = -9;
  private done1: Set<string> = new Set();

  start(t: number, d: [Creature, Creature], box: Box, s: number) {
    this.on = true;
    this.t0 = t;
    this.box = box;
    this.clashed = false;
    this.knocked = false;
    this.meetAt = null;
    this.clashAt = 0;
    this.ready = 0;
    this.lined = [false, false];
    this.charging = [false, false];
    this.mode = ["way", "way"];
    this.lunge = [null, null];
    this.hitAt = [-9, -9];
    this.recoilAt = -9;
    this.done1 = new Set();
    this.hitIdx = [];
    this.wlog = [[], []];
    this.attacker = Math.random() < 0.5 ? 0 : 1;
    // split along the longer side of the screen, between the two bodies (not just the heads
    this.axis = box.x1 - box.x0 >= box.y1 - box.y0 ? "x" : "y";
    const a = this.axis, lo = a === "x" ? box.x0 : box.y0, hi = a === "x" ? box.x1 : box.y1;
    const cen = (c: Creature) => { let m = 0; for (let i = 0; i < c.seg.length; i += 2) m += c.seg[i][a] * (i < 24 ? 2 : 1); return m / (c.seg.length / 2 + 12); };
    const c0 = cen(d[0]), c1 = cen(d[1]);
    this.mid = Math.max(lo + (hi - lo) * 0.42, Math.min(lo + (hi - lo) * 0.58, (c0 + c1) / 2));
    this.sign = c0 <= c1 ? [-1, 1] : [1, -1];
    const across = Math.max(0.3, Math.min(0.7, (this.acrossOf(d[0].seg[0]) + this.acrossOf(d[1].seg[0])) / 2));
    this.vB = this.axis === "x" ? box.y0 + 80 + (box.y1 - box.y0 - 160) * across : box.x0 + 70 + (box.x1 - box.x0 - 140) * across;
    const big = 1e5, m = 4 * s;
    for (const k of [0, 1] as const) {
      const sg = this.sign[k];
      this.ghost[k] = a === "x"
        ? { x: sg < 0 ? this.mid - m : -big, y: -big, w: sg < 0 ? big : big + this.mid + m, h: 2 * big, seed: 0, ghost: true }
        : { x: -big, y: sg < 0 ? this.mid - m : -big, w: 2 * big, h: sg < 0 ? big : big + this.mid + m, seed: 0, ghost: true };
      this.way[k] = this.plan(k, d[k], s);
      this.vel[k] = { u: 0, v: 0 };
      const sp = Math.max(2 * s, d[k].speed);
      this.wv[k] = { x: Math.cos(d[k].course) * sp, y: Math.sin(d[k].course) * sp };
    }
    // both arrive at about the same moment: the one with further to go flies a little faster
    const T = Math.max(this.way[0]!.total, this.way[1]!.total) / (5.5 * s);
    for (const w of this.way) if (w) w.v = Math.max(2.4 * s, Math.min(6.5 * s, w.total / Math.max(1, T)));
  }
  ghost: [Wall, Wall] = [{ x: 0, y: 0, w: 0, h: 0, seed: 0, ghost: true }, { x: 0, y: 0, w: 0, h: 0, seed: 0, ghost: true }];

  // line coordinates for dragon k: u is the distance from the line into its own half, v runs along the line
  private u(k: number, p: P) { return (p[this.axis] - this.mid) * this.sign[k]; }
  private v(p: P) { return this.axis === "x" ? p.y : p.x; }
  private xy(k: number, u: number, v: number): P { return this.axis === "x" ? { x: this.mid + this.sign[k] * u, y: v } : { x: v, y: this.mid + this.sign[k] * u }; }
  private latUnit(): P { return this.axis === "x" ? { x: 0, y: 1 } : { x: 1, y: 0 }; }
  // how deep dragon k's half is, from the line to the edge of the arena
  private depth(k: number) {
    const b = this.box, sg = this.sign[k];
    return this.axis === "x" ? (sg < 0 ? this.mid - b.x0 : b.x1 - this.mid) : sg < 0 ? this.mid - b.y0 : b.y1 - this.mid;
  }

  // taking position: a smooth curve from where the dragon is (leaving along its heading) back into its own half
  private plan(k: number, me: Creature, s: number): Way {
    const p0 = { x: me.seg[0].x, y: me.seg[0].y }, dl = this.lineDir(k), away = dl + Math.PI;
    const M = this.xy(k, STANCE * s, this.vB);
    const run = Math.max(70 * s, Math.min(230 * s, this.depth(k) - STANCE * s - 80 * s));
    const S = this.xy(k, STANCE * s + run, this.vB);
    const b = this.box, m = 50 * s;
    const keep = (p: P) => {
      const q = { x: Math.max(b.x0 + m, Math.min(b.x1 - m, p.x)), y: Math.max(b.y0 + m, Math.min(b.y1 - m, p.y)) };
      // never across the line
      if (this.u(k, q) < 70 * s) { const v = this.v(q); return this.xy(k, 70 * s, v); }
      return q;
    };
    const D = Math.hypot(S.x - p0.x, S.y - p0.y);
    const L1 = Math.max(90 * s, Math.min(280 * s, D * 0.45)), L2 = Math.max(110 * s, Math.min(260 * s, D * 0.45));
    const p1 = keep({ x: p0.x + Math.cos(me.course) * L1, y: p0.y + Math.sin(me.course) * L1 });
    const p2 = keep({ x: S.x + Math.cos(away) * L2, y: S.y + Math.sin(away) * L2 });
    const pts: P[] = [], len: number[] = [];
    let total = 0;
    const add = (p: P) => { if (pts.length) total += Math.hypot(p.x - pts[pts.length - 1].x, p.y - pts[pts.length - 1].y); pts.push(p); len.push(total); };
    for (let i = 0; i <= 72; i++) {
      const u = i / 72, v = 1 - u;
      add({
        x: v * v * v * p0.x + 3 * v * v * u * p1.x + 3 * v * u * u * p2.x + u * u * u * S.x,
        y: v * v * v * p0.y + 3 * v * v * u * p1.y + 3 * v * u * u * p2.y + u * u * u * S.y,
      });
    }
    for (let i = 1; i <= 12; i++) add({ x: S.x + (M.x - S.x) * (i / 12), y: S.y + (M.y - S.y) * (i / 12) });
    // the route actually flown: a virtual head follows that curve with a dragon's turning circle
    const ref = pts.slice(), st = 4 * s, look = 55 * s;
    for (const rate of [0.05, 0.075, 0.11, 0.16]) {
      const fp: P[] = [{ ...p0 }], fl: number[] = [0];
      let x = p0.x, y = p0.y, a = Math.atan2(me.seg[0].y - me.seg[3].y, me.seg[0].x - me.seg[3].x), ri = 0, ft = 0, stall = 0, okay = false;
      for (let n = 0; n < 1100 && stall < 140; n++) {
        const r0 = ri;
        while (ri < ref.length - 1 && Math.hypot(ref[ri].x - x, ref[ri].y - y) < look) ri++;
        stall = ri === r0 && ri < ref.length - 1 ? stall + 1 : 0;
        const tg = ref[ri], want = Math.atan2(tg.y - y, tg.x - x);
        a += Math.max(-rate, Math.min(rate, wrap(want - a)));
        const dM = Math.hypot(M.x - x, M.y - y);
        if (ri === ref.length - 1 && dM < st * 1.5) { ft += dM; fp.push({ x: M.x, y: M.y }); fl.push(ft); okay = true; break; }
        x += Math.cos(a) * st; y += Math.sin(a) * st; ft += st;
        fp.push({ x, y }); fl.push(ft);
      }
      if (okay) return { pts: fp, len: fl, total: ft, pos: 0, v: 4 * s, ox: 0, oy: 0, push: 0, nx: 0, ny: 0, fade: 1 };
    }
    return { pts, len, total, pos: 0, v: 4 * s, ox: 0, oy: 0, push: 0, nx: 0, ny: 0, fade: 1 };
  }
  private wayAt(w: Way, at: number): P {
    let i = 1;
    while (i < w.len.length - 1 && w.len[i] < at) i++;
    const a = w.pts[i - 1], b = w.pts[i], seg = w.len[i] - w.len[i - 1], u = seg > 0 ? (at - w.len[i - 1]) / seg : 1;
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
  }

  elapsed(t: number) { return t - this.t0; }
  // seconds left, for the countdown
  left(t: number) {
    const el = t - this.t0;
    if (this.clashed) return Math.max(0, Math.ceil(this.clashAt + EXIT - el));
    return Math.max(1, Math.ceil((this.ready ? this.ready + S2 + 0.8 + EXIT : 15) - el));
  }
  done(t: number) { const el = t - this.t0; return el > 26 || (this.clashed && el - this.clashAt >= EXIT); }
  // (Test hook) each head in line coordinates: [u0, v0, u1, v1], v measured from the middle lane
  uv(d: [Creature, Creature]) { return [this.u(0, d[0].seg[0]), this.v(d[0].seg[0]) - this.vB, this.u(1, d[1].seg[0]), this.v(d[1].seg[0]) - this.vB, this.lane[0], this.lane[1]]; }
  // (Test hook) which act is under way
  round(t: number) { const r = t - this.t0 - this.ready; return !this.ready ? -1 : r < G1 ? 0 : r < 7 ? 1 : r < G2 ? 2 : 3; }

  // (Kept for the walls list: the duel's line, which the choreography never crosses anyway.)
  wallsFor(k: 0 | 1, me: Creature) {
    const v = me.seg[0][this.axis] - this.mid;
    return v * this.sign[k] > 0 ? [this.ghost[k]] : [];
  }

  private acrossOf(p: P) {
    const b = this.box;
    return this.axis === "x" ? (p.y - b.y0 - 80) / Math.max(1, b.y1 - b.y0 - 160) : (p.x - b.x0 - 70) / Math.max(1, b.x1 - b.x0 - 140);
  }
  // the way toward the line from dragon k's side
  private lineDir(k: number) { return this.axis === "x" ? (this.sign[k] < 0 ? 0 : Math.PI) : this.sign[k] < 0 ? Math.PI / 2 : -Math.PI / 2; }

  // the part of the rival's neck and chest nearest this dragon's snout: where its fire is aimed
  static bodyAim(me: Creature, other: Creature): P {
    const sn = me.headPt(58, 0);
    let best = Infinity, at = other.seg[8];
    for (let i = 4; i <= 40; i += 2) {
      const q = other.seg[i], d = Math.hypot(q.x - sn.x, q.y - sn.y);
      if (d < best) { best = d; at = q; }
    }
    return { x: at.x, y: at.y };
  }

  private once(key: string) {
    if (this.done1.has(key)) return false;
    this.done1.add(key);
    return true;
  }
  private breathe(me: Creature, other: Creature, t: number, len: number, face = false) {
    me.breathLen = len;
    const aimer = face ? () => other.headPt(34, 0) : () => Duel.bodyAim(me, other);
    me.breatheAt(aimer(), t, 1.2, aimer);
  }

  // hold or ease toward (gu, gv) in line coordinates: toward the line by flying the head straight in
  private hold(k: number, me: Creature, gu: number, gv: number, su: number, sv: number, s: number) {
    const hd = me.seg[0], u = this.u(k, hd), v = this.v(hd), dl = this.lineDir(k), lat = this.latUnit();
    const fwd = { x: Math.cos(dl), y: Math.sin(dl) };
    // the head leans the way it is swaying, a little
    const lean = (f: number, l: number) => Math.atan2(fwd.y * Math.max(f, 4 * s) + lat.y * l * 0.6, fwd.x * Math.max(f, 4 * s) + lat.x * l * 0.6);
    // its motion along and across the line speeds up and slows down gradually
    const brake = (want: number, cur: number, acc: number) => { const stop = Math.sqrt(2 * acc * Math.abs(want)) * Math.sign(want); const tgt = Math.abs(stop) < Math.abs(want) ? stop : want; return cur + Math.max(-acc, Math.min(acc, tgt - cur)); };
    const V = this.vel[k];
    V.u = brake(Math.max(-su, Math.min(su, gu - u)), V.u, 0.32 * s);
    V.v = brake(Math.max(-sv, Math.min(sv, gv - v)), V.v, 0.28 * s);
    const du = V.u;
    if (du < -0.05) {
      const step = du, dv = V.v;
      const p = this.xy(k, u + step, v + dv);
      me.track(p.x, p.y, lean(-step, dv));
      return;
    }
    if (du > 0.05) me.retreat(du, dl);
    const h2 = me.seg[0], v2 = this.v(h2), dv = V.v;
    // sideways: the neck bends (a step of the head alone would be undone by the next rearing back)
    if (Math.abs(dv) > 0.05) me.sway(lat.x * dv, lat.y * dv, 230 * s);
    else if (du <= 0.05) me.track(h2.x, h2.y, dl);
  }

  // where a strike lands: between the striker's jaw and the nearest part of the other
  hitIdx: number[] = [];
  private contact(me: Creature, other: Creature): P {
    const j = me.headPt(46, 0), { i } = other.bodyGap(j), q = other.seg[Math.max(0, i)];
    this.hitIdx.push(i);
    return { x: (j.x + q.x) / 2, y: (j.y + q.y) / 2 };
  }

  private startLunge(k: number, el: number, s: number, final: boolean) {
    const dl = this.lineDir(k);
    this.mode[k] = "lunge";
    this.charging[k] = true;
    this.lunge[k] = { vx: Math.cos(dl) * 2 * s, vy: Math.sin(dl) * 2 * s, sp: 2 * s, passed: false, t0: el, final };
  }

  // a strike: it shoots down its lane past the other's head, then curves into its neck
  private stepLunge(k: 0 | 1, d: [Creature, Creature], el: number, s: number, fx: DuelFx) {
    const me = d[k], other = d[1 - k], L = this.lunge[k]!, hd = me.seg[0];
    // fast down the lane; in the last moment before contact it eases a little
    const near = L.passed ? me.faceGap(hd.x, hd.y, me.dirAt(0), [other]) : Infinity;
    L.sp = near < 40 * s ? Math.max(3 * s, L.sp * 0.86) : Math.min(11 * s, L.sp + 0.65 * s);
    const urh = this.u(k, other.seg[0]);
    if (!L.passed && this.u(k, hd) < urh - 48 * s) L.passed = true;
    const T = L.passed ? other.seg[12] : this.xy(k, urh - 220 * s, this.vB + this.lane[k]);
    const cur = Math.atan2(L.vy, L.vx), want = Math.atan2(T.y - hd.y, T.x - hd.x);
    const a = cur + Math.max(-(L.passed ? 0.12 : 0.05), Math.min(L.passed ? 0.12 : 0.05, wrap(want - cur)));
    L.vx = Math.cos(a) * L.sp; L.vy = Math.sin(a) * L.sp;
    const gapAt = (f: number) => { const x = hd.x + L.vx * f, y = hd.y + L.vy * f; return me.faceGap(x, y, me.dirAfter(x, y), [other]); };
    if (gapAt(1) < 2 * s) {
      // contact: it goes only as far as touching
      let lo = 0, hi = 1;
      for (let n = 0; n < 7; n++) { const m = (lo + hi) / 2; if (gapAt(m) < 2 * s) hi = m; else lo = m; }
      me.track(hd.x + L.vx * lo, hd.y + L.vy * lo);
      this.impact(k, d, el, s, fx);
      return;
    }
    me.track(hd.x + L.vx, hd.y + L.vy);
    // (It never fails to land in practice; if it somehow has not within a moment and a half, it draws back.)
    if (el - L.t0 > 1.6) {
      if (L.final) this.impact(k, d, el, s, fx, true);
      else { this.mode[k] = "hold"; this.charging[k] = false; this.knocked = true; this.recoilAt = el; }
    }
  }

  private impact(k: 0 | 1, d: [Creature, Creature], el: number, s: number, fx: DuelFx, forced = false) {
    const me = d[k], other = d[1 - k], L = this.lunge[k];
    const p = forced ? { x: (me.seg[0].x + other.seg[0].x) / 2, y: (me.seg[0].y + other.seg[0].y) / 2 } : this.contact(me, other);
    if (L && L.final) {
      // the clash: both are thrown apart and glide on past each other
      if (!this.clashed) { this.clashed = true; this.clashAt = el; this.meetAt = p; fx.clash(p); }
      for (const j of [0, 1] as const) {
        const Lj = this.lunge[j], dl = this.lineDir(j);
        // it carries on the way it was moving (only the part pressing into the other is taken off)
        const vx = Lj ? Lj.vx : Math.cos(dl) * 3 * s, vy = Lj ? Lj.vy : Math.sin(dl) * 3 * s;
        const sp = Math.max(3 * s, Math.hypot(vx, vy)), a = Math.atan2(vy, vx);
        this.exitV[j] = { x: Math.cos(a) * sp, y: Math.sin(a) * sp };
        this.mode[j] = "exit";
        this.charging[j] = false;
        d[j].turnBoost = 1;
      }
      return;
    }
    // the first strike: the one struck is knocked aside, the striker recoils
    this.knocked = true;
    this.recoilAt = el;
    this.hitAt[1 - k] = el;
    other.flinchAt = other.time;
    this.mode[k] = "hold";
    this.charging[k] = false;
    this.vel[k] = { u: 0, v: 0 };
    fx.knock(p);
  }

  // after the clash: thrown apart, then gliding on, curving gently away from each other
  private stepExit(k: 0 | 1, d: [Creature, Creature], el: number, s: number) {
    const me = d[k], hd = me.seg[0], V = this.exitV[k], dl = this.lineDir(k), lat = this.latUnit();
    const side = Math.sign(this.lane[k] - this.lane[1 - k]) || 1, since = el - this.clashAt;
    const wantA = Math.atan2(Math.sin(dl) * Math.cos(1.0) + lat.y * side * Math.sin(1.0), Math.cos(dl) * Math.cos(1.0) + lat.x * side * Math.sin(1.0));
    let sp = Math.hypot(V.x, V.y), a = Math.atan2(V.y, V.x);
    // the turn away eases in
    const rate = 0.02 + 0.045 * Math.min(1, since / 0.18);
    a += Math.max(-rate, Math.min(rate, wrap(wantA - a) * 0.1));
    sp += (3.2 * s - sp) * 0.05;
    V.x = Math.cos(a) * sp; V.y = Math.sin(a) * sp;
    // thrown apart by the clash: a push away from the other that builds within a few steps and then fades
    const kick = 5.5 * s * bump(since, 0.06, 0.7);
    const mx = V.x + lat.x * side * kick, my = V.y + lat.y * side * kick;
    me.track(hd.x + mx, hd.y + my);
  }

  // moves dragon k for this step (its head is placed directly; its body follows as always)
  drive(k: 0 | 1, t: number, d: [Creature, Creature], s: number, fx: DuelFx) {
    const me = d[k], other = d[1 - k], el = t - this.t0;
    // taking position: along its curve, easing up to speed
    const w = this.way[k];
    if (this.mode[k] === "way" && w) {
      me.glance = null;
      const v = Math.min(w.v, Math.max(me.speed, 2 * s) + 0.15 * s);
      // while it is easing round the other it goes on more slowly along its route
      w.pos = Math.min(w.total, w.pos + v * (1 - 0.6 * Math.min(1, w.push / (2.2 * s))));
      const q = this.wayAt(w, w.pos);
      // passing the other on the way (they can start tangled): it eases aside around the other's body
      const keep = 40 * s;
      // the offset fades out over the last stretch of the route
      const fadeWant = w.push > 0.05 * s ? 1 : Math.min(1, (w.total - w.pos) / (160 * s));
      w.fade += Math.max(-0.02, Math.min(0.02, fadeWant - w.fade));
      const fade = w.fade;
      let p = { x: q.x + w.ox * fade, y: q.y + w.oy * fade };
      const g = me.faceGap(p.x, p.y, me.dirAfter(p.x, p.y), [other]);
      // the push aside builds up and dies away smoothly (its rate eases), so the path never zigzags
      const want = g < keep ? Math.min(2.2 * s, (keep - g) * 0.35) : 0;
      w.push += (want - w.push) * 0.35;
      if (w.push > 0.02 * s) {
        const b = other.bodyGap(p, 0, true);
        const nx = p.x - b.x, ny = p.y - b.y, nl = Math.hypot(nx, ny) || 1;
        // (The direction of the push is smoothed too, so it cannot flip from step to step.)
        w.nx += (nx / nl - w.nx) * 0.2; w.ny += (ny / nl - w.ny) * 0.2;
        const nn = Math.hypot(w.nx, w.ny) || 1;
        w.ox += (w.nx / nn) * w.push; w.oy += (w.ny / nn) * w.push;
        const om = Math.hypot(w.ox, w.oy), cap = 240 * s;
        if (om > cap) { w.ox *= cap / om; w.oy *= cap / om; }
        p = { x: q.x + w.ox * fade, y: q.y + w.oy * fade };
      } else { w.ox *= 0.985; w.oy *= 0.985; }
      // still pressing into the other's body even so (it lies right across the route): it waits for the way to clear
      {
        const hd = me.seg[0], gp = me.faceGap(p.x, p.y, me.dirAfter(p.x, p.y), [other]);
        if (gp < 6 * s && gp < me.faceGap(hd.x, hd.y, me.dirAt(0), [other])) {
          const b = other.bodyGap(hd, 0, true), nx = hd.x - b.x, ny = hd.y - b.y, nl = Math.hypot(nx, ny) || 1;
          const f = Math.min(1, (6 * s - gp) / (12 * s));
          p = { x: p.x + (hd.x + (nx / nl) * 1.2 * s - p.x) * f, y: p.y + (hd.y + (ny / nl) * 1.2 * s - p.y) * f };
          w.pos = Math.max(0, w.pos - v * 0.7 * f);
        }
      }
      if (this.wlog[k].length < 600) this.wlog[k].push([+el.toFixed(3), q.x, q.y, w.ox, w.oy, w.push, fade, p.x, p.y, w.pos, w.total]);
      me.track(p.x, p.y);
      if (w.pos >= w.total && (w.fade < 0.02 || Math.hypot(w.ox, w.oy) * w.fade < 1.5 * s || el > 10)) { this.mode[k] = "hold"; this.lined[k] = true; this.vel[k] = { u: 0, v: 0 }; }
      return;
    }
    me.glance = other.seg[0];
    if (!this.ready) {
      if (this.lined[0] && this.lined[1]) this.ready = el;
      else { this.hold(k, me, STANCE * s + Math.sin(t * 1.3 + k * 2) * 8 * s, this.vB, 1.2 * s, 1 * s, s); return; }
    }
    const r = el - this.ready, A = this.attacker;
    if (this.mode[k] === "lunge") { this.stepLunge(k, d, el, s, fx); return; }
    if (this.mode[k] === "exit") { this.stepExit(k, d, el, s); return; }
    // fire
    if (r > 0.3 && k === A && this.once("a")) this.breathe(me, other, t, 0.95);
    if (r > 1.5 && k !== A && this.once("b")) this.breathe(me, other, t, 0.95);
    if (r > 5.6 && k !== A && this.once("c")) this.breathe(me, other, t, 1.0);
    if (r > 6.0 && k === A && this.once("d")) this.breathe(me, other, t, 1.0);
    if (r > 7.3 && this.once("s" + k)) this.breathe(me, other, t, 1.8, true);
    // where it wants its head: at its mark, swaying a little
    let gu = STANCE * s + Math.sin(t * 1.3 + k * 2) * 10 * s, gv = this.vB, su = 1.4 * s, sv = 1.2 * s;
    const hd = me.seg[0], u = this.u(k, hd), v = this.v(hd);
    const gather = (r >= G1 && r < S1 && !this.knocked) || (r >= G2 && r < S2 && !this.clashed);
    if (gather) {
      // gathering its strength: it coils back and weaves from side to side, settling into its lane
      const ph = r < G2 ? 1 : 2;
      if (this.once("lane" + ph)) { const ls = Math.random() < 0.5 ? 1 : -1; this.lane = [ls * LANE * s, -ls * LANE * s]; }
      if (this.once("g" + ph + k)) fx.snort(me);
      const g2 = r >= G2, before = (g2 ? S2 : S1) - r;
      gu = (g2 ? 320 : 290) * s + Math.sin(t * 2.3 + k) * 10 * s * Math.min(1, Math.max(0, before - 0.35) * 3);
      // the coiled moment before it strikes: it comes to rest
      if (before < 0.35) gu = u;
      gv = this.vB + this.lane[k] + Math.sin(t * 3.4 + k * Math.PI) * 18 * s * Math.min(1, (r - (g2 ? G2 : G1)) * 2);
      su = 3.6 * s; sv = 2.2 * s;
    }
    if (r >= S1 && !this.knocked) {
      if (k === A) { if (this.once("L1")) { this.startLunge(k, el, s, false); this.stepLunge(k, d, el, s, fx); return; } }
      else { gu = 280 * s; gv = this.vB + this.lane[k]; su = 2 * s; sv = 1.5 * s; }
    }
    if (r >= S2 && !this.clashed && this.once("L2" + k)) { this.startLunge(k, el, s, true); this.stepLunge(k, d, el, s, fx); return; }
    // struck: knocked aside and back, fading fast
    const hit = el - this.hitAt[k];
    if (hit < 0.7) {
      const q = bump(hit, 0.12, 0.7), side = Math.sign(this.lane[k] - this.lane[1 - k]) || 1;
      gu = u + 45 * s; gv = v + side * 60 * s; su = (0.3 + 4 * q) * s; sv = (0.3 + 4 * q) * s;
    }
    // the striker recoils: it eases to a stop against the other, then draws back briskly, then slows
    const rec = el - this.recoilAt;
    if (k === A && rec < 1.2) su = Math.min(su, 0.2 * s) + (rec < 0.08 ? 0 : (1.2 + 5 * bump(rec - 0.08, 0.15, 1.1)) * s);
    // hit by fire just now: it jerks back a little
    if (me.flinchAt > t - 0.5) { gu = Math.max(gu, u + 30 * s); su = Math.max(su, 2.4 * s * bump(t - me.flinchAt, 0.12, 0.5)); }
    this.hold(k, me, gu, gv, su, sv, s);
  }

  // fire from one dragon reaching the other: it flinches once per breath (not once per spark
  static hits(sparks: Spark[], d: [Creature, Creature], onHit: (k: number, p: P, first: boolean) => void) {
    // bounding box of each body, so most sparks are rejected without measuring against every section
    const bb = d.map((c) => {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const q of c.seg) { if (q.x < x0) x0 = q.x; if (q.x > x1) x1 = q.x; if (q.y < y0) y0 = q.y; if (q.y > y1) y1 = q.y; }
      const m = 30 * c.s;
      return { x0: x0 - m, y0: y0 - m, x1: x1 + m, y1: y1 + m };
    });
    for (let j = sparks.length - 1; j >= 0; j--) {
      const p = sparks[j];
      if (p.smoke || p.fx || p.own === undefined) continue;
      const tgt = d[1 - p.own], b = bb[1 - p.own];
      if (tgt.alpha < 0.5 || p.x < b.x0 || p.x > b.x1 || p.y < b.y0 || p.y > b.y1) continue;
      if (tgt.bodyGap(p, 0).gap > 0) continue;
      sparks.splice(j, 1);
      const first = tgt.flinchBid !== (p.bid ?? -1) + p.own * 1e6;
      if (first) {
        tgt.flinchBid = (p.bid ?? -1) + p.own * 1e6;
        tgt.flinchAt = tgt.time;
        tgt.turnBoost = Math.max(tgt.turnBoost, 0.6);
      }
      onHit(1 - p.own, p, first);
    }
  }
}

// where the two dragons' fire meets: sparks from opposite dragons that touch both burst
export function fireMeets(sparks: Spark[], s: number, onMeet: (x: number, y: number) => void) {
  const cell = 26 * s, grid = new Map<number, Spark[]>();
  const key = (x: number, y: number) => Math.floor(x / cell) * 100003 + Math.floor(y / cell);
  for (const p of sparks) if (!p.smoke && !p.fx && p.own === 1) {
    const k = key(p.x, p.y);
    const g = grid.get(k);
    if (g) g.push(p); else grid.set(k, [p]);
  }
  if (!grid.size) return;
  const gone = new Set<Spark>();
  for (const p of sparks) {
    if (p.smoke || p.fx || p.own !== 0 || gone.has(p)) continue;
    const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell);
    search: for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const g = grid.get((cx + i) * 100003 + cy + j);
      if (!g) continue;
      for (const q of g) {
        if (gone.has(q) || Math.hypot(p.x - q.x, p.y - q.y) > 16 * s) continue;
        gone.add(p); gone.add(q);
        onMeet((p.x + q.x) / 2, (p.y + q.y) / 2);
        break search;
      }
    }
  }
  if (gone.size) for (let k = sparks.length - 1; k >= 0; k--) if (gone.has(sparks[k])) sparks.splice(k, 1);
}
