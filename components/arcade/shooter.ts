// Simple Shooter (Frozen Fury: Robo Rampage), rebuilt for the browser from the Unreal C++ (AGun
import { C, Fx, Nav, W, H, banner, bar, box, circleOut, clamp, dist, fmt, label, painted, rnd, seeded, segCircle, trace, turnTo, vignette, lockOn, type Game, type Input, type Rect, type State, type V } from "./core";
import { sfx } from "./sfx";

const RANGE = 620;
const DAMAGE = 10;
const HP = 100;
const SPEED = 200, BOT_SPEED = 120, R = 15;
const BOT_RATE = 0.9, BOT_SPREAD = 0.11;

type Bot = { x: number; y: number; a: number; hp: number; sx: number; sy: number; last: V | null; seen: boolean; cool: number; flash: number; dead: boolean; path: V[]; pathFor: V | null; repath: number; walk: number; muzzle: number; wreck: number };
type Tracer = { x0: number; y0: number; x1: number; y1: number; life: number; me: boolean };
type Level = { name: string; sub: string; start: V; walls: Rect[]; spawns: V[]; health: number; time: number };

const border = (): Rect[] => [{ x: 0, y: 0, w: W, h: 16 }, { x: 0, y: H - 16, w: W, h: 16 }, { x: 0, y: 0, w: 16, h: H }, { x: W - 16, y: 0, w: 16, h: H }];

export const LEVELS: Level[] = [
  {
    name: "Cold Lab", sub: "Five robots. They chase while they see you, then search.",
    start: { x: 80, y: 270 },
    walls: [...border(),
      { x: 230, y: 90, w: 30, h: 170 }, { x: 230, y: 340, w: 30, h: 110 }, { x: 420, y: 230, w: 120, h: 30 }, { x: 465, y: 100, w: 30, h: 130 },
      { x: 700, y: 90, w: 30, h: 130 }, { x: 700, y: 310, w: 30, h: 150 }, { x: 560, y: 400, w: 90, h: 26 }, { x: 330, y: 420, w: 90, h: 26 }],
    spawns: [{ x: 400, y: 70 }, { x: 600, y: 160 }, { x: 830, y: 120 }, { x: 860, y: 430 }, { x: 600, y: 480 }],
    health: 50, time: 35,
  },
  {
    name: "Cryo Storage", sub: "Seven robots among the racks. Break line of sight to reset them.",
    start: { x: 70, y: 270 },
    walls: [...border(),
      { x: 180, y: 80, w: 26, h: 150 }, { x: 180, y: 310, w: 26, h: 150 }, { x: 330, y: 16, w: 26, h: 130 }, { x: 330, y: 394, w: 26, h: 130 },
      { x: 330, y: 250, w: 150, h: 26 }, { x: 560, y: 120, w: 26, h: 150 }, { x: 560, y: 340, w: 180, h: 26 }, { x: 700, y: 80, w: 140, h: 26 },
      { x: 800, y: 200, w: 26, h: 140 }],
    spawns: [{ x: 270, y: 120 }, { x: 270, y: 430 }, { x: 450, y: 90 }, { x: 450, y: 420 }, { x: 660, y: 220 }, { x: 880, y: 110 }, { x: 880, y: 450 }],
    health: 40, time: 45,
  },
  {
    name: "Reactor Core", sub: "Nine robots guard the core. Fight from the corners.",
    start: { x: 60, y: 270 },
    walls: [...border(),
      { x: 430, y: 200, w: 100, h: 140 }, { x: 200, y: 100, w: 120, h: 26 }, { x: 200, y: 414, w: 120, h: 26 }, { x: 640, y: 100, w: 120, h: 26 },
      { x: 640, y: 414, w: 120, h: 26 }, { x: 300, y: 240, w: 26, h: 60 }, { x: 634, y: 240, w: 26, h: 60 }, { x: 820, y: 200, w: 26, h: 140 },
      { x: 120, y: 200, w: 26, h: 140 }],
    spawns: [{ x: 260, y: 60 }, { x: 260, y: 480 }, { x: 480, y: 80 }, { x: 480, y: 460 }, { x: 700, y: 60 }, { x: 700, y: 480 }, { x: 760, y: 270 }, { x: 900, y: 120 }, { x: 900, y: 420 }],
    health: 30, time: 60,
  },
];

// floor and walls painted once per level: frosted steel tiles, hazard stripes, lit wall edges
const floors: (HTMLCanvasElement | null)[] = [];
function floor(lv: number) {
  if (floors[lv] !== undefined) return floors[lv];
  const L = LEVELS[lv], r = seeded(11 + lv * 17);
  floors[lv] = painted((c) => {
    c.fillStyle = "#0c1820"; c.fillRect(0, 0, W, H);
    for (let y = 16; y < H; y += 40) for (let x = 16; x < W; x += 40) {
      c.fillStyle = r() < 0.15 ? "#122431" : r() < 0.5 ? "#0f1e28" : "#0d1a23";
      c.fillRect(x + 1, y + 1, 38, 38);
      c.fillStyle = "rgba(159,217,242,0.05)"; c.fillRect(x + 3, y + 3, 2, 2); c.fillRect(x + 35, y + 35, 2, 2);
    }
    // frost creeping across the floor
    for (let k = 0; k < 26; k++) {
      const x = r() * W, y = r() * H, rr = 40 + r() * 90, g = c.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, "rgba(200,235,255,0.09)"); g.addColorStop(1, "rgba(200,235,255,0)");
      c.fillStyle = g; c.beginPath(); c.arc(x, y, rr, 0, Math.PI * 2); c.fill();
    }
    // ceiling lights pooled on the floor
    for (let k = 0; k < 6; k++) {
      const x = 120 + (k % 3) * 360, y = k < 3 ? 140 : 400, g = c.createRadialGradient(x, y, 0, x, y, 170);
      g.addColorStop(0, "rgba(170,220,255,0.10)"); g.addColorStop(1, "rgba(170,220,255,0)");
      c.fillStyle = g; c.fillRect(x - 170, y - 170, 340, 340);
    }
    for (const wl of L.walls) {
      c.fillStyle = "rgba(0,0,0,0.45)"; c.fillRect(wl.x + 5, wl.y + 7, wl.w, wl.h);
      c.fillStyle = "#1f2f39"; c.fillRect(wl.x, wl.y, wl.w, wl.h);
      c.fillStyle = "#2b414e"; c.fillRect(wl.x + 2, wl.y + 2, wl.w - 4, wl.h - 4);
      c.fillStyle = "rgba(207,233,245,0.55)"; c.fillRect(wl.x, wl.y, wl.w, Math.min(3, wl.h));
      // hazard stripes on the inner walls
      if (wl.w < W - 40 && wl.h < H - 40) {
        c.save(); c.beginPath(); c.rect(wl.x + 3, wl.y + 3, wl.w - 6, wl.h - 6); c.clip();
        c.fillStyle = "rgba(216,180,106,0.22)";
        for (let s = -wl.h; s < wl.w + wl.h; s += 14) { c.beginPath(); c.moveTo(wl.x + s, wl.y); c.lineTo(wl.x + s + 6, wl.y); c.lineTo(wl.x + s + 6 - wl.h, wl.y + wl.h); c.lineTo(wl.x + s - wl.h, wl.y + wl.h); c.fill(); }
        c.restore();
      }
    }
  });
  return floors[lv];
}

export class Shooter implements Game {
  state: State = "play";
  level: number;
  L: Level;
  nav: Nav;
  me = { x: 80, y: 270, a: 0, hp: HP, cool: 0, flash: 0, muzzle: 0, walk: 0 };
  bots: Bot[] = [];
  tracers: Tracer[] = [];
  fx = new Fx();
  t = 0; shots = 0; hits = 0;
  lock: Bot | null = null;
  constructor(level = 0) {
    this.level = clamp(level, 0, LEVELS.length - 1); this.L = LEVELS[this.level];
    this.nav = new Nav(this.L.walls, R, 20);
    this.reset();
  }
  get walls() { return this.L.walls; }
  reset() {
    this.state = "play"; this.t = 0; this.shots = 0; this.hits = 0;
    this.me = { x: this.L.start.x, y: this.L.start.y, a: 0, hp: HP, cool: 0, flash: 0, muzzle: 0, walk: 0 };
    this.bots = this.L.spawns.map((p) => ({ ...p, a: Math.PI, hp: HP, sx: p.x, sy: p.y, last: null, seen: false, cool: rnd(0.6, 1.4), flash: 0, dead: false, path: [], pathFor: null, repath: 0, walk: 0, muzzle: 0, wreck: 0 }));
    this.tracers = []; this.fx = new Fx();
  }
  sees(a: V, b: V) { return trace(a.x, a.y, b.x, b.y, this.walls) >= 1; }
  // aGun::GunTrace and PullTrigger: the first wall or robot along the line takes the shot
  shoot(from: V, ang: number, me: boolean) {
    const x1 = from.x + Math.cos(ang) * RANGE, y1 = from.y + Math.sin(ang) * RANGE;
    const x0 = from.x + Math.cos(ang) * (R + 4), y0 = from.y + Math.sin(ang) * (R + 4);
    let tt = trace(x0, y0, x1, y1, this.walls), victim: Bot | typeof this.me | null = null;
    const targets = me ? this.bots.filter((b) => !b.dead) : [this.me];
    for (const v of targets) { const k = segCircle(x0, y0, x1, y1, v.x, v.y, R); if (k >= 0 && k < tt) { tt = k; victim = v; } }
    const hx = x0 + (x1 - x0) * tt, hy = y0 + (y1 - y0) * tt;
    this.tracers.push({ x0, y0, x1: hx, y1: hy, life: 0.09, me });
    sfx.play(me ? "laser" : "zap", me ? 1 : 0.8);
    if (victim) {
      this.fx.spray(hx, hy, ang + Math.PI, 1.6, me ? C.fire : C.danger, 9, 220, 2);
      victim.hp = Math.max(0, victim.hp - DAMAGE);
      victim.flash = 0.1;
      if (me) {
        this.hits++;
        sfx.play("metal");
        const b = victim as Bot;
        // shot from out of sight: it now knows where you are
        b.last = { x: this.me.x, y: this.me.y };
        if (b.hp <= 0) {
          b.dead = true; b.wreck = 4;
          this.fx.burst(b.x, b.y, C.ice, 30, 300, 0, 4);
          this.fx.chunks(b.x, b.y, "#8a3a30", 12, 260, 0, 6);
          this.fx.ring(b.x, b.y, 80, "rgba(159,217,242,1)");
          this.fx.decal(b.x, b.y, 30, "rgba(0,0,0,0.6)", 40);
          this.fx.shake = 0.6; this.fx.flash = 0.25;
          sfx.play("pop");
          if (this.bots.every((q) => q.dead)) { this.state = "won"; sfx.play("win"); }
        }
      } else {
        this.fx.shake = Math.max(this.fx.shake, 0.4);
        sfx.play("hurt");
        if (this.me.hp <= 0) { this.state = "lost"; this.fx.burst(this.me.x, this.me.y, C.moss, 40, 300, 0, 4); this.fx.chunks(this.me.x, this.me.y, "#244a5c", 12, 260, 0, 6); sfx.play("boom"); sfx.play("lose"); }
      }
    } else {
      // sparks fly back off the wall, and a scorch mark stays
      this.fx.spray(hx, hy, ang + Math.PI, 1.2, C.ice, 6, 200, 1.6);
      this.fx.decal(hx, hy, 5, "rgba(0,0,0,0.5)", 8);
    }
  }
  step(dt: number, inp: Input) {
    this.fx.step(dt);
    for (const tr of this.tracers) tr.life -= dt;
    this.tracers = this.tracers.filter((tr) => tr.life > 0);
    const me = this.me;
    me.flash = Math.max(0, me.flash - dt); me.muzzle = Math.max(0, me.muzzle - dt);
    for (const b of this.bots) { b.muzzle = Math.max(0, b.muzzle - dt); if (b.dead && b.wreck > 0) { b.wreck -= dt; if (Math.random() < dt * 8) this.fx.smoke(b.x, b.y, 1, "rgba(70,80,85,1)", 9, -50); } }
    if (this.state !== "play") return;
    this.t += dt;
    let ax = inp.ax, ay = inp.ay;
    const m = Math.hypot(ax, ay);
    if (m > 1) { ax /= m; ay /= m; }
    const pos = { x: me.x + ax * SPEED * dt, y: me.y + ay * SPEED * dt };
    for (const wl of this.walls) circleOut(pos, R, wl);
    me.walk += Math.hypot(pos.x - me.x, pos.y - me.y);
    me.x = pos.x; me.y = pos.y;
    // aim at the pointer
    const stick = Math.hypot(inp.bx, inp.by) > 0.35;
    let aim = me.a;
    if (inp.aimed) aim = Math.atan2(inp.aimY - me.y, inp.aimX - me.x);
    else if (stick) aim = Math.atan2(inp.by, inp.bx);
    this.lock = null;
    if (!inp.aimed && !stick) {
      let best = Infinity;
      for (const b of this.bots) if (!b.dead && this.sees(me, b)) { const d = dist(me, b); if (d < best) { best = d; aim = Math.atan2(b.y - me.y, b.x - me.x); this.lock = b; } }
      if (best === Infinity && m > 0.2) aim = Math.atan2(ay, ax);
    }
    if (!inp.assist) this.lock = null;
    me.a = inp.aimed ? aim : turnTo(me.a, aim, 14 * dt);
    me.cool -= dt;
    if ((inp.fire || stick) && me.cool <= 0) { this.shoot(me, me.a, true); me.cool = 0.16; me.muzzle = 0.05; this.shots++; }
    for (const b of this.bots) {
      b.flash = Math.max(0, b.flash - dt);
      if (b.dead) continue;
      // bTService_PlayerLocationIfSeen
      b.seen = dist(b, me) < RANGE && this.sees(b, me);
      if (b.seen) b.last = { x: me.x, y: me.y };
      let goal: V | null = null;
      if (b.seen) {
        b.a = turnTo(b.a, Math.atan2(me.y - b.y, me.x - b.x), 6 * dt);
        if (dist(b, me) > 230) goal = me;
        b.cool -= dt;
        if (b.cool <= 0) { b.cool = BOT_RATE + rnd(0, 0.4); b.muzzle = 0.05; this.shoot(b, b.a + rnd(-BOT_SPREAD, BOT_SPREAD), false); }
      } else if (b.last) {
        goal = b.last;
        if (dist(b, b.last) < 20) b.last = null;
      } else if (dist(b, { x: b.sx, y: b.sy }) > 10) goal = { x: b.sx, y: b.sy };
      if (goal) this.moveBot(b, goal, dt);
    }
  }
  // moveTo on the nav grid: replan when the goal has moved, then walk to the farthest waypoint in plain sight
  moveBot(b: Bot, goal: V, dt: number) {
    b.repath -= dt;
    if (!b.pathFor || dist(goal, b.pathFor) > 30 || b.repath <= 0 || !b.path.length) {
      b.path = this.sees(b, goal) ? [goal] : this.nav.path(b, goal);
      b.pathFor = { ...goal }; b.repath = 0.5;
    }
    while (b.path.length > 1 && dist(b, b.path[0]) < 12) b.path.shift();
    const to = this.nav.steer(b, b.path, this.walls);
    const ga = Math.atan2(to.y - b.y, to.x - b.x);
    if (!b.seen) b.a = turnTo(b.a, ga, 5 * dt);
    const q = { x: b.x + Math.cos(ga) * BOT_SPEED * dt, y: b.y + Math.sin(ga) * BOT_SPEED * dt };
    for (const wl of this.walls) circleOut(q, R, wl);
    for (const o of this.bots) if (o !== b && !o.dead) { const d = dist(q, o); if (d < R * 2 && d > 0) { q.x = o.x + ((q.x - o.x) / d) * R * 2; q.y = o.y + ((q.y - o.y) / d) * R * 2; } }
    b.walk += Math.hypot(q.x - b.x, q.y - b.y);
    b.x = clamp(q.x, R, W - R); b.y = clamp(q.y, R, H - R);
  }
  draw(c: CanvasRenderingContext2D, t: number) {
    const o = this.fx.offset();
    c.save(); c.translate(o.x, o.y);
    const f = floor(this.level);
    if (f) c.drawImage(f, 0, 0); else { c.fillStyle = "#0c1820"; c.fillRect(-20, -20, W + 40, H + 40); }
    this.fx.drawUnder(c);
    for (const b of this.bots) {
      if (b.dead) { this.wreck(c, b); continue; }
      // a thin laser sight warns that a robot that sees you is about to fire
      if (b.seen && b.cool < 0.35) {
        c.strokeStyle = `rgba(240,120,100,${0.15 + (0.35 - b.cool)})`; c.lineWidth = 1;
        const tt = trace(b.x, b.y, b.x + Math.cos(b.a) * RANGE, b.y + Math.sin(b.a) * RANGE, this.walls);
        c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(b.x + Math.cos(b.a) * RANGE * tt, b.y + Math.sin(b.a) * RANGE * tt); c.stroke();
      }
      this.robot(c, b.x, b.y, b.a, b.flash > 0, "#c9483a", "#5a2a26", "#ffcf9a", b.walk, b.muzzle);
      bar(c, b.x, b.y - 30, 34, b.hp / HP, C.danger);
      const bob = Math.sin(t * 6 + b.sx) * 2;
      if (b.seen) label(c, "!", b.x + 20, b.y - 24 + bob, 15, C.danger, "center", 800);
      else if (b.last) label(c, "?", b.x + 20, b.y - 24 + bob, 15, C.brass, "center", 800);
    }
    if (this.me.hp > 0) this.robot(c, this.me.x, this.me.y, this.me.a, this.me.flash > 0, "#9fd9f2", "#244a5c", "#e9fbff", this.me.walk, this.me.muzzle);
    c.save(); c.globalCompositeOperation = "lighter";
    for (const tr of this.tracers) {
      const a = tr.life / 0.09;
      c.strokeStyle = tr.me ? `rgba(255,240,190,${0.35 * a})` : `rgba(255,140,120,${0.35 * a})`; c.lineWidth = 6;
      c.beginPath(); c.moveTo(tr.x0, tr.y0); c.lineTo(tr.x1, tr.y1); c.stroke();
      c.strokeStyle = tr.me ? `rgba(255,250,230,${a})` : `rgba(255,190,170,${a})`; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(tr.x0, tr.y0); c.lineTo(tr.x1, tr.y1); c.stroke();
    }
    c.restore();
    if (this.lock && this.state === "play") lockOn(c, this.lock.x, this.lock.y, 20, t);
    this.fx.draw(c);
    // snow drifting through the lab
    c.fillStyle = "rgba(230,245,255,0.45)";
    for (let k = 0; k < 50; k++) { const x = (k * 97 + t * 20) % W, y = (k * 53 + t * (30 + (k % 5) * 8)) % H; c.fillRect(x, y, k % 3 ? 2 : 3, k % 3 ? 2 : 3); }
    c.restore();
    vignette(c, 0.55);
    // low health tints the edges red
    if (this.me.hp <= 30 && this.state === "play") { c.fillStyle = `rgba(240,90,70,${0.08 + Math.sin(t * 6) * 0.04})`; c.fillRect(0, 0, W, H); }
    this.fx.drawFlash(c);
    // health
    c.fillStyle = "rgba(0,0,0,0.55)"; box(c, 24, H - 36, 184, 14, 4); c.fill();
    c.fillStyle = this.me.hp > 30 ? C.ice : C.danger; box(c, 26, H - 34, 180 * (this.me.hp / HP), 10, 3); c.fill();
    label(c, "HEALTH", 214, H - 29, 11, C.muted, "left", 700);
    if (this.t > 0 && this.t < 2.4 && this.state === "play") banner(c, `Level ${this.level + 1}: ${this.L.name}`, this.L.sub, Math.min(1, 2.4 - this.t), C.ice);
  }
  wreck(c: CanvasRenderingContext2D, b: Bot) {
    c.save(); c.translate(b.x, b.y); c.rotate(b.a);
    c.fillStyle = "#1c2328"; c.beginPath(); c.arc(0, 0, R - 1, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#3a2420"; box(c, -8, -6, 12, 12, 3); c.fill();
    c.fillStyle = "rgba(255,120,60,0.6)"; c.globalAlpha = Math.max(0, b.wreck / 4); c.beginPath(); c.arc(2, 0, 4, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  robot(c: CanvasRenderingContext2D, x: number, y: number, a: number, flash: boolean, col: string, dark: string, eye: string, walk: number, muzzle: number) {
    c.save(); c.translate(x, y);
    c.fillStyle = "rgba(0,0,0,0.4)"; c.beginPath(); c.arc(4, 6, R + 1, 0, Math.PI * 2); c.fill();
    c.rotate(a);
    // feet step as it walks
    const s = Math.sin(walk * 0.12) * 4;
    c.fillStyle = dark; box(c, -6 + s, -R - 2, 12, 6, 2); c.fill(); box(c, -6 - s, R - 4, 12, 6, 2); c.fill();
    // gun arm
    c.fillStyle = "#1a2328"; box(c, 4, 4, 24, 6, 2); c.fill();
    if (muzzle > 0) { c.fillStyle = "rgba(255,240,200,0.95)"; c.beginPath(); c.arc(31, 7, 6, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = flash ? "#fff" : col; c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.fill();
    c.fillStyle = "rgba(255,255,255,0.18)"; c.beginPath(); c.arc(-4, -5, R * 0.55, 0, Math.PI * 2); c.fill();
    c.fillStyle = dark; box(c, 1, -7, 11, 14, 4); c.fill();
    c.fillStyle = eye; c.fillRect(8, -5, 3, 10);
    c.restore();
  }
  hud() {
    const left = this.bots.filter((b) => !b.dead).length, n = this.L.spawns.length;
    return [
      { label: "Level", value: `${this.level + 1}/${LEVELS.length}` },
      { label: "Robots", value: `${n - left}/${n}` },
      { label: "Health", value: String(this.me.hp) },
      { label: "Time", value: fmt(this.t) },
    ];
  }
  goals(): [string, string, string] { return ["Destroy every robot", `Finish with ${this.L.health}+ health`, `Clear it in under ${this.L.time} s`]; }
  stars(): [boolean, boolean, boolean] {
    const won = this.state === "won";
    return [won, won && this.me.hp >= this.L.health, won && this.t < this.L.time];
  }
  result() {
    const acc = this.shots ? Math.round((this.hits / this.shots) * 100) : 0, n = this.L.spawns.length;
    return this.state === "won" ? `Lab cleared in ${fmt(this.t)} with ${this.me.hp} health left. Accuracy ${acc}%.` : `The robots got you. ${this.bots.filter((b) => b.dead).length} of ${n} destroyed.`;
  }
  score() { return this.state === "won" ? Math.round(1e6 / Math.max(1, this.t)) + this.me.hp * 10 : 0; }
}
