// Obstacle Assault, side on, based on my Unreal C++ (AMoving_Platform)
import { C, Fx, W, H, banner, box, clamp, fmt, label, overlap, seeded, vignette, type Game, type Input, type Rect, type State } from "./core";
import { sfx } from "./sfx";

const RUN = 250, GRAV = 1700, JUMP = 640, PW = 24, PH = 38;
type Solid = Rect & { kind: "ground" | "move" | "fall"; vx?: number; vy?: number; dist?: number; sx?: number; sy?: number; dx?: number; dy?: number; t?: number; ox?: number; oy?: number; gone?: boolean };
type Hammer = { x: number; y: number; L: number; w: number; a: number; a0: number; head: number };
type Course = { solids: Solid[]; hammers: Hammer[]; flags: number[]; goal: number; end: number; name: string; sub: string; falls: number; time: number; sky: [string, string] };

const g = (x0: number, x1: number, y = 440): Solid => ({ x: x0, y, w: x1 - x0, h: H + 200 - y, kind: "ground" });
const mv = (x: number, y: number, w: number, vx: number, vy: number, d: number): Solid => ({ x, y, w, h: 18, kind: "move", vx, vy, dist: d, sx: x, sy: y, ox: x, oy: y, dx: 0, dy: 0 });
const fall = (x: number, y: number, w: number): Solid => ({ x, y, w, h: 18, kind: "fall", ox: x, oy: y, t: -1 });
const hm = (x: number, y: number, L: number, w: number, a: number): Hammer => ({ x, y, L, w, a, a0: a, head: 24 });

export const COURSES: (() => Course)[] = [
  () => ({
    name: "The Castle Run", sub: "Moving platforms, swinging hammers, floors that give way.", falls: 2, time: 30, sky: ["#0b1d2a", "#173a2a"],
    solids: [
      g(-200, 520), mv(560, 420, 110, 90, 0, 140), g(860, 1230),
      mv(1290, 440, 100, 0, -70, 140), { x: 1460, y: 300, w: 100, h: 18, kind: "ground" }, mv(1610, 300, 100, 0, 70, 140), g(1760, 2200),
      fall(2280, 420, 90), fall(2440, 380, 90), fall(2600, 340, 90), g(2760, 2960, 340),
      mv(3010, 340, 100, 80, 40, 160), g(3240, 3520),
      mv(3570, 420, 100, 150, 0, 200), g(3940, 4700),
    ],
    hammers: [hm(1010, 250, 170, 2, 0), hm(1860, 250, 170, -2.2, 1.2), hm(2010, 250, 170, 2.2, 3.4), hm(3420, 270, 150, 2.2, 0.5)],
    flags: [60, 1180, 2170, 3250], goal: 4150, end: 4400,
  }),
  () => ({
    name: "Hammer Hall", sub: "Twice the hammers, and platforms that climb and dive.", falls: 3, time: 35, sky: ["#1a1426", "#2a2030"],
    solids: [
      g(-200, 400), mv(460, 420, 100, 100, 0, 160), g(760, 1100),
      fall(1170, 400, 80), fall(1300, 360, 80), fall(1430, 320, 80), g(1560, 1900, 320),
      mv(1960, 320, 90, 0, 80, 140), g(2110, 2400, 460),
      mv(2460, 440, 100, 0, -90, 180), g(2620, 2900, 260),
      fall(2960, 300, 80), mv(3100, 300, 100, 120, 0, 200), g(3480, 3800, 340),
      mv(3860, 360, 100, 130, 0, 220), g(4300, 5000),
    ],
    hammers: [hm(930, 250, 170, 2.4, 0), hm(1700, 150, 150, -2.4, 0.6), hm(1830, 150, 150, 2.4, 2.2), hm(2260, 300, 140, 2.6, 0), hm(2760, 100, 140, -2.6, 1), hm(3640, 180, 140, 2.8, 0)],
    flags: [60, 800, 1575, 2130, 2640, 3520], goal: 4550, end: 4800,
  }),
  () => ({
    name: "Sky Keep", sub: "Crumbling stairs over the clouds. Do not look down.", falls: 4, time: 45, sky: ["#06101c", "#20324a"],
    solids: [
      g(-200, 300), fall(360, 400, 70), fall(480, 360, 70), fall(600, 320, 70), fall(720, 280, 70),
      g(850, 1180, 280), mv(1240, 280, 110, 140, 0, 220), g(1620, 1780, 300),
      mv(1840, 300, 100, 0, -100, 160), g(1980, 2300, 140),
      fall(2360, 200, 70), fall(2490, 260, 70), fall(2620, 320, 70), mv(2750, 320, 90, 0, 110, 120),
      g(2900, 3200, 440), mv(3260, 420, 100, 160, 0, 250), mv(3660, 380, 100, 0, -120, 160), g(3800, 4100, 220),
      fall(4160, 260, 70), fall(4290, 300, 70), g(4420, 5200, 340),
    ],
    hammers: [hm(1000, 120, 150, 3, 0), hm(2160, 0, 130, -3, 0), hm(3080, 280, 140, 3.2, 0.5), hm(3940, 60, 140, 3.2, 0), hm(4060, 60, 140, -3.2, 1.6)],
    flags: [60, 862, 1650, 1990, 2920, 3810], goal: 4700, end: 4950,
  }),
];
export const LEVELS = COURSES.map((f) => f());

export class Obstacle implements Game {
  upFires = true;
  state: State = "play";
  level: number;
  course!: Course;
  solids: Solid[] = [];
  hammers: Hammer[] = [];
  flags: number[] = [];
  p = { x: 60, y: 400, vx: 0, vy: 0, on: null as Solid | null, coyote: 0, buffer: 0, face: 1, squash: 0 };
  check = 0;
  deaths = 0;
  t = 0;
  cam = 0;
  dead = 0;
  fx = new Fx();
  clouds: { x: number; y: number; s: number; k: number }[] = [];
  constructor(level = 0) { this.level = clamp(level, 0, COURSES.length - 1); this.reset(); }
  reset() {
    this.course = COURSES[this.level]();
    this.solids = this.course.solids; this.hammers = this.course.hammers; this.flags = this.course.flags;
    this.state = "play"; this.check = 0; this.deaths = 0; this.t = 0; this.dead = 0; this.fx = new Fx();
    const r = seeded(5 + this.level);
    this.clouds = Array.from({ length: 14 }, () => ({ x: r() * 2400, y: 30 + r() * 220, s: 40 + r() * 90, k: 0.08 + r() * 0.25 }));
    this.spawn();
    this.cam = 0;
  }
  groundAt(x: number) {
    for (const s of this.solids) if (s.kind === "ground" && x >= s.x && x <= s.x + s.w) return s.y;
    return 440;
  }
  spawn() {
    const x = this.flags[this.check];
    this.p = { x: x - PW / 2, y: this.groundAt(x) - PH, vx: 0, vy: 0, on: null, coyote: 0, buffer: 0, face: 1, squash: 0 };
    // collapsed platforms come back
    for (const s of this.solids) if (s.kind === "fall") { s.x = s.ox!; s.y = s.oy!; s.t = -1; s.gone = false; s.vy = 0; }
  }
  die() {
    this.fx.burst(this.p.x + PW / 2, Math.min(this.p.y + PH / 2, H - 10), C.moss, 26, 260, 600, 3);
    this.fx.chunks(this.p.x + PW / 2, Math.min(this.p.y + PH / 2, H - 10), "#e6efe8", 6, 220, 900, 5);
    this.fx.shake = 0.7;
    this.deaths++;
    this.dead = 0.45;
    sfx.play("die");
  }
  // aMoving_Platform MovePlatform and RotatePlatform
  movePlatforms(dt: number) {
    for (const s of this.solids) {
      if (s.kind === "move") {
        const px = s.x, py = s.y;
        const moved = Math.hypot(s.x - s.sx!, s.y - s.sy!);
        if (moved > s.dist!) {
          const m = Math.hypot(s.vx!, s.vy!), nx = s.vx! / m, ny = s.vy! / m;
          s.sx = s.sx! + nx * s.dist!; s.sy = s.sy! + ny * s.dist!;
          s.x = s.sx; s.y = s.sy;
          s.vx = -s.vx!; s.vy = -s.vy!;
        } else { s.x += s.vx! * dt; s.y += s.vy! * dt; }
        s.dx = s.x - px; s.dy = s.y - py;
      } else if (s.kind === "fall" && s.t! >= 0) {
        s.t! += dt;
        const py = s.y;
        if (s.t! > 0.6) { s.vy = (s.vy ?? 0) + GRAV * 0.7 * dt; s.y += s.vy * dt; }
        else s.x = s.ox! + Math.sin(s.t! * 60) * 1.5;
        s.dy = s.y - py; s.dx = 0;
        if (s.y > H + 300) s.gone = true;
      }
    }
    for (const h of this.hammers) {
      const before = Math.sin(h.a);
      h.a += h.w * dt;
      // whoosh as each hammer passes the bottom of its swing, if it's on screen
      if (before < 0.97 && Math.sin(h.a) >= 0.97 && h.x > this.cam - 60 && h.x < this.cam + W + 60) sfx.play("swing", 0.7);
    }
  }
  step(dt: number, inp: Input) {
    this.fx.step(dt);
    this.movePlatforms(dt);
    if (this.state !== "play") return;
    this.t += dt;
    if (this.dead > 0) { this.dead -= dt; if (this.dead <= 0) this.spawn(); return; }
    const p = this.p;
    p.squash = Math.max(0, p.squash - dt * 5);
    // move with the platform you're standing on
    if (p.on && (p.on.kind === "move" || p.on.kind === "fall")) { p.x += p.on.dx ?? 0; p.y += p.on.dy ?? 0; }
    const want = clamp(inp.ax, -1, 1) * RUN;
    p.vx += (want - p.vx) * Math.min(1, dt * (p.on ? 14 : 6));
    if (Math.abs(inp.ax) > 0.1) p.face = Math.sign(inp.ax);
    p.vy += GRAV * dt;
    p.coyote = p.on ? 0.1 : p.coyote - dt;
    p.buffer = inp.firePressed ? 0.12 : p.buffer - dt;
    if (p.buffer > 0 && p.coyote > 0) {
      p.vy = -JUMP; p.coyote = 0; p.buffer = 0; p.on = null;
      sfx.play("jump");
      this.fx.smoke(p.x + PW / 2, p.y + PH, 3, "rgba(200,210,200,1)", 6, -10);
    }
    // short hop if you let go early
    if (!inp.fire && p.vy < -JUMP * 0.45) p.vy = -JUMP * 0.45;
    const live = this.solids.filter((s) => !s.gone);
    p.x += p.vx * dt;
    for (const s of live) {
      const r = { x: p.x, y: p.y, w: PW, h: PH };
      if (!overlap(r, s)) continue;
      if (p.x + PW / 2 < s.x + s.w / 2) p.x = s.x - PW; else p.x = s.x + s.w;
      p.vx = 0;
    }
    p.x = Math.max(-150, p.x);
    const vyWas = p.vy;
    p.y += p.vy * dt;
    const wasOn = p.on;
    p.on = null;
    for (const s of live) {
      const r = { x: p.x, y: p.y, w: PW, h: PH };
      if (!overlap(r, s)) continue;
      if (p.vy >= 0 && p.y + PH - s.y < 26) {
        p.y = s.y - PH; p.vy = 0; p.on = s;
        if (s.kind === "fall" && s.t! < 0) s.t = 0;
      } else if (p.vy < 0) { p.y = s.y + s.h; p.vy = 0; }
    }
    if (p.on && !wasOn && vyWas > 300) {
      p.squash = Math.min(1, vyWas / 900);
      sfx.play("land", Math.min(1, vyWas / 800));
      this.fx.smoke(p.x + PW / 2, p.y + PH, 4, "rgba(200,210,200,1)", 6, -8);
    }
    // flags
    for (let k = this.check + 1; k < this.flags.length; k++) if (p.x > this.flags[k]) {
      this.check = k;
      this.fx.burst(this.flags[k] + 16, this.groundAt(this.flags[k]) - 80, C.brass, 24, 220, 300, 2.5);
      this.fx.text(this.flags[k] + 16, this.groundAt(this.flags[k]) - 110, "Checkpoint", C.moss, 15);
      sfx.play("flag");
    }
    // hammers, only the head hurts
    for (const h of this.hammers) {
      const hx = h.x + Math.cos(h.a) * h.L, hy = h.y + Math.sin(h.a) * h.L;
      const cx = clamp(hx, p.x, p.x + PW), cy = clamp(hy, p.y, p.y + PH);
      if (Math.hypot(hx - cx, hy - cy) < h.head) { this.die(); return; }
    }
    if (p.y > H + 60) { this.die(); return; }
    if (p.x > this.course.goal) {
      this.state = "won";
      this.fx.burst(this.course.goal + 30, 300, C.brass, 70, 380, 300, 3);
      this.fx.ring(this.course.goal + 30, 300, 160, "rgba(240,215,154,1)");
      sfx.play("win");
    }
    this.cam += (clamp(p.x - W * 0.38, 0, this.course.end - W) - this.cam) * Math.min(1, dt * 6);
  }
  draw(c: CanvasRenderingContext2D, t: number) {
    const o = this.fx.offset(), [top, bot] = this.course.sky;
    const sky = c.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, top); sky.addColorStop(1, bot);
    c.fillStyle = sky; c.fillRect(0, 0, W, H);
    // stars, moon and clouds
    c.fillStyle = "rgba(230,240,255,0.7)";
    for (let k = 0; k < 60; k++) { const x = ((k * 173 - this.cam * 0.03) % W + W) % W, y = (k * 71) % 220; c.globalAlpha = 0.3 + ((k * 13) % 7) / 10 + Math.sin(t * 2 + k) * 0.1; c.fillRect(x, y, k % 4 ? 1.5 : 2.5, k % 4 ? 1.5 : 2.5); }
    c.globalAlpha = 1;
    const mx = 760 - this.cam * 0.02;
    c.fillStyle = "rgba(240,215,154,0.12)"; c.beginPath(); c.arc(mx, 90, 70, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#f0e6c8"; c.beginPath(); c.arc(mx, 90, 34, 0, Math.PI * 2); c.fill();
    c.fillStyle = "rgba(0,0,0,0.08)"; c.beginPath(); c.arc(mx - 10, 82, 8, 0, Math.PI * 2); c.arc(mx + 12, 98, 5, 0, Math.PI * 2); c.fill();
    for (const cl of this.clouds) {
      const x = ((cl.x - this.cam * cl.k + t * 8 * cl.k) % 2400 + 2400) % 2400 - 300;
      c.fillStyle = "rgba(200,215,230,0.06)";
      c.beginPath(); c.ellipse(x, cl.y, cl.s, cl.s * 0.32, 0, 0, Math.PI * 2); c.ellipse(x + cl.s * 0.5, cl.y - cl.s * 0.12, cl.s * 0.6, cl.s * 0.3, 0, 0, Math.PI * 2); c.fill();
    }
    // parallax hills
    for (const [k, col, amp, base] of [[0.15, "rgba(16,41,31,0.9)", 60, 330], [0.3, "rgba(12,32,24,0.95)", 50, 370], [0.5, "#0b1d15", 70, 410]] as const) {
      c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 16) { const wx = x + this.cam * k; c.lineTo(x, base - Math.sin(wx * 0.006 + k * 9) * amp - Math.sin(wx * 0.017) * amp * 0.3); }
      c.lineTo(W, H); c.fill();
    }
    // faint glow from the pit below
    const abyss = c.createLinearGradient(0, H - 70, 0, H);
    abyss.addColorStop(0, "rgba(255,140,60,0)"); abyss.addColorStop(1, "rgba(255,120,50,0.12)");
    c.fillStyle = abyss; c.fillRect(0, H - 70, W, 70);
    c.save(); c.translate(-this.cam + o.x, o.y);
    this.drawCastle(c, t);
    // flags
    this.flags.forEach((fx, k) => {
      if (!k) return;
      const gy = this.groundAt(fx), lit = k <= this.check;
      c.fillStyle = "#4a5a50"; c.fillRect(fx, gy - 100, 3, 100);
      c.fillStyle = lit ? C.moss : C.muted;
      c.beginPath(); c.moveTo(fx + 3, gy - 100); c.lineTo(fx + 32, gy - 90 + Math.sin(t * 5 + k) * 3); c.lineTo(fx + 3, gy - 78); c.fill();
      if (lit) { c.fillStyle = "rgba(111,207,151,0.12)"; c.beginPath(); c.arc(fx + 10, gy - 90, 34, 0, Math.PI * 2); c.fill(); }
    });
    for (const s of this.solids) {
      if (s.gone || s.x > this.cam + W + 40 || s.x + s.w < this.cam - 40) continue;
      if (s.kind === "ground") {
        c.fillStyle = "#1a2f24"; c.fillRect(s.x, s.y, s.w, s.h);
        // stone blocks with moss on top
        c.fillStyle = "rgba(0,0,0,0.2)";
        for (let row = 0; row < 6; row++) for (let x = s.x + ((row % 2) * 23); x < s.x + s.w - 10; x += 46) c.fillRect(x + 2, s.y + 14 + row * 22, 40, 2);
        c.fillStyle = "#3d7a55"; c.fillRect(s.x, s.y, s.w, 6);
        c.fillStyle = "#56a575"; c.fillRect(s.x, s.y, s.w, 2);
        c.fillStyle = "rgba(0,0,0,0.25)"; c.fillRect(s.x + s.w - 4, s.y, 4, s.h);
      } else {
        const shaky = s.kind === "fall" && s.t! >= 0;
        c.fillStyle = "rgba(0,0,0,0.3)"; box(c, s.x + 3, s.y + 6, s.w, s.h, 4); c.fill();
        c.fillStyle = s.kind === "fall" ? (shaky ? "#9a5a3a" : "#6e5137") : "#3a4d44";
        box(c, s.x, s.y, s.w, s.h, 4); c.fill();
        c.fillStyle = s.kind === "fall" ? "#a87652" : C.brass; c.fillRect(s.x + 4, s.y + 2, s.w - 8, 3);
        if (s.kind === "fall") { c.strokeStyle = "rgba(0,0,0,0.35)"; c.lineWidth = 1; c.beginPath(); c.moveTo(s.x + s.w * 0.4, s.y + 4); c.lineTo(s.x + s.w * 0.5, s.y + 10); c.lineTo(s.x + s.w * 0.45, s.y + 17); c.stroke(); }
        if (s.kind === "move") {
          const m = Math.hypot(s.vx!, s.vy!);
          c.strokeStyle = "rgba(216,180,106,0.22)"; c.setLineDash([4, 6]); c.lineWidth = 1.5;
          c.beginPath(); c.moveTo(s.sx! + s.w / 2, s.sy! + 9); c.lineTo(s.sx! + s.w / 2 + (s.vx! / m) * s.dist!, s.sy! + 9 + (s.vy! / m) * s.dist!); c.stroke(); c.setLineDash([]);
          // glowing runes underneath so moving platforms are easy to spot
          c.fillStyle = "rgba(240,215,154,0.6)"; for (let x = s.x + 12; x < s.x + s.w - 8; x += 18) c.fillRect(x, s.y + 11, 6, 2);
        }
      }
    }
    for (const h of this.hammers) {
      if (h.x < this.cam - 260 || h.x > this.cam + W + 260) continue;
      const hx = h.x + Math.cos(h.a) * h.L, hy = h.y + Math.sin(h.a) * h.L;
      // trail behind the hammer head
      for (let k = 1; k <= 4; k++) {
        const a = h.a - Math.sign(h.w) * k * 0.08, tx = h.x + Math.cos(a) * h.L, ty = h.y + Math.sin(a) * h.L;
        c.fillStyle = `rgba(200,210,205,${0.09 - k * 0.018})`; c.beginPath(); c.arc(tx, ty, h.head, 0, Math.PI * 2); c.fill();
      }
      c.strokeStyle = "#6b5236"; c.lineWidth = 8; c.lineCap = "round";
      c.beginPath(); c.moveTo(h.x, h.y); c.lineTo(hx, hy); c.stroke();
      c.strokeStyle = "rgba(255,230,190,0.18)"; c.lineWidth = 2; c.beginPath(); c.moveTo(h.x, h.y); c.lineTo(hx, hy); c.stroke();
      c.fillStyle = "#3e4a44"; c.beginPath(); c.arc(h.x, h.y, 12, 0, Math.PI * 2); c.fill();
      c.fillStyle = C.brass; c.beginPath(); c.arc(h.x, h.y, 4, 0, Math.PI * 2); c.fill();
      c.save(); c.translate(hx, hy); c.rotate(h.a);
      c.fillStyle = "rgba(0,0,0,0.3)"; box(c, -16, -h.head + 4, 36, h.head * 2, 6); c.fill();
      c.fillStyle = "#6f7d77"; box(c, -18, -h.head, 36, h.head * 2, 6); c.fill();
      c.fillStyle = "#a9b5ae"; c.fillRect(-14, -h.head + 3, 6, h.head * 2 - 6);
      c.fillStyle = "#4c5853"; c.fillRect(8, -h.head + 4, 4, h.head * 2 - 8);
      c.restore();
    }
    // runner, squashes on landing and stretches in the air
    const p = this.p;
    if (this.dead <= 0) {
      c.save(); c.translate(p.x + PW / 2, p.y + PH);
      const air = !p.on ? clamp(Math.abs(p.vy) / 900, 0, 0.18) : 0, sq = p.squash * 0.25;
      c.scale(1 + sq - air * 0.6, 1 - sq + air);
      const run = p.on && Math.abs(p.vx) > 20 ? Math.sin(t * 18) : 0;
      c.fillStyle = "rgba(0,0,0,0.3)"; c.beginPath(); c.ellipse(0, 1, 14, 3, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#cfd9d2"; c.fillRect(-9 + run * 4, -9, 7, 9); c.fillRect(2 - run * 4, -9, 7, 9);
      c.fillStyle = "#e6efe8"; box(c, -PW / 2, -PH, PW, PH - 8, 10); c.fill();
      c.fillStyle = C.moss; box(c, -PW / 2 + 3 + p.face * 3, -PH + 7, PW - 6, 9, 4); c.fill();
      c.fillStyle = "#04140b"; c.fillRect(p.face * 5 - 1, -PH + 9, 3, 5);
      c.fillStyle = C.brass; c.fillRect(-PW / 2, -PH + 22, PW, 3);
      c.restore();
    }
    this.fx.draw(c);
    c.restore();
    vignette(c, 0.45);
    // progress bar with flag marks
    const goal = this.course.goal;
    c.fillStyle = "rgba(0,0,0,0.45)"; box(c, 20, H - 16, W - 40, 6, 3); c.fill();
    c.fillStyle = C.moss; box(c, 20, H - 16, (W - 40) * clamp(this.p.x / goal, 0, 1), 6, 3); c.fill();
    for (const f of this.flags.slice(1)) { c.fillStyle = C.brass; c.fillRect(20 + (W - 40) * (f / goal) - 1, H - 20, 2, 14); }
    if (this.t > 0 && this.t < 2.4 && this.state === "play") banner(c, `Level ${this.level + 1}: ${this.course.name}`, this.course.sub, Math.min(1, 2.4 - this.t));
  }
  drawCastle(c: CanvasRenderingContext2D, t: number) {
    const x0 = this.course.goal - 20, gy = this.groundAt(this.course.goal + 50);
    c.fillStyle = "#24352c"; c.fillRect(x0 + 20, gy - 190, 200, 190);
    c.fillStyle = "#2c3e33"; c.fillRect(x0, gy - 240, 50, 240); c.fillRect(x0 + 190, gy - 240, 50, 240);
    for (let x = x0; x < x0 + 240; x += 20) c.fillRect(x, x < x0 + 50 || x >= x0 + 190 ? gy - 254 : gy - 204, 12, 14);
    c.fillStyle = "rgba(0,0,0,0.2)"; for (let row = 0; row < 8; row++) for (let x = x0 + 22 + (row % 2) * 12; x < x0 + 216; x += 24) c.fillRect(x, gy - 186 + row * 22, 20, 2);
    // lit windows and the open gate
    c.fillStyle = `rgba(255,190,110,${0.7 + Math.sin(t * 3) * 0.1})`; c.fillRect(x0 + 18, gy - 200, 12, 20); c.fillRect(x0 + 208, gy - 200, 12, 20); c.fillRect(x0 + 112, gy - 160, 16, 24);
    c.fillStyle = "#0a1410"; box(c, x0 + 90, gy - 90, 60, 90, 28); c.fill();
    c.fillStyle = "rgba(255,190,110,0.12)"; c.beginPath(); c.arc(x0 + 120, gy - 40, 60, 0, Math.PI * 2); c.fill();
    c.fillStyle = C.brass; c.fillRect(x0 + 24, gy - 300, 3, 50);
    c.beginPath(); c.moveTo(x0 + 27, gy - 300); c.lineTo(x0 + 60, gy - 290 + Math.sin(t * 4) * 4); c.lineTo(x0 + 27, gy - 278); c.fill();
  }
  hud() {
    return [
      { label: "Level", value: `${this.level + 1}/${COURSES.length}` },
      { label: "Time", value: fmt(this.t) },
      { label: "Falls", value: String(this.deaths) },
      { label: "Flag", value: `${this.check}/${this.flags.length - 1}` },
    ];
  }
  goals(): [string, string, string] {
    const f = this.course.falls;
    return ["Reach the castle", `No more than ${f} ${f === 1 ? "fall" : "falls"}`, `Finish in under ${this.course.time} s`];
  }
  stars(): [boolean, boolean, boolean] {
    const won = this.state === "won";
    return [won, won && this.deaths <= this.course.falls, won && this.t < this.course.time];
  }
  result() { return `You reached the castle in ${fmt(this.t)} with ${this.deaths} ${this.deaths === 1 ? "fall" : "falls"}.`; }
  score() { return this.state === "won" ? Math.round(1e6 / Math.max(1, this.t + this.deaths * 3)) : 0; }
}
