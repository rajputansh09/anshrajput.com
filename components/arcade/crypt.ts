// Crypt Raider, rebuilt for the browser from the Unreal C++ (UGrabber, UMover, UTrigger_Component)
import { C, Fx, W, H, banner, box, circleOut, clamp, fmt, inRect, label, painted, seeded, vignette, type Game, type Input, type Rect, type State, type V } from "./core";
import { sfx } from "./sfx";

const SPEED = 190, PR = 14;
const MAX_GRAB = 90, GRAB_R = 26, HOLD = 56;
const MOVE_TIME = 1.5;

type Tag = "gargoyle" | "urn" | "skull" | "statue";
type Item = { id: string; tag: Tag; x: number; y: number; r: number; held: boolean; on: Plate | null; name: string };
type Gate = Rect & { ox: number; oy: number; offY: number; should: boolean; moving: boolean };
type Plate = Rect & { tag: Tag; gate: number; item: Item | null };
type Spikes = Rect & { cycle: number; ph: number };
type Level = {
  name: string; sub: string; start: V; walls: Rect[]; gates: Omit<Gate, "ox" | "oy" | "should" | "moving">[]; plates: Omit<Plate, "item">[];
  items: Omit<Item, "held" | "on" | "id">[]; spikes: Spikes[]; exit: Rect; altar: Rect; torches: [number, number][]; light: number; deaths: number; time: number;
};

const border = (): Rect[] => [{ x: 0, y: 0, w: W, h: 20 }, { x: 0, y: H - 20, w: W, h: 20 }, { x: 0, y: 0, w: 20, h: H }, { x: W - 20, y: 0, w: 20, h: H }];
const NAMES: Record<Tag, string> = { gargoyle: "Gargoyle", urn: "Urn", skull: "Skull", statue: "Golden statue" };
const SIZE: Record<Tag, number> = { gargoyle: 17, urn: 14, skull: 13, statue: 15 };

export const LEVELS: Level[] = [
  {
    name: "The Tomb", sub: "Two plates, two gates, one row of spikes.", start: { x: 70, y: 270 },
    walls: [...border(),
      { x: 400, y: 20, w: 24, h: 200 }, { x: 400, y: 320, w: 24, h: 200 }, { x: 700, y: 20, w: 24, h: 360 }, { x: 700, y: 480, w: 24, h: 40 },
      { x: 180, y: 190, w: 44, h: 44 }, { x: 300, y: 330, w: 44, h: 44 }],
    gates: [{ x: 400, y: 220, w: 24, h: 100, offY: -100 }, { x: 700, y: 380, w: 24, h: 100, offY: -100 }],
    plates: [{ x: 300, y: 430, w: 60, h: 60, tag: "gargoyle", gate: 0 }, { x: 600, y: 420, w: 60, h: 60, tag: "urn", gate: 1 }],
    items: [{ tag: "gargoyle", x: 110, y: 110, r: 17, name: "Gargoyle" }, { tag: "urn", x: 90, y: 460, r: 14, name: "Urn" }, { tag: "statue", x: 625, y: 95, r: 15, name: "Golden statue" }],
    spikes: [{ x: 480, y: 20, w: 56, h: H - 40, cycle: 2.4, ph: 0 }],
    exit: { x: 830, y: 400, w: 90, h: 100 }, altar: { x: 590, y: 70, w: 70, h: 50 },
    torches: [[40, 40], [380, 40], [440, 500], [680, 40], [740, 500], [920, 250]], light: 190, deaths: 0, time: 25,
  },
  {
    name: "The Ossuary", sub: "Carry the urn back across the spikes. Two rows now, out of step.", start: { x: 70, y: 270 },
    walls: [...border(),
      { x: 300, y: 20, w: 24, h: 180 }, { x: 300, y: 300, w: 24, h: 220 }, { x: 620, y: 20, w: 24, h: 280 }, { x: 620, y: 400, w: 24, h: 120 },
      { x: 150, y: 250, w: 40, h: 40 }, { x: 520, y: 380, w: 40, h: 40 }],
    gates: [{ x: 300, y: 200, w: 24, h: 100, offY: -100 }, { x: 620, y: 300, w: 24, h: 100, offY: -100 }],
    plates: [{ x: 200, y: 420, w: 60, h: 60, tag: "gargoyle", gate: 0 }, { x: 200, y: 60, w: 60, h: 60, tag: "urn", gate: 1 }],
    items: [{ tag: "gargoyle", x: 90, y: 440, r: 17, name: "Gargoyle" }, { tag: "urn", x: 560, y: 80, r: 14, name: "Urn" }, { tag: "statue", x: 870, y: 80, r: 15, name: "Golden statue" }],
    spikes: [{ x: 400, y: 20, w: 56, h: H - 40, cycle: 2.4, ph: 0 }, { x: 644, y: 240, w: 276, h: 50, cycle: 2.0, ph: 1.0 }],
    exit: { x: 830, y: 420, w: 90, h: 90 }, altar: { x: 835, y: 55, w: 70, h: 50 },
    torches: [[40, 40], [280, 500], [344, 40], [600, 500], [664, 40], [920, 500]], light: 170, deaths: 1, time: 40,
  },
  {
    name: "The Deep Crypt", sub: "Three plates in the dark. Bring the skull back across to open the way out.", start: { x: 60, y: 270 },
    walls: [...border(),
      { x: 260, y: 20, w: 24, h: 200 }, { x: 260, y: 320, w: 24, h: 200 }, { x: 560, y: 20, w: 24, h: 200 }, { x: 560, y: 320, w: 24, h: 200 },
      { x: 584, y: 380, w: 120, h: 24 }, { x: 150, y: 250, w: 36, h: 36 }, { x: 860, y: 250, w: 40, h: 40 }],
    gates: [{ x: 260, y: 220, w: 24, h: 100, offY: -100 }, { x: 560, y: 220, w: 24, h: 100, offY: -100 }, { x: 704, y: 404, w: 24, h: 96, offY: 96 }],
    plates: [{ x: 150, y: 420, w: 60, h: 60, tag: "gargoyle", gate: 0 }, { x: 450, y: 50, w: 60, h: 60, tag: "urn", gate: 1 }, { x: 640, y: 140, w: 60, h: 60, tag: "skull", gate: 2 }],
    items: [{ tag: "gargoyle", x: 80, y: 90, r: 17, name: "Gargoyle" }, { tag: "urn", x: 500, y: 470, r: 14, name: "Urn" }, { tag: "skull", x: 900, y: 470, r: 13, name: "Skull" }, { tag: "statue", x: 885, y: 80, r: 15, name: "Golden statue" }],
    spikes: [{ x: 330, y: 20, w: 50, h: H - 40, cycle: 2.2, ph: 0 }, { x: 400, y: 250, w: 160, h: 46, cycle: 2.0, ph: 0.9 }, { x: 750, y: 20, w: 50, h: H - 40, cycle: 2.6, ph: 1.3 }],
    exit: { x: 600, y: 420, w: 90, h: 90 }, altar: { x: 850, y: 50, w: 70, h: 50 },
    torches: [[40, 40], [240, 500], [304, 40], [540, 500], [604, 40], [920, 260]], light: 145, deaths: 2, time: 55,
  },
];

// flagstones, cracks, moss and bones, painted once per crypt; walls are brick with a lit top edge
const floors: (HTMLCanvasElement | null)[] = [];
function floor(lv: number) {
  if (floors[lv] !== undefined) return floors[lv];
  const L = LEVELS[lv], r = seeded(23 + lv * 13);
  floors[lv] = painted((c) => {
    c.fillStyle = "#16191a"; c.fillRect(0, 0, W, H);
    for (let y = 20; y < H - 20; y += 40) for (let x = 20 + ((y / 40) % 2) * 20; x < W - 20; x += 40) {
      const v = 30 + Math.floor(r() * 10);
      c.fillStyle = `rgb(${v},${v + 4},${v + 2})`; c.fillRect(x + 1, y + 1, 38, 38);
      if (r() < 0.25) { c.strokeStyle = "rgba(0,0,0,0.45)"; c.lineWidth = 1; c.beginPath(); c.moveTo(x + r() * 38, y + 2); c.lineTo(x + 10 + r() * 20, y + 20); c.lineTo(x + r() * 38, y + 38); c.stroke(); }
      if (r() < 0.12) { c.fillStyle = "rgba(70,110,60,0.25)"; c.beginPath(); c.arc(x + r() * 38, y + r() * 38, 4 + r() * 8, 0, Math.PI * 2); c.fill(); }
    }
    // scattered bones
    c.strokeStyle = "rgba(210,200,180,0.25)"; c.lineWidth = 2.5; c.lineCap = "round";
    for (let k = 0; k < 18; k++) { const x = 40 + r() * (W - 80), y = 40 + r() * (H - 80), a = r() * 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12); c.stroke(); }
    for (const wl of L.walls) {
      c.fillStyle = "#2d3230"; c.fillRect(wl.x, wl.y, wl.w, wl.h);
      c.strokeStyle = "rgba(0,0,0,0.35)"; c.lineWidth = 1;
      for (let y = wl.y + 10; y < wl.y + wl.h; y += 10) {
        c.beginPath(); c.moveTo(wl.x, y); c.lineTo(wl.x + wl.w, y); c.stroke();
        for (let x = wl.x + ((y / 10) % 2) * 9; x < wl.x + wl.w; x += 18) { c.beginPath(); c.moveTo(x, y - 10); c.lineTo(x, y); c.stroke(); }
      }
      c.fillStyle = "#454d49"; c.fillRect(wl.x, wl.y, wl.w, Math.min(5, wl.h));
    }
    // cobwebs in the corners
    c.strokeStyle = "rgba(220,225,220,0.12)"; c.lineWidth = 1;
    for (const [x, y, sx, sy] of [[20, 20, 1, 1], [W - 20, 20, -1, 1], [20, H - 20, 1, -1], [W - 20, H - 20, -1, -1]]) {
      for (let k = 1; k <= 3; k++) { c.beginPath(); c.moveTo(x + sx * 14 * k, y); c.quadraticCurveTo(x + sx * 8 * k, y + sy * 8 * k, x, y + sy * 14 * k); c.stroke(); }
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + sx * 46, y + sy * 46); c.stroke();
    }
  });
  return floors[lv];
}

export class Crypt implements Game {
  state: State = "play";
  level: number;
  L: Level;
  p = { x: 70, y: 270, fx: 1, fy: 0, walk: 0 };
  safe = { x: 70, y: 270 };
  items: Item[] = [];
  gates: Gate[] = [];
  plates: Plate[] = [];
  held: Item | null = null;
  t = 0;
  deaths = 0;
  dead = 0;
  fx = new Fx();
  mask: HTMLCanvasElement | null = null;
  wasUp: boolean[] = [];
  constructor(level = 0) { this.level = clamp(level, 0, LEVELS.length - 1); this.L = LEVELS[this.level]; this.reset(); }
  reset() {
    const L = this.L;
    this.state = "play"; this.t = 0; this.deaths = 0; this.dead = 0; this.held = null; this.fx = new Fx();
    this.p = { x: L.start.x, y: L.start.y, fx: 1, fy: 0, walk: 0 };
    this.safe = { ...L.start };
    this.gates = L.gates.map((g) => ({ ...g, ox: g.x, oy: g.y, should: false, moving: false }));
    this.plates = L.plates.map((p) => ({ ...p, item: null }));
    this.items = L.items.map((it, k) => ({ ...it, r: SIZE[it.tag], name: NAMES[it.tag], id: `${it.tag}${k}`, held: false, on: null }));
    this.wasUp = L.spikes.map(() => false);
  }
  spikeUp(s: Spikes) { return ((this.t + s.ph) % s.cycle) < s.cycle / 2; }
  solids(): Rect[] { return [...this.L.walls, ...this.gates]; }
  step(dt: number, inp: Input) {
    this.fx.step(dt);
    // uMover: each gate moves toward its offset (or back) at constant speed
    for (const g of this.gates) {
      const ty = g.should ? g.oy + g.offY : g.oy, sp = (Math.abs(g.offY) / MOVE_TIME) * dt;
      const before = g.y;
      g.y = Math.abs(ty - g.y) <= sp ? ty : g.y + Math.sign(ty - g.y) * sp;
      const moving = g.y !== before;
      if (moving && !g.moving) sfx.play("gate");
      if (moving && Math.random() < dt * 20) this.fx.smoke(g.x + g.w / 2, g.offY < 0 ? g.y + g.h : g.y, 1, "rgba(120,110,95,1)", 6, -10);
      g.moving = moving;
    }
    if (this.state !== "play") return;
    this.t += dt;
    // spikes snap up: a metallic hiss if you are near
    this.L.spikes.forEach((s, k) => {
      const up = this.spikeUp(s);
      if (up && !this.wasUp[k] && inRect(this.p.x, this.p.y, s, 160)) sfx.play("spike");
      this.wasUp[k] = up;
    });
    if (this.dead > 0) { this.dead -= dt; if (this.dead <= 0) this.respawn(); return; }
    const p = this.p;
    let ax = inp.ax, ay = inp.ay;
    const m = Math.hypot(ax, ay);
    if (m > 1) { ax /= m; ay /= m; }
    const slow = this.held ? 0.82 : 1;
    const pos = { x: p.x + ax * SPEED * slow * dt, y: p.y + ay * SPEED * slow * dt };
    for (const r of this.solids()) circleOut(pos, PR, r);
    for (const it of this.items) if (!it.held) { const d = Math.hypot(pos.x - it.x, pos.y - it.y); if (d < PR + it.r && d > 0) { pos.x = it.x + ((pos.x - it.x) / d) * (PR + it.r); pos.y = it.y + ((pos.y - it.y) / d) * (PR + it.r); } }
    const step = Math.hypot(pos.x - p.x, pos.y - p.y);
    p.walk += step;
    p.x = pos.x; p.y = pos.y;
    // facing: toward the pointer when there is one, the aim stick on touch, otherwise the way you walk
    if (inp.aimed) { const d = Math.hypot(inp.aimX - p.x, inp.aimY - p.y); if (d > 4) { p.fx = (inp.aimX - p.x) / d; p.fy = (inp.aimY - p.y) / d; } }
    else if (Math.hypot(inp.bx, inp.by) > 0.35) { const d = Math.hypot(inp.bx, inp.by); p.fx = inp.bx / d; p.fy = inp.by / d; }
    else if (m > 0.2) { p.fx = ax / Math.hypot(ax, ay); p.fy = ay / Math.hypot(ax, ay); }
    // grab on press, release on let go
    if (inp.fire && !this.held) this.grab();
    if (!inp.fire && this.held) this.release();
    if (this.held) {
      // the physics handle pulls the item toward the hold point, but walls stop it
      const it = this.held, tx = p.x + p.fx * HOLD, ty = p.y + p.fy * HOLD;
      const q = { x: it.x + (tx - it.x) * Math.min(1, dt * 14), y: it.y + (ty - it.y) * Math.min(1, dt * 14) };
      for (const r of this.solids()) circleOut(q, it.r, r);
      it.x = q.x; it.y = q.y;
      if (Math.hypot(it.x - p.x, it.y - p.y) > HOLD + 50) this.release();
    }
    // uTrigger_Component: a plate takes an acceptable item that is not being held
    for (const pl of this.plates) {
      if (pl.item && (pl.item.held || !inRect(pl.item.x, pl.item.y, pl))) { pl.item.on = null; pl.item = null; }
      if (!pl.item) {
        const it = this.items.find((i) => i.tag === pl.tag && !i.held && inRect(i.x, i.y, pl, 6));
        if (it) {
          pl.item = it; it.on = pl; it.x = pl.x + pl.w / 2; it.y = pl.y + pl.h / 2;
          this.fx.burst(it.x, it.y, C.brass, 18, 170, 0, 2.5); this.fx.ring(it.x, it.y, 50, "rgba(240,215,154,1)", 0.5, 3);
          sfx.play("plate");
        }
      }
      this.gates[pl.gate].should = !!pl.item;
    }
    // spikes
    let inSpikes = false;
    for (const s of this.L.spikes) {
      if (inRect(p.x, p.y, s, PR + 2)) inSpikes = true;
      if (this.spikeUp(s) && inRect(p.x, p.y, s, -4)) { this.die(); return; }
    }
    if (!inSpikes) { this.safe.x = p.x; this.safe.y = p.y; }
    // out with the golden statue
    const statue = this.items.find((i) => i.tag === "statue")!;
    if (inRect(statue.x, statue.y, this.L.exit) && inRect(p.x, p.y, this.L.exit, 30)) {
      this.state = "won";
      this.fx.burst(statue.x, statue.y, C.brass, 70, 330, 0, 3); this.fx.ring(statue.x, statue.y, 140, "rgba(240,215,154,1)");
      sfx.play("win");
    }
  }
  grab() {
    // sweepSingleByChannel: a sphere of GrabRadius from you out to MaxGrabDistance
    const p = this.p;
    let best: Item | null = null, bestT = Infinity;
    for (const it of this.items) {
      const vx = it.x - p.x, vy = it.y - p.y, along = vx * p.fx + vy * p.fy;
      if (along < -it.r || along > MAX_GRAB + it.r) continue;
      const side = Math.abs(vx * p.fy - vy * p.fx);
      if (side < GRAB_R + it.r && along < bestT) { best = it; bestT = along; }
    }
    if (best) { best.held = true; this.held = best; sfx.play("grab"); this.fx.burst(best.x, best.y, C.moss, 8, 90, 0, 2); }
  }
  release() { if (this.held) { this.held.held = false; this.held = null; sfx.play("drop"); } }
  die() {
    this.fx.burst(this.p.x, this.p.y, C.danger, 30, 260, 0, 3);
    this.fx.chunks(this.p.x, this.p.y, "#8a2a22", 8, 160, 0, 4);
    this.fx.decal(this.p.x, this.p.y, 16, "rgba(90,10,10,0.5)", 10);
    this.fx.shake = 0.8;
    this.deaths++;
    this.dead = 0.6;
    this.release();
    sfx.play("die");
  }
  respawn() {
    // back where you last stood clear of the spikes
    this.p.x = this.safe.x; this.p.y = this.safe.y;
    this.fx.burst(this.p.x, this.p.y, C.moss, 14, 120, 0, 2);
  }
  draw(c: CanvasRenderingContext2D, t: number) {
    const L = this.L, o = this.fx.offset();
    c.save(); c.translate(o.x, o.y);
    const f = floor(this.level);
    if (f) c.drawImage(f, 0, 0); else { c.fillStyle = "#16191a"; c.fillRect(-20, -20, W + 40, H + 40); }
    this.fx.drawUnder(c);
    // spikes, with a warning glow in the moment before they rise
    for (const s of L.spikes) {
      // game time (this.t), the same clock the collision check uses, so what you see is what hurts
      const ph = (this.t + s.ph) % s.cycle, up = ph < s.cycle / 2, warn = !up && ph > s.cycle - 0.45;
      c.fillStyle = up ? "rgba(240,140,122,0.16)" : warn ? `rgba(240,140,122,${0.06 + Math.sin(t * 40) * 0.04})` : "rgba(0,0,0,0.28)";
      c.fillRect(s.x, s.y, s.w, s.h);
      for (let y = s.y + 10; y < s.y + s.h; y += 20) for (let x = s.x + 9; x < s.x + s.w; x += 18) {
        if (up) {
          c.fillStyle = "rgba(0,0,0,0.4)"; c.beginPath(); c.moveTo(x - 3, y + 6); c.lineTo(x + 5, y - 6); c.lineTo(x + 6, y + 6); c.fill();
          c.fillStyle = "#c9d1cc"; c.beginPath(); c.moveTo(x - 5, y + 5); c.lineTo(x, y - 9); c.lineTo(x + 5, y + 5); c.fill();
          c.fillStyle = "#f4f7f5"; c.beginPath(); c.moveTo(x - 1, y + 2); c.lineTo(x, y - 9); c.lineTo(x + 1.5, y + 2); c.fill();
        } else { c.fillStyle = "#3a3f3c"; c.beginPath(); c.arc(x, y, 2.5, 0, Math.PI * 2); c.fill(); }
      }
    }
    // altar, exit stairs, plates
    c.fillStyle = "rgba(0,0,0,0.35)"; box(c, L.altar.x + 4, L.altar.y + 6, L.altar.w, L.altar.h, 6); c.fill();
    c.fillStyle = "#4a3f31"; box(c, L.altar.x, L.altar.y, L.altar.w, L.altar.h, 6); c.fill();
    c.fillStyle = "#5e5140"; c.fillRect(L.altar.x + 4, L.altar.y + 4, L.altar.w - 8, 6);
    const ex = L.exit;
    for (let k = 0; k < 4; k++) { c.fillStyle = `rgb(${50 - k * 8},${110 - k * 18},${74 - k * 12})`; c.fillRect(ex.x + 6, ex.y + 8 + k * 22, ex.w - 12 - k * 10, 16); }
    c.fillStyle = `rgba(111,207,151,${0.12 + Math.sin(t * 3) * 0.05})`; c.fillRect(ex.x, ex.y, ex.w, ex.h);
    label(c, "EXIT", ex.x + ex.w / 2, ex.y - 12, 12, C.moss, "center", 700);
    for (const pl of this.plates) {
      const on = !!pl.item;
      c.fillStyle = on ? "#4f5a35" : "#353a32"; box(c, pl.x, pl.y, pl.w, pl.h, 8); c.fill();
      c.strokeStyle = on ? C.brass : "#55604f"; c.lineWidth = 2; box(c, pl.x + 6, pl.y + 6, pl.w - 12, pl.h - 12, 6); c.stroke();
      if (on) { c.fillStyle = `rgba(240,215,154,${0.12 + Math.sin(t * 4) * 0.05})`; box(c, pl.x - 4, pl.y - 4, pl.w + 8, pl.h + 8, 10); c.fill(); }
      if (!on) this.icon(c, pl.tag, pl.x + pl.w / 2, pl.y + pl.h / 2, 0.55, true);
    }
    // gates: iron portcullis bars
    for (const g of this.gates) {
      c.fillStyle = "rgba(0,0,0,0.35)"; c.fillRect(g.x + 6, g.y + 4, g.w - 6, g.h);
      c.fillStyle = "#4b3d2a"; c.fillRect(g.x + 2, g.y, g.w - 4, g.h);
      c.fillStyle = "#7a6444"; for (let y = g.y + 6; y < g.y + g.h; y += 14) c.fillRect(g.x + 2, y, g.w - 4, 3);
      c.fillStyle = "#2b2219"; for (let x = g.x + 6; x < g.x + g.w - 2; x += 7) c.fillRect(x, g.y, 2, g.h);
    }
    // walls on top (they hide gates that have slid away)
    for (const wl of L.walls) { c.fillStyle = "#2d3230"; c.fillRect(wl.x, wl.y, wl.w, wl.h); c.fillStyle = "#454d49"; c.fillRect(wl.x, wl.y, wl.w, Math.min(5, wl.h)); }
    // items
    for (const it of this.items) {
      c.fillStyle = "rgba(0,0,0,0.4)"; c.beginPath(); c.ellipse(it.x + 3, it.y + 6, it.r, it.r * 0.75, 0, 0, Math.PI * 2); c.fill();
      this.icon(c, it.tag, it.x, it.y, 1, false, t);
    }
    // player and the grab beam
    const p = this.p;
    if (this.dead <= 0) {
      if (this.held) {
        c.save(); c.globalCompositeOperation = "lighter";
        c.strokeStyle = "rgba(111,207,151,0.35)"; c.lineWidth = 5; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(this.held.x, this.held.y); c.stroke();
        c.strokeStyle = "rgba(180,255,210,0.7)"; c.lineWidth = 1.5; c.setLineDash([3, 5]); c.lineDashOffset = -t * 40; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(this.held.x, this.held.y); c.stroke(); c.setLineDash([]);
        c.restore();
      }
      c.fillStyle = "rgba(0,0,0,0.4)"; c.beginPath(); c.ellipse(p.x + 3, p.y + 6, PR, PR * 0.8, 0, 0, Math.PI * 2); c.fill();
      // cloak, then the head, facing forward; feet step as you walk
      const a = Math.atan2(p.fy, p.fx), s = Math.sin(p.walk * 0.14) * 4;
      c.save(); c.translate(p.x, p.y); c.rotate(a);
      c.fillStyle = "#2a2f2c"; c.beginPath(); c.ellipse(-3 + s * 0.2, -9, 5, 4, 0, 0, Math.PI * 2); c.ellipse(-3 - s * 0.2, 9, 5, 4, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#5b4a33"; c.beginPath(); c.arc(0, 0, PR, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#c8d3cc"; c.beginPath(); c.arc(3, 0, 8, 0, Math.PI * 2); c.fill();
      c.fillStyle = C.moss; c.fillRect(8, -3, 3, 6);
      c.restore();
    }
    this.fx.draw(c);
    c.restore();
    // torchlight: the crypt is dark except around you, the statue, the torches and the exit
    if (typeof document !== "undefined") {
      if (!this.mask) { this.mask = document.createElement("canvas"); this.mask.width = W; this.mask.height = H; }
      const m = this.mask.getContext("2d")!;
      m.globalCompositeOperation = "source-over";
      m.fillStyle = "rgba(4,8,6,0.93)"; m.fillRect(0, 0, W, H);
      m.globalCompositeOperation = "destination-out";
      const hole = (x: number, y: number, r: number, a = 1) => {
        const g = m.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.55, `rgba(0,0,0,${a * 0.75})`); g.addColorStop(1, "rgba(0,0,0,0)");
        m.fillStyle = g; m.beginPath(); m.arc(x, y, r, 0, Math.PI * 2); m.fill();
      };
      hole(p.x, p.y, L.light + Math.sin(t * 9) * 4 + Math.sin(t * 23) * 2);
      const s = this.items.find((i) => i.tag === "statue")!;
      hole(s.x, s.y, 70, 0.8);
      for (const [x, y] of L.torches) hole(x, y, 92 + Math.sin(t * 7 + x) * 6, 0.75);
      hole(L.exit.x + L.exit.w / 2, L.exit.y + L.exit.h / 2, 90, 0.6);
      for (const pl of this.plates) if (pl.item) hole(pl.x + pl.w / 2, pl.y + pl.h / 2, 60, 0.5);
      c.drawImage(this.mask, 0, 0);
      // warm light over the darkness, then the flames
      c.save(); c.globalCompositeOperation = "lighter";
      for (const [x, y] of L.torches) {
        const g = c.createRadialGradient(x, y, 0, x, y, 80);
        g.addColorStop(0, "rgba(255,150,60,0.16)"); g.addColorStop(1, "rgba(255,150,60,0)");
        c.fillStyle = g; c.fillRect(x - 80, y - 80, 160, 160);
        const fl = 0.8 + Math.sin(t * 13 + y) * 0.2;
        c.fillStyle = `rgba(255,190,90,${fl})`; c.beginPath(); c.ellipse(x, y - 2, 4, 7 * fl, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = `rgba(255,240,200,${fl})`; c.beginPath(); c.arc(x, y, 2.2, 0, Math.PI * 2); c.fill();
      }
      const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, L.light * 0.6);
      g.addColorStop(0, "rgba(255,170,90,0.08)"); g.addColorStop(1, "rgba(255,170,90,0)");
      c.fillStyle = g; c.fillRect(p.x - L.light, p.y - L.light, L.light * 2, L.light * 2);
      // the statue glints
      if ((t * 0.7) % 1 < 0.12) { c.fillStyle = "rgba(255,250,220,0.9)"; c.beginPath(); c.arc(s.x - 5, s.y - 6, 2.5, 0, Math.PI * 2); c.fill(); }
      c.restore();
    }
    vignette(c, 0.4);
    if (this.t > 0 && this.t < 2.6 && this.state === "play") banner(c, `Level ${this.level + 1}: ${L.name}`, L.sub, Math.min(1, 2.6 - this.t));
  }
  // the four relics, drawn from simple shapes
  icon(c: CanvasRenderingContext2D, tag: Tag, x: number, y: number, k: number, ghost: boolean, t = 0) {
    c.save(); c.translate(x, y); c.scale(k, k);
    if (ghost) c.globalAlpha = 0.45;
    if (tag === "gargoyle") {
      c.fillStyle = ghost ? "#6b7566" : "#8f9a93";
      c.beginPath(); c.moveTo(-17, -4); c.lineTo(-7, -12); c.lineTo(-4, -3); c.lineTo(4, -3); c.lineTo(7, -12); c.lineTo(17, -4); c.lineTo(9, 10); c.lineTo(-9, 10); c.fill();
      c.fillStyle = ghost ? "#4c5550" : "#5f6a64"; c.beginPath(); c.arc(0, -2, 6, 0, Math.PI * 2); c.fill();
      if (!ghost) { c.fillStyle = "#f08c7a"; c.fillRect(-3, -4, 2, 2); c.fillRect(1, -4, 2, 2); }
    } else if (tag === "urn") {
      c.fillStyle = ghost ? "#6b5e4a" : "#b0784f";
      c.beginPath(); c.moveTo(-6, -13); c.lineTo(6, -13); c.quadraticCurveTo(15, 0, 7, 13); c.lineTo(-7, 13); c.quadraticCurveTo(-15, 0, -6, -13); c.fill();
      c.fillStyle = ghost ? "#4e4436" : "#8a5a38"; c.fillRect(-8, -15, 16, 4); c.fillRect(-11, -2, 22, 3);
    } else if (tag === "skull") {
      c.fillStyle = ghost ? "#77746a" : "#e4ddc8";
      c.beginPath(); c.arc(0, -2, 11, 0, Math.PI * 2); c.fill(); c.fillRect(-6, 5, 12, 7);
      c.fillStyle = "#1a1a18"; c.beginPath(); c.arc(-4, -2, 3, 0, Math.PI * 2); c.arc(4, -2, 3, 0, Math.PI * 2); c.fill(); c.fillRect(-1, 3, 2, 3);
    } else {
      c.fillStyle = ghost ? "#7a6a3a" : "#f2c14e";
      c.beginPath(); c.arc(0, -8, 6, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(-8, 13); c.lineTo(-5, -2); c.lineTo(5, -2); c.lineTo(8, 13); c.fill();
      c.fillStyle = ghost ? "#5a4e2a" : "#c4932a"; c.fillRect(-10, 11, 20, 4);
      if (!ghost) { c.fillStyle = `rgba(255,244,194,${0.6 + Math.sin(t * 5) * 0.3})`; c.beginPath(); c.arc(-2, -10, 2.5, 0, Math.PI * 2); c.fill(); }
    }
    c.restore();
  }
  hud() {
    const opened = this.gates.filter((g) => g.should).length;
    return [
      { label: "Level", value: `${this.level + 1}/${LEVELS.length}` },
      { label: "Time", value: fmt(this.t) },
      { label: "Gates", value: `${opened}/${this.gates.length}` },
      { label: "Holding", value: this.held ? this.held.name : "Nothing" },
    ];
  }
  goals(): [string, string, string] {
    const d = this.L.deaths;
    return ["Escape with the statue", d ? `No more than ${d} spike ${d === 1 ? "hit" : "hits"}` : "Never touch the spikes", `Escape in under ${this.L.time} s`];
  }
  stars(): [boolean, boolean, boolean] {
    const won = this.state === "won";
    return [won, won && this.deaths <= this.L.deaths, won && this.t < this.L.time];
  }
  result() { return `You escaped with the golden statue in ${fmt(this.t)}${this.deaths ? ` after ${this.deaths} ${this.deaths === 1 ? "run-in" : "run-ins"} with the spikes` : ", untouched by the spikes"}.`; }
  score() { return this.state === "won" ? Math.round(1e6 / Math.max(1, this.t + this.deaths * 5)) : 0; }
}
