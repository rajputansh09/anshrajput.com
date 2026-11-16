// Warehouse Wreckage
import { C, Fx, W, H, banner, box, clamp, label, painted, seeded, vignette, type Game, type Input, type State } from "./core";
import { sfx } from "./sfx";

const G = 1400, FLOOR = 500, BAY = 200;
type Kind = "crate" | "barrel" | "red" | "ball" | "static" | "rack" | "beam";
type Body = { kind: Kind; x: number; y: number; w: number; h: number; r: number; vx: number; vy: number; m: number; hp: number; spin: number; dead: boolean; sleep: number; col: string; trail: { x: number; y: number }[]; grp?: number; hits?: number; hitAt?: number; rest?: boolean };
const LAUNCH = { x: 90, y: 430 };

const mk = (kind: Kind, x: number, y: number, s = 40): Body => {
  const circle = kind === "barrel" || kind === "red" || kind === "ball";
  return {
    kind, x, y, w: s, h: s, r: circle ? s / 2 : 0, vx: 0, vy: 0,
    m: kind === "static" ? 0 : kind === "ball" ? 9 : kind === "crate" ? (s * s) / 1600 : 1.4,
    hp: 100, spin: 0, dead: false, sleep: 0, col: kind === "crate" ? ["#a87a4a", "#9a6e40", "#b5875a"][Math.floor(Math.random() * 3)] : "", trail: [],
  };
};
const plat = (x: number, y: number, w: number, h: number): Body => ({ ...mk("static", 0, 0), x: x + w / 2, y: y + h / 2, w, h });
// steel rack: a beam on two legs
let rackId = 0;
const shelf = (b: Body[], x: number, y: number, w: number) => {
  const g = ++rackId;
  for (const part of [plat(x, y, w, 14), plat(x + 4, y + 14, 10, FLOOR - y - 14), plat(x + w - 14, y + 14, 10, FLOOR - y - 14)]) b.push({ ...part, kind: "rack", grp: g, hits: 0 });
};
const frame = (): Body[] => [plat(0, FLOOR, W, 60), plat(-40, -400, 40, FLOOR + 400), plat(W, -400, 40, FLOOR + 400)];
// pyramid or block of crates sitting on base
const stack = (b: Body[], x: number, base: number, rows: number[], s = 40) => {
  rows.forEach((n, r) => { const off = ((rows[0] - n) * (s + 1)) / 2; for (let i = 0; i < n; i++) b.push(mk("crate", x + off + i * (s + 1), base - s / 2 - r * (s + 1), s)); });
};

type Level = { name: string; sub: string; shots: number; goal: number; spare: number; build: () => Body[] };
export const LEVELS: Level[] = [
  {
    name: "Loading Bay", sub: "Five balls. Break 80% of the crates. Red barrels explode.", shots: 5, goal: 0.8, spare: 1,
    build: () => {
      const b = frame();
      shelf(b, 470, 380, 200); shelf(b, 720, 250, 200);
      stack(b, 330, FLOOR, [3, 2, 1]);
      b.push(mk("red", 430, FLOOR - 18, 36));
      stack(b, 500, 380, [4, 3], 38);
      b.push(mk("barrel", 640, 380 - 60, 32));
      stack(b, 752, 250, [4, 2], 38);
      b.push(mk("red", 860, 250 - 58, 34));
      for (let i = 0; i < 3; i++) b.push(mk("crate", 760 + i * 44, FLOOR - 21, 42));
      b.push(mk("barrel", 900, FLOOR - 16, 32));
      return b;
    },
  },
  {
    name: "High Racks", sub: "Five balls, three racks, three red barrels. Break 75%.", shots: 5, goal: 0.75, spare: 1,
    build: () => {
      const b = frame();
      shelf(b, 420, 400, 180); shelf(b, 640, 300, 170); shelf(b, 830, 170, 110);
      stack(b, 260, FLOOR, [3, 2, 1]);
      b.push(mk("red", 395, FLOOR - 18, 36));
      stack(b, 440, 400, [4, 3], 36);
      b.push(mk("red", 560, 400 - 3 * 37 - 18, 34));
      stack(b, 660, 300, [4, 3, 2], 34);
      b.push(mk("barrel", 790, 300 - 17, 30));
      stack(b, 846, 170, [2, 2], 36);
      b.push(mk("red", 885, 170 - 2 * 37 - 18, 34));
      for (let i = 0; i < 3; i++) b.push(mk("crate", 670 + i * 42, FLOOR - 20, 40));
      return b;
    },
  },
  {
    name: "The Tower", sub: "Five balls against a five-storey stack and a high shelf.", shots: 5, goal: 0.8, spare: 1,
    build: () => {
      const b = frame();
      shelf(b, 340, 420, 150); shelf(b, 800, 200, 140);
      stack(b, 356, 420, [3, 2], 38);
      b.push(mk("barrel", 470, 420 - 16, 30));
      stack(b, 600, FLOOR, [4, 4, 3, 3, 2], 38);
      b.push(mk("red", 575, FLOOR - 18, 34));
      b.push(mk("red", 700, FLOOR - 5 * 39 - 18, 32));
      stack(b, 816, 200, [3, 2, 1], 36);
      b.push(mk("red", 918, 200 - 18, 32));
      b.push(mk("barrel", 900, FLOOR - 16, 32));
      return b;
    },
  },
];

// brick wall, high window, concrete floor
let backdrop: HTMLCanvasElement | null | undefined;
function wall() {
  if (backdrop !== undefined) return backdrop;
  const r = seeded(41);
  backdrop = painted((c) => {
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#14191a"); bg.addColorStop(1, "#1e2522");
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    for (let y = 0; y < FLOOR; y += 18) for (let x = (y / 18) % 2 ? -20 : 0; x < W; x += 40) {
      const v = 26 + Math.floor(r() * 8);
      c.fillStyle = `rgb(${v + 6},${v},${v - 2})`; c.fillRect(x + 1, y + 1, 38, 16);
    }
    c.fillStyle = "rgba(0,0,0,0.35)"; c.fillRect(0, 0, W, FLOOR);
    // windows with light shafts
    for (const wx of [260, 620]) {
      c.fillStyle = "rgba(216,200,150,0.16)"; c.fillRect(wx, 40, 150, 80);
      c.strokeStyle = "rgba(216,180,106,0.25)"; c.lineWidth = 3; c.strokeRect(wx, 40, 150, 80);
      c.beginPath(); c.moveTo(wx + 75, 40); c.lineTo(wx + 75, 120); c.moveTo(wx, 80); c.lineTo(wx + 150, 80); c.stroke();
      const g = c.createLinearGradient(0, 120, 0, FLOOR);
      g.addColorStop(0, "rgba(240,220,170,0.08)"); g.addColorStop(1, "rgba(240,220,170,0)");
      c.fillStyle = g; c.beginPath(); c.moveTo(wx, 120); c.lineTo(wx + 150, 120); c.lineTo(wx + 230, FLOOR); c.lineTo(wx + 60, FLOOR); c.fill();
    }
    c.fillStyle = "#2a302c"; c.fillRect(0, FLOOR, W, H - FLOOR);
    for (let k = 0; k < 40; k++) { c.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.12})`; c.beginPath(); c.ellipse(r() * W, FLOOR + 6 + r() * 30, 10 + r() * 30, 3 + r() * 4, 0, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = "rgba(216,180,106,0.35)"; for (let x = 0; x < W; x += 60) c.fillRect(x, FLOOR + 2, 30, 3);
  });
  return backdrop;
}

export class Warehouse implements Game {
  state: State = "play";
  level: number;
  L: Level;
  bodies: Body[] = [];
  fx = new Fx();
  shots = 5;
  charge = 0;
  aim = -0.35;
  total = 0;
  t = 0;
  endAt = 0;
  constructor(level = 0) { this.level = clamp(level, 0, LEVELS.length - 1); this.L = LEVELS[this.level]; this.reset(); }
  reset() {
    this.state = "play"; this.shots = this.L.shots; this.charge = 0; this.aim = -0.35; this.t = 0; this.endAt = 0; this.fx = new Fx();
    this.bodies = this.L.build();
    this.total = this.bodies.filter((x) => x.kind === "crate").length;
  }
  get broken() { return this.bodies.filter((x) => x.kind === "crate" && x.dead).length; }
  step(dt: number, inp: Input) {
    this.fx.step(dt);
    const sub = 4, h = dt / sub;
    for (let k = 0; k < sub; k++) this.physics(h);
    for (const b of this.bodies) if (b.kind === "ball" && !b.dead) { b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 8) b.trail.shift(); }
    if (this.state !== "play") return;
    this.t += dt;
    // aim with the pointer on desktop, the stick on touch
    if (inp.aimed) this.aim = clamp(Math.atan2(inp.aimY - LAUNCH.y, inp.aimX - LAUNCH.x), -1.35, 0.35);
    else if (Math.hypot(inp.bx, inp.by) > 0.35) this.aim = clamp(Math.atan2(inp.by, Math.max(0.05, inp.bx)), -1.35, 0.35);
    else if (inp.drag) this.aim = clamp(this.aim + inp.drag * 0.0065, -1.35, 0.35);
    else this.aim = clamp(this.aim + (inp.ay - inp.ax * 0.5) * 1.2 * dt, -1.35, 0.35);
    // hold to charge, release to throw
    if (this.shots > 0 && !this.endAt) {
      if (inp.fire) this.charge = Math.min(1, this.charge + dt * 0.9);
      else if (this.charge > 0) {
        const v = 380 + this.charge * 760, ball = mk("ball", LAUNCH.x + Math.cos(this.aim) * 30, LAUNCH.y + Math.sin(this.aim) * 30, 28);
        ball.vx = Math.cos(this.aim) * v; ball.vy = Math.sin(this.aim) * v;
        this.bodies.push(ball);
        this.shots--; this.charge = 0;
        this.fx.burst(ball.x, ball.y, C.brass, 8, 120, 0, 2);
        this.fx.smoke(ball.x, ball.y, 3, "rgba(150,150,140,1)", 8, -10);
        sfx.play("throw");
      }
    }
    if (this.broken >= this.total) { this.state = "won"; sfx.play("win"); return; }
    // out of balls, give the last one a few seconds
    if (this.shots === 0 && !this.endAt) this.endAt = this.t + 4;
    if (this.endAt && this.t > this.endAt) {
      this.state = this.broken / this.total >= this.L.goal ? "won" : "lost";
      sfx.play(this.state === "won" ? "win" : "lose");
    }
  }
  physics(dt: number) {
    const B = this.bodies.filter((b) => !b.dead);
    for (const b of B) {
      b.rest = false;
      if (!b.m) continue;
      b.vy += G * dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.r) b.spin += (b.vx / b.r) * dt;
      // keep crates out of the area in front of the thrower so a blast can't push one where no throw can reach
      if (b.kind !== "ball" && b.x - b.w / 2 < BAY) { b.x = BAY + b.w / 2; if (b.vx < 0) b.vx *= -0.3; }
      if (b.x < -100 || b.x > W + 100 || b.y > H + 200) b.dead = b.kind !== "crate" ? true : b.dead;
    }
    for (let it = 0; it < 3; it++)
      for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
        const a = B[i], b = B[j];
        if (!a.m && !b.m) continue;
        this.collide(a, b);
      }
    // balls stop and fade
    for (const b of B) {
      if (b.kind === "ball" && Math.hypot(b.vx, b.vy) < 20) { b.sleep += dt; if (b.sleep > 2) b.dead = true; }
      else if ((b.kind === "crate" || b.kind === "beam") && b.rest && Math.abs(b.vx) + Math.abs(b.vy) < 16) { b.vx *= 0.6; b.vy *= 0.6; }
    }
  }
  collide(a: Body, b: Body) {
    let nx = 0, ny = 0, pen = 0;
    if (a.r && b.r) {
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), s = a.r + b.r;
      if (d >= s || d === 0) return;
      nx = dx / d; ny = dy / d; pen = s - d;
    } else if (!a.r && !b.r) {
      const ox = (a.w + b.w) / 2 - Math.abs(b.x - a.x), oy = (a.h + b.h) / 2 - Math.abs(b.y - a.y);
      if (ox <= 0 || oy <= 0) return;
      if (ox < oy) { nx = Math.sign(b.x - a.x) || 1; pen = ox; } else { ny = Math.sign(b.y - a.y) || 1; pen = oy; }
    } else {
      const c = a.r ? a : b, r = a.r ? b : a;
      const cx = clamp(c.x, r.x - r.w / 2, r.x + r.w / 2), cy = clamp(c.y, r.y - r.h / 2, r.y + r.h / 2);
      let dx = c.x - cx, dy = c.y - cy, d = Math.hypot(dx, dy);
      if (d >= c.r) return;
      if (d === 0) { dx = 0; dy = -1; d = 1; pen = c.r; } else pen = c.r - d;
      // normal from a to b
      const sx = dx / d, sy = dy / d;
      if (c === b) { nx = sx; ny = sy; } else { nx = -sx; ny = -sy; }
    }
    // which one is on top (normal points a to b, y grows down)
    if (ny > 0.5) a.rest = true; else if (ny < -0.5) b.rest = true;
    const ia = a.m ? 1 / a.m : 0, ib = b.m ? 1 / b.m : 0, sum = ia + ib;
    if (!sum) return;
    const corr = Math.max(0, pen - 0.5) / sum * 0.8;
    a.x -= nx * corr * ia; a.y -= ny * corr * ia;
    b.x += nx * corr * ib; b.y += ny * corr * ib;
    const rvx = b.vx - a.vx, rvy = b.vy - a.vy, vn = rvx * nx + rvy * ny;
    if (vn > 0) return;
    const e = a.kind === "ball" || b.kind === "ball" ? 0.25 : 0.08;
    const j = (-(1 + e) * vn) / sum;
    a.vx -= j * nx * ia; a.vy -= j * ny * ia;
    b.vx += j * nx * ib; b.vy += j * ny * ib;
    // friction
    const tx = -ny, ty = nx, vt = rvx * tx + rvy * ty, jt = clamp(-vt / sum, -j * 0.6, j * 0.6);
    a.vx -= jt * tx * ia; a.vy -= jt * ty * ia;
    b.vx += jt * tx * ib; b.vy += jt * ty * ib;
    // damage from hard hits, with a knock sound and a dust puff
    const hit = -vn;
    if (hit > 240) {
      const px = (a.x + b.x) / 2, py = (a.y + b.y) / 2;
      if (hit > 420) { this.fx.smoke(px, py, 2, "rgba(160,150,130,1)", 7, -20); sfx.play(a.kind === "ball" || b.kind === "ball" ? "knock" : "land", Math.min(1, hit / 900)); }
      for (const q of [a, b]) this.hurt(q, (hit - 240) * (q === a ? (b.kind === "ball" ? 0.55 : 0.3) : (a.kind === "ball" ? 0.55 : 0.3)));
    }
    // a ball hitting a rack counts as one hit
    if (hit > 260) for (const [q, o] of [[a, b], [b, a]] as const) if (q.kind === "rack" && o.kind === "ball") this.hitRack(q, (a.x + b.x) / 2, (a.y + b.y) / 2, o.vx);
  }
  // racks take 2 hits: a dent with sparks, then they buckle and turn into loose steel
  hitRack(q: Body, px: number, py: number, push: number) {
    if (q.kind !== "rack" || this.t - (q.hitAt ?? -9) < 0.25) return;
    const parts = this.bodies.filter((o) => o.grp === q.grp && o.kind === "rack");
    for (const o of parts) { o.hits = (o.hits ?? 0) + 1; o.hitAt = this.t; }
    this.fx.spray(px, py, -Math.PI / 2, 2.4, "#ffd36a", 12, 260, 2);
    sfx.play("metal");
    if ((q.hits ?? 0) < 2) { this.fx.shake = Math.max(this.fx.shake, 0.3); return; }
    for (const o of parts) {
      o.kind = "beam"; o.sleep = 0;
      if (o.w > o.h) {
        // beam drops with everything on it
        o.m = 2.5; o.vx = Math.sign(push || 1) * (60 + Math.random() * 80); o.vy = -40;
      } else {
        // legs buckle into stubs so nothing is held up anymore
        this.fx.spray(o.x, o.y, -Math.PI / 2, 1.6, "#ffd36a", 8, 220, 2);
        o.h = 18; o.y = FLOOR - 9; o.m = 1.5; o.vx = 0; o.vy = 0;
      }
    }
    this.fx.burst(px, py, "#ffd36a", 26, 320, 900, 2.5);
    this.fx.smoke(px, py, 6, "rgba(120,120,115,1)", 12, -30);
    this.fx.shake = 0.7;
    sfx.play("crate");
  }
  hurt(q: Body, dmg: number) {
    if (q.dead || !q.m || q.kind === "ball" || q.kind === "barrel") return;
    q.hp -= dmg;
    if (q.hp > 0) return;
    q.dead = true;
    if (q.kind === "crate") {
      this.fx.chunks(q.x, q.y, q.col || "#a87a4a", 12, 280, 900, 7);
      this.fx.burst(q.x, q.y, "#c9955e", 10, 200, 900, 3);
      this.fx.smoke(q.x, q.y, 4, "rgba(170,150,120,1)", 12, -30);
      this.fx.decal(q.x, Math.min(FLOOR - 2, q.y + q.h / 2), 22, "rgba(60,40,20,0.35)", 30);
      this.fx.shake = Math.max(this.fx.shake, 0.35);
      sfx.play("crate");
    } else if (q.kind === "red") {
      // explosion: radial push that throws and damages everything nearby
      this.fx.burst(q.x, q.y, C.fire, 70, 440, 0, 5);
      this.fx.chunks(q.x, q.y, "#8a2a1e", 10, 360, 900, 6);
      this.fx.smoke(q.x, q.y, 16, "rgba(80,76,70,1)", 22, -40);
      this.fx.ring(q.x, q.y, 190, "rgba(255,200,120,1)", 0.5, 8);
      this.fx.decal(q.x, Math.min(FLOOR - 2, q.y + 10), 60, "rgba(10,8,6,0.7)", 60);
      this.fx.shake = 1; this.fx.flash = 0.8;
      sfx.play("boom");
      for (const o of this.bodies) {
        if (o.kind === "rack" && Math.hypot(o.x - q.x, o.y - q.y) < 190 + Math.max(o.w, o.h) / 2) this.hitRack(o, o.x, o.y, o.x - q.x);
        if (o.dead || !o.m || o === q) continue;
        const dx = o.x - q.x, dy = o.y - q.y, d = Math.hypot(dx, dy);
        if (d > 190) continue;
        const f = (1 - d / 190) * 900;
        o.vx += (dx / (d || 1)) * f; o.vy += (dy / (d || 1)) * f - 200;
        this.hurt(o, (1 - d / 190) * 140);
      }
    }
  }
  draw(c: CanvasRenderingContext2D, t: number) {
    const o = this.fx.offset();
    c.save(); c.translate(o.x, o.y);
    const bd = wall();
    if (bd) c.drawImage(bd, 0, 0); else { c.fillStyle = "#171c1a"; c.fillRect(-20, -20, W + 40, H + 40); }
    // hanging lamps swaying a bit
    for (const lx of [180, 540, 860]) {
      const sw = Math.sin(t * 1.3 + lx) * 0.05, ex = lx + Math.sin(sw) * 70, ey = Math.cos(sw) * 70;
      c.strokeStyle = "#3a403c"; c.lineWidth = 2; c.beginPath(); c.moveTo(lx, 0); c.lineTo(ex, ey); c.stroke();
      c.fillStyle = "#3f4a44"; c.beginPath(); c.moveTo(ex - 16, ey + 10); c.lineTo(ex + 16, ey + 10); c.lineTo(ex + 8, ey); c.lineTo(ex - 8, ey); c.fill();
      const g = c.createRadialGradient(ex, ey + 12, 0, ex, ey + 12, 150);
      g.addColorStop(0, "rgba(255,220,150,0.16)"); g.addColorStop(1, "rgba(255,220,150,0)");
      c.fillStyle = g; c.fillRect(ex - 150, ey - 138, 300, 300);
      c.fillStyle = "#ffe3a8"; c.fillRect(ex - 7, ey + 9, 14, 3);
    }
    this.fx.drawUnder(c);
    for (const b of this.bodies) {
      if (b.dead) continue;
      // contact shadow
      if (b.kind !== "static") { c.fillStyle = "rgba(0,0,0,0.25)"; c.beginPath(); c.ellipse(b.x + 4, b.y + (b.r || b.h / 2) + 2, (b.r || b.w / 2) * 0.9, 4, 0, 0, Math.PI * 2); c.fill(); }
      if (b.kind === "ball" && b.trail.length > 2) {
        c.strokeStyle = "rgba(200,210,215,0.18)"; c.lineWidth = b.r * 1.2; c.lineCap = "round";
        c.beginPath(); c.moveTo(b.trail[0].x, b.trail[0].y); for (const p of b.trail) c.lineTo(p.x, p.y); c.stroke();
      }
      c.save(); c.translate(b.x, b.y);
      if (b.kind === "static" || b.kind === "rack" || b.kind === "beam") {
        const floor = b.y > FLOOR;
        if (b.kind === "beam") c.rotate(Math.sin(b.x * 0.05) * 0.06);
        if (!floor && b.w > 30 && b.h > 1) {
          c.fillStyle = b.kind === "beam" ? "#3f4c54" : "#4b5a63"; c.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
          if ((b.hits ?? 0) > 0 && b.kind === "rack") { c.fillStyle = "#2b343a"; c.beginPath(); c.moveTo(-8, -b.h / 2); c.lineTo(0, b.h / 2); c.lineTo(8, -b.h / 2); c.fill(); }
          if (b.h < 20) { c.fillStyle = C.brass; c.fillRect(-b.w / 2, -b.h / 2, b.w, 3); c.fillStyle = "#2b343a"; for (let x = -b.w / 2 + 10; x < b.w / 2; x += 30) c.fillRect(x, -1, 3, 3); }
        } else if (!floor && b.x > 0 && b.x < W) {
          c.fillStyle = "#3d4950"; c.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
          c.strokeStyle = "rgba(0,0,0,0.3)"; c.lineWidth = 1; for (let y = -b.h / 2 + 16; y < b.h / 2; y += 24) { c.beginPath(); c.moveTo(-b.w / 2, y); c.lineTo(b.w / 2, y + 8); c.stroke(); }
        }
      } else if (b.kind === "crate") {
        const dmg = 1 - b.hp / 100, hw = b.w / 2, hh = b.h / 2;
        c.fillStyle = b.col; c.fillRect(-hw, -hh, b.w, b.h);
        // planks and frame
        c.fillStyle = "rgba(0,0,0,0.12)"; for (let y = -hh + b.h / 4; y < hh; y += b.h / 4) c.fillRect(-hw, y, b.w, 1.5);
        c.strokeStyle = "#6e4a2a"; c.lineWidth = 3; c.strokeRect(-hw + 2, -hh + 2, b.w - 4, b.h - 4);
        c.beginPath(); c.moveTo(-hw + 3, -hh + 3); c.lineTo(hw - 3, hh - 3); c.stroke();
        c.fillStyle = "rgba(255,240,200,0.12)"; c.fillRect(-hw + 2, -hh + 2, b.w - 4, 2);
        if (dmg > 0.25) { c.strokeStyle = "rgba(0,0,0,0.55)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-6, -hh); c.lineTo(2, -4); c.lineTo(-3, 6); if (dmg > 0.6) { c.moveTo(hw, 2); c.lineTo(4, 4); c.lineTo(8, hh); } c.stroke(); }
      } else {
        c.rotate(b.spin);
        if (b.kind === "ball") {
          const g = c.createRadialGradient(-b.r * 0.4, -b.r * 0.4, 1, 0, 0, b.r);
          g.addColorStop(0, "#c9d2d8"); g.addColorStop(0.5, "#6b7680"); g.addColorStop(1, "#2e353b");
          c.fillStyle = g; c.beginPath(); c.arc(0, 0, b.r, 0, Math.PI * 2); c.fill();
        } else {
          c.fillStyle = b.kind === "red" ? "#b83a2a" : "#3f6f8f"; c.beginPath(); c.arc(0, 0, b.r, 0, Math.PI * 2); c.fill();
          c.strokeStyle = "rgba(0,0,0,0.3)"; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, b.r * 0.68, 0, Math.PI * 2); c.stroke();
          c.strokeStyle = "rgba(255,255,255,0.22)"; c.beginPath(); c.arc(0, 0, b.r * 0.85, -2.4, -1.2); c.stroke();
          if (b.kind === "red") {
            c.rotate(-b.spin);
            const pulse = 0.5 + Math.sin(t * 5 + b.x) * 0.5;
            c.fillStyle = `rgba(255,170,90,${0.15 + pulse * 0.2})`; c.beginPath(); c.arc(0, 0, b.r + 5, 0, Math.PI * 2); c.fill();
            c.fillStyle = "#ffd36a"; c.beginPath(); c.moveTo(0, -9); c.lineTo(8, 6); c.lineTo(-8, 6); c.fill();
            label(c, "!", 0, 2, 11, "#5a1a10", "center", 800);
          }
        }
      }
      c.restore();
    }
    // launcher and aim guide
    c.fillStyle = "#2c3a33"; box(c, LAUNCH.x - 34, LAUNCH.y, 68, FLOOR - LAUNCH.y, 6); c.fill();
    c.fillStyle = "#3a4d44"; box(c, LAUNCH.x - 30, LAUNCH.y + 4, 60, 8, 3); c.fill();
    c.save(); c.translate(LAUNCH.x, LAUNCH.y); c.rotate(this.aim);
    c.fillStyle = "#3a4d44"; box(c, -10, -12, 54, 24, 6); c.fill();
    c.fillStyle = "#4e6459"; box(c, -6, -8, 40, 6, 3); c.fill();
    c.fillStyle = C.brass; c.fillRect(30 - this.charge * 6, -12, 6, 24);
    c.restore();
    c.fillStyle = "#4a5a52"; c.beginPath(); c.arc(LAUNCH.x, LAUNCH.y, 10, 0, Math.PI * 2); c.fill();
    if (this.state === "play" && this.shots > 0) {
      const v = 380 + Math.max(0.15, this.charge) * 760;
      c.fillStyle = "rgba(216,180,106,0.7)";
      for (let k = 1; k < 16; k++) {
        const tt = k * 0.045, x = LAUNCH.x + Math.cos(this.aim) * (30 + v * tt), y = LAUNCH.y + Math.sin(this.aim) * 30 + Math.sin(this.aim) * v * tt + 0.5 * G * tt * tt;
        c.globalAlpha = 1 - k / 16; c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); c.fill();
      }
      c.globalAlpha = 1;
      c.fillStyle = "rgba(0,0,0,0.5)"; box(c, LAUNCH.x - 30, LAUNCH.y + 26, 60, 6, 3); c.fill();
      c.fillStyle = this.charge > 0.85 ? "#ffd36a" : C.fire; box(c, LAUNCH.x - 30, LAUNCH.y + 26, 60 * this.charge, 6, 3); c.fill();
    }
    // balls left
    for (let k = 0; k < this.L.shots; k++) { c.fillStyle = k < this.shots ? "#8a96a0" : "#2a322e"; c.beginPath(); c.arc(30 + k * 18, 30, 6, 0, Math.PI * 2); c.fill(); }
    // progress to the goal
    const pct = this.broken / this.total;
    c.fillStyle = "rgba(0,0,0,0.5)"; box(c, W - 230, 22, 200, 10, 3); c.fill();
    c.fillStyle = pct >= this.L.goal ? C.moss : C.brass; box(c, W - 230, 22, 200 * pct, 10, 3); c.fill();
    c.fillStyle = "#e6efe8"; c.fillRect(W - 230 + 200 * this.L.goal - 1, 18, 2, 18);
    this.fx.draw(c);
    c.restore();
    vignette(c, 0.45);
    this.fx.drawFlash(c);
    if (this.t > 0 && this.t < 2.6 && this.state === "play") banner(c, `Level ${this.level + 1}: ${this.L.name}`, this.L.sub, Math.min(1, 2.6 - this.t));
  }
  hud() {
    return [
      { label: "Level", value: `${this.level + 1}/${LEVELS.length}` },
      { label: "Wrecked", value: `${Math.round((this.broken / this.total) * 100)}%` },
      { label: "Crates", value: `${this.broken}/${this.total}` },
      { label: "Balls", value: String(this.shots) },
    ];
  }
  goals(): [string, string, string] { return [`Wreck ${Math.round(this.L.goal * 100)}% of the crates`, "Wreck every single crate", `Win with ${this.L.spare}+ balls to spare`]; }
  stars(): [boolean, boolean, boolean] {
    const won = this.state === "won";
    return [won, won && this.broken >= this.total, won && this.shots >= this.L.spare];
  }
  result() {
    const pct = Math.round((this.broken / this.total) * 100);
    return this.state === "won"
      ? `${pct}% of the warehouse wrecked with ${this.shots} ${this.shots === 1 ? "ball" : "balls"} to spare.`
      : `${pct}% wrecked. ${Math.round(this.L.goal * 100)}% clears the warehouse.`;
  }
  score() { return this.state === "won" ? this.broken * 100 + this.shots * 250 : 0; }
}
