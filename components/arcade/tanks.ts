// Toon Tanks, based on my Unreal C++ (ATank, ATower, UHealthComponent, AProjectile, AToonTanksGameMode)
import { C, Fx, W, H, banner, bar, box, circleOut, clamp, dist, label, painted, rnd, seeded, trace, turnTo, vignette, wrap, lockOn, type Game, type Input, type Rect, type State } from "./core";
import { sfx } from "./sfx";

const SPEED = 170;
const TURN = (100 * Math.PI) / 180;
const SHELL = 520;
const DAMAGE = 20;
const HP = 100;
const RANGE = 300;
const RATE = 2;
const DELAY = 3;
const R = 18;

type Pawn = { x: number; y: number; hull: number; turret: number; hp: number; cool: number; flash: number; muzzle: number };
type Shell = { x: number; y: number; vx: number; vy: number; own: "tank" | "tower"; life: number; px: number; py: number };
type Level = { name: string; sub: string; start: { x: number; y: number; a: number }; walls: Rect[]; towers: { x: number; y: number }[]; hull: number; time: number };

export const LEVELS: Level[] = [
  {
    name: "Training Ground", sub: "Five towers. Learn the rhythm: they fire every 2 seconds.",
    start: { x: 90, y: 270, a: 0 },
    walls: [
      { x: 300, y: 120, w: 40, h: 150 }, { x: 620, y: 270, w: 40, h: 150 }, { x: 430, y: 60, w: 120, h: 34 },
      { x: 430, y: 446, w: 120, h: 34 }, { x: 150, y: 380, w: 110, h: 34 }, { x: 720, y: 120, w: 110, h: 34 },
    ],
    towers: [{ x: 520, y: 230 }, { x: 870, y: 80 }, { x: 860, y: 450 }, { x: 210, y: 470 }, { x: 420, y: 330 }],
    hull: 80, time: 40,
  },
  {
    name: "Crossfire", sub: "Seven towers that cover each other. Use the walls.",
    start: { x: 80, y: 270, a: 0 },
    walls: [
      { x: 240, y: 60, w: 36, h: 160 }, { x: 240, y: 320, w: 36, h: 160 }, { x: 470, y: 180, w: 40, h: 180 },
      { x: 640, y: 70, w: 150, h: 34 }, { x: 640, y: 436, w: 150, h: 34 }, { x: 800, y: 230, w: 34, h: 80 },
    ],
    towers: [{ x: 380, y: 110 }, { x: 380, y: 430 }, { x: 600, y: 270 }, { x: 720, y: 160 }, { x: 720, y: 380 }, { x: 890, y: 90 }, { x: 890, y: 450 }],
    hull: 60, time: 60,
  },
  {
    name: "The Citadel", sub: "Nine towers, two of them inside the keep.",
    start: { x: 70, y: 470, a: -0.6 },
    walls: [
      { x: 520, y: 150, w: 90, h: 28 }, { x: 670, y: 150, w: 90, h: 28 }, { x: 520, y: 362, w: 90, h: 28 }, { x: 670, y: 362, w: 90, h: 28 },
      { x: 520, y: 178, w: 28, h: 60 }, { x: 520, y: 302, w: 28, h: 60 }, { x: 732, y: 178, w: 28, h: 60 }, { x: 732, y: 302, w: 28, h: 60 },
      { x: 200, y: 330, w: 110, h: 30 }, { x: 330, y: 120, w: 30, h: 130 }, { x: 150, y: 150, w: 30, h: 110 },
      { x: 860, y: 200, w: 30, h: 140 }, { x: 380, y: 420, w: 30, h: 100 },
    ],
    towers: [{ x: 250, y: 70 }, { x: 440, y: 250 }, { x: 470, y: 480 }, { x: 700, y: 470 }, { x: 880, y: 80 }, { x: 880, y: 470 }, { x: 930, y: 270 }, { x: 640, y: 225 }, { x: 640, y: 315 }],
    hull: 40, time: 90,
  },
];

// floor and walls painted once per level: grass with dirt patches, stone walls with shadows
const floors: (HTMLCanvasElement | null)[] = [];
function floor(lv: number) {
  if (floors[lv] !== undefined) return floors[lv];
  const L = LEVELS[lv], rnd2 = seeded(7 + lv * 31);
  floors[lv] = painted((c) => {
    c.fillStyle = "#173a24"; c.fillRect(0, 0, W, H);
    for (let k = 0; k < 900; k++) {
      const x = rnd2() * W, y = rnd2() * H, r = 6 + rnd2() * 26;
      c.fillStyle = rnd2() < 0.5 ? "rgba(36,84,50,0.35)" : "rgba(14,42,26,0.35)";
      c.beginPath(); c.ellipse(x, y, r, r * 0.6, rnd2() * 3, 0, Math.PI * 2); c.fill();
    }
    // worn dirt patches
    for (let k = 0; k < 14; k++) {
      const x = rnd2() * W, y = rnd2() * H, r = 30 + rnd2() * 60;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(92,74,48,0.28)"); g.addColorStop(1, "rgba(92,74,48,0)");
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
    // grass tufts
    c.strokeStyle = "rgba(120,190,120,0.22)"; c.lineWidth = 1.2;
    for (let k = 0; k < 700; k++) {
      const x = rnd2() * W, y = rnd2() * H;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - 2 + rnd2() * 4, y - 4 - rnd2() * 4); c.stroke();
    }
    for (const wl of L.walls) {
      c.fillStyle = "rgba(0,0,0,0.38)"; box(c, wl.x + 6, wl.y + 9, wl.w, wl.h, 6); c.fill();
      c.fillStyle = "#4e4132"; box(c, wl.x, wl.y, wl.w, wl.h, 6); c.fill();
      c.fillStyle = "#6e5b43"; box(c, wl.x + 2, wl.y + 2, wl.w - 4, wl.h - 7, 5); c.fill();
      // stone rows
      c.strokeStyle = "rgba(40,30,20,0.55)"; c.lineWidth = 1.5;
      const horiz = wl.w >= wl.h, step = 18;
      if (horiz) for (let x = wl.x + step; x < wl.x + wl.w - 4; x += step) { c.beginPath(); c.moveTo(x, wl.y + 3); c.lineTo(x, wl.y + wl.h - 6); c.stroke(); }
      else for (let y = wl.y + step; y < wl.y + wl.h - 6; y += step) { c.beginPath(); c.moveTo(wl.x + 3, y); c.lineTo(wl.x + wl.w - 3, y); c.stroke(); }
      c.fillStyle = "rgba(255,240,210,0.12)"; c.fillRect(wl.x + 4, wl.y + 3, wl.w - 8, 2);
    }
    // arena border
    c.strokeStyle = "rgba(0,0,0,0.5)"; c.lineWidth = 10; c.strokeRect(0, 0, W, H);
  });
  return floors[lv];
}

export class Tanks implements Game {
  state: State = "play";
  level: number;
  L: Level;
  tank!: Pawn;
  towers: Pawn[] = [];
  shells: Shell[] = [];
  fx = new Fx();
  t = 0;
  shots = 0;
  hits = 0;
  over = 0;
  trail = 0;
  tread = 0;
  ticked = 0;
  lock: Pawn | null = null;
  constructor(level = 0) { this.level = clamp(level, 0, LEVELS.length - 1); this.L = LEVELS[this.level]; this.reset(); }
  get walls() { return this.L.walls; }
  reset() {
    this.state = "play";
    const s = this.L.start;
    this.tank = { x: s.x, y: s.y, hull: s.a, turret: s.a, hp: HP, cool: 0, flash: 0, muzzle: 0 };
    this.towers = this.L.towers.map((p) => ({ ...p, hull: 0, turret: Math.PI, hp: HP, cool: rnd(0.4, RATE), flash: 0, muzzle: 0 }));
    this.shells = [];
    this.fx = new Fx();
    this.t = 0; this.shots = 0; this.hits = 0; this.over = 0; this.trail = 0; this.tread = 0; this.ticked = 0;
  }
  get live() { return this.t >= DELAY && this.state === "play"; }
  fire(p: Pawn, own: Shell["own"]) {
    const a = p.turret, mx = p.x + Math.cos(a) * (R + 14), my = p.y + Math.sin(a) * (R + 14);
    this.shells.push({ x: mx, y: my, vx: Math.cos(a) * SHELL, vy: Math.sin(a) * SHELL, own, life: 2, px: mx, py: my });
    this.fx.spray(mx, my, a, 0.8, C.fire, 8, 220, 2);
    this.fx.smoke(mx, my, 3, "rgba(160,160,150,1)", 8, -10);
    p.muzzle = 0.09;
    sfx.play(own === "tank" ? "shell" : "shellLow", own === "tank" ? 1 : 0.8);
  }
  step(dt: number, inp: Input) {
    this.t += dt;
    this.fx.step(dt);
    const k = this.tank;
    k.flash = Math.max(0, k.flash - dt); k.muzzle = Math.max(0, k.muzzle - dt);
    for (const tw of this.towers) { tw.flash = Math.max(0, tw.flash - dt); tw.muzzle = Math.max(0, tw.muzzle - dt); }
    if (this.state !== "play") { this.over += dt; this.moveShells(dt); return; }
    // countdown beeps, then go
    const sec = Math.ceil(DELAY - this.t);
    if (this.t < DELAY && sec !== this.ticked) { this.ticked = sec; sfx.play("tick"); }
    if (this.t >= DELAY && this.ticked > 0) { this.ticked = 0; sfx.play("go"); }
    if (this.live) {
      // w/S drive along the hull, A/D turn
      let fwd = -inp.ay, turn = inp.ax;
      if (inp.touch) {
        const m = Math.hypot(inp.ax, inp.ay);
        if (m > 0.1) {
          // point the stick where you want to go
          const want = Math.atan2(inp.ay, inp.ax);
          let d = wrap(want - k.hull), dir = 1;
          if (Math.abs(d) > 2.1) { d = wrap(d + Math.PI); dir = -1; }
          turn = clamp(d * 4, -1, 1);
          fwd = dir * Math.min(1, m) * Math.max(0, Math.cos(d)) ** 0.7;
        } else { fwd = 0; turn = 0; }
      }
      k.hull += turn * TURN * dt;
      const ox = k.x, oy = k.y;
      k.x += Math.cos(k.hull) * fwd * SPEED * dt;
      k.y += Math.sin(k.hull) * fwd * SPEED * dt;
      // stop at walls, towers and the edge
      const p = { x: k.x, y: k.y };
      for (const wl of this.walls) circleOut(p, R, wl);
      for (const tw of this.towers) { const d = dist(p, tw); if (d < R + 22) { p.x = tw.x + ((p.x - tw.x) / d) * (R + 22); p.y = tw.y + ((p.y - tw.y) / d) * (R + 22); } }
      k.x = clamp(p.x, R, W - R); k.y = clamp(p.y, R, H - R);
      if (Number.isNaN(k.x)) { k.x = ox; k.y = oy; }
      // tread marks every few px
      const moved = Math.hypot(k.x - ox, k.y - oy);
      this.tread += moved * Math.sign(fwd || 1);
      this.trail += moved;
      if (this.trail > 9) {
        this.trail = 0;
        const nx = -Math.sin(k.hull), ny = Math.cos(k.hull);
        for (const sd of [-14, 14]) this.fx.decal(k.x + nx * sd, k.y + ny * sd, 4, "rgba(30,22,12,0.5)", 7, "bar", k.hull + Math.PI / 2);
      }
      // turret follows the cursor (RotateTurret)
      const stick = Math.hypot(inp.bx, inp.by) > 0.35;
      let aim = inp.aimed ? Math.atan2(inp.aimY - k.y, inp.aimX - k.x) : stick ? Math.atan2(inp.by, inp.bx) : k.hull;
      this.lock = null;
      if (!inp.aimed && !stick) {
        let best = Infinity;
        for (const tw of this.towers) { const d = dist(k, tw); if (d < best && trace(k.x, k.y, tw.x, tw.y, this.walls) >= 1) { best = d; aim = Math.atan2(tw.y - k.y, tw.x - k.x); this.lock = tw; } }
      }
      if (!inp.assist) this.lock = null;
      k.turret = turnTo(k.turret, aim, (inp.assist ? 12 : 9) * dt);
      k.cool -= dt;
      const aligned = Math.abs(wrap(aim - k.turret)) < 0.25;
      // touch: holding Fire keeps shooting while locked on
      const pull = inp.firePressed || (inp.touch && inp.fire && !!this.lock && aligned) || (stick && aligned);
      if (pull && k.cool <= 0) { this.fire(k, "tank"); k.cool = inp.touch ? 0.45 : 0.35; this.shots++; }
      // towers only track the tank in range and fire every 2s while it's in range and alive
      for (const tw of this.towers) {
        const inRange = dist(tw, k) <= RANGE;
        if (inRange) tw.turret = turnTo(tw.turret, Math.atan2(k.y - tw.y, k.x - tw.x), 4 * dt);
        tw.cool -= dt;
        if (tw.cool <= 0) { tw.cool = RATE; if (inRange && k.hp > 0) this.fire(tw, "tower"); }
      }
    }
    this.moveShells(dt);
  }
  moveShells(dt: number) {
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.px = s.x; s.py = s.y;
      const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt;
      s.life -= dt;
      const wallT = trace(s.x, s.y, nx, ny, this.walls);
      let hit = wallT < 1 || nx < 0 || nx > W || ny < 0 || ny > H || s.life <= 0;
      let onPawn = false;
      s.x = nx; s.y = ny;
      // onHit: damage anything except the owner, then destroy the shell
      if (!hit && this.state === "play") {
        const targets = s.own === "tank" ? this.towers : [this.tank];
        for (const p of targets) {
          if (dist(s, p) < R + 4) {
            hit = true; onPawn = true;
            p.hp -= DAMAGE; p.flash = 0.15;
            this.fx.shake = Math.max(this.fx.shake, 0.5);
            this.fx.text(p.x, p.y - 30, `-${DAMAGE}`, s.own === "tank" ? C.brass : C.danger, 15);
            sfx.play("hit");
            if (s.own === "tank") this.hits++;
            if (p.hp <= 0) this.died(p);
            break;
          }
        }
      }
      if (hit) {
        this.fx.burst(s.x, s.y, C.fire, 12, 170, 0, 2.5);
        this.fx.smoke(s.x, s.y, 3, "rgba(110,110,100,1)", 9, -20);
        if (!onPawn) { this.fx.decal(s.x, s.y, 14, "rgba(20,14,8,0.55)", 14); sfx.play("knock", 0.6); }
        this.shells.splice(i, 1);
      }
    }
  }
  // aToonTanksGameMode ActorDied
  died(p: Pawn) {
    this.fx.burst(p.x, p.y, C.fire, 46, 340, 0, 4);
    this.fx.chunks(p.x, p.y, p === this.tank ? "#3d8a5c" : "#7a6a55", 14, 280, 0, 7);
    this.fx.smoke(p.x, p.y, 14, "rgba(90,90,85,1)", 18, -30);
    this.fx.ring(p.x, p.y, 120);
    this.fx.decal(p.x, p.y, 46, "rgba(14,10,6,0.75)", 60);
    this.fx.shake = 1; this.fx.flash = 0.6;
    sfx.play("boom");
    if (p === this.tank) { this.state = "lost"; sfx.play("lose"); return; }
    this.towers = this.towers.filter((t) => t !== p);
    if (!this.towers.length) { this.state = "won"; sfx.play("win"); }
  }
  draw(c: CanvasRenderingContext2D, t: number) {
    const o = this.fx.offset();
    c.save(); c.translate(o.x, o.y);
    const f = floor(this.level);
    if (f) c.drawImage(f, 0, 0); else { c.fillStyle = "#173a24"; c.fillRect(-20, -20, W + 40, H + 40); }
    this.fx.drawUnder(c);
    // tower range rings, red when you're inside one
    for (const tw of this.towers) {
      const inR = dist(tw, this.tank) <= RANGE;
      c.strokeStyle = inR ? "rgba(240,140,122,0.45)" : "rgba(240,140,122,0.09)"; c.lineWidth = inR ? 2 : 1;
      c.setLineDash([8, 10]); c.lineDashOffset = -t * 30;
      c.beginPath(); c.arc(tw.x, tw.y, RANGE, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
      if (inR) { c.fillStyle = "rgba(240,140,122,0.035)"; c.beginPath(); c.arc(tw.x, tw.y, RANGE, 0, Math.PI * 2); c.fill(); }
    }
    for (const tw of this.towers) this.drawTower(c, tw, t);
    if (this.tank.hp > 0) this.drawTank(c, this.tank);
    for (const s of this.shells) {
      const col = s.own === "tank" ? "255,236,170" : "255,150,120";
      c.strokeStyle = `rgba(${col},0.45)`; c.lineWidth = 4; c.lineCap = "round";
      c.beginPath(); c.moveTo(s.x - s.vx * 0.05, s.y - s.vy * 0.05); c.lineTo(s.x, s.y); c.stroke();
      c.fillStyle = "rgba(0,0,0,0.3)"; c.beginPath(); c.arc(s.x + 3, s.y + 5, 4, 0, Math.PI * 2); c.fill();
      c.fillStyle = `rgb(${col})`; c.beginPath(); c.arc(s.x, s.y, 5, 0, Math.PI * 2); c.fill();
    }
    if (this.lock && this.state === "play") lockOn(c, this.lock.x, this.lock.y, 24, t);
    this.fx.draw(c);
    c.restore();
    vignette(c, 0.5);
    this.fx.drawFlash(c);
    if (this.state === "play" && this.t > 0 && this.t < DELAY) {
      banner(c, `Level ${this.level + 1}: ${this.L.name}`, this.L.sub, Math.min(1, DELAY - this.t));
      const n = Math.ceil(DELAY - this.t);
      label(c, String(n), W / 2, H / 2 + 110, 54, C.brass, "center", 800);
    } else if (this.t >= DELAY && this.t < DELAY + 0.6 && this.state === "play") label(c, "Go!", W / 2, H / 2, 96, C.moss, "center", 800);
  }
  drawTank(c: CanvasRenderingContext2D, k: Pawn) {
    c.save(); c.translate(k.x, k.y);
    c.fillStyle = "rgba(0,0,0,0.35)"; c.beginPath(); c.ellipse(5, 8, 26, 20, k.hull, 0, Math.PI * 2); c.fill();
    c.rotate(k.hull);
    // tracks, treads roll while driving
    for (const sy of [-19, 10]) {
      c.fillStyle = "#23271f"; box(c, -23, sy, 46, 9, 3); c.fill();
      c.fillStyle = "#3b4136";
      for (let x = -22 + (((this.tread % 7) + 7) % 7); x < 22; x += 7) c.fillRect(x, sy + 1, 2, 7);
    }
    c.fillStyle = k.flash > 0 ? "#fff" : "#3f9a68"; box(c, -19, -13, 38, 26, 7); c.fill();
    c.fillStyle = k.flash > 0 ? "#fff" : "#55b880"; box(c, -16, -11, 32, 10, 5); c.fill();
    c.strokeStyle = "rgba(0,0,0,0.25)"; c.lineWidth = 1; c.beginPath(); c.moveTo(-12, 6); c.lineTo(12, 6); c.stroke();
    c.restore();
    c.save(); c.translate(k.x, k.y); c.rotate(k.turret);
    const recoil = k.muzzle * 60;
    c.fillStyle = "#2a6e48"; box(c, 4 - recoil, -4, 28, 8, 3); c.fill();
    c.fillStyle = "#1e5236"; c.fillRect(28 - recoil, -5, 5, 10);
    if (k.muzzle > 0) { c.fillStyle = "rgba(255,220,140,0.9)"; c.beginPath(); c.arc(38, 0, 9 * (k.muzzle / 0.09), 0, Math.PI * 2); c.fill(); }
    c.fillStyle = k.flash > 0 ? "#fff" : "#6fcf97"; c.beginPath(); c.arc(0, 0, 11, 0, Math.PI * 2); c.fill();
    c.fillStyle = "rgba(0,0,0,0.25)"; c.beginPath(); c.arc(-2, 0, 4, 0, Math.PI * 2); c.fill();
    c.restore();
    bar(c, k.x, k.y - 36, 42, k.hp / HP, k.hp > 40 ? C.moss : C.danger);
  }
  drawTower(c: CanvasRenderingContext2D, tw: Pawn, t: number) {
    c.save(); c.translate(tw.x, tw.y);
    c.fillStyle = "rgba(0,0,0,0.38)"; c.beginPath(); c.arc(5, 8, 25, 0, Math.PI * 2); c.fill();
    c.fillStyle = tw.flash > 0 ? "#fff" : "#6a5b48"; c.beginPath(); c.arc(0, 0, 23, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#857259"; c.beginPath(); c.arc(0, 0, 18, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "rgba(40,30,20,0.6)"; c.lineWidth = 1.5;
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; c.beginPath(); c.moveTo(Math.cos(a) * 18, Math.sin(a) * 18); c.lineTo(Math.cos(a) * 23, Math.sin(a) * 23); c.stroke(); }
    c.rotate(tw.turret);
    const recoil = tw.muzzle * 50;
    c.fillStyle = "#3c3329"; box(c, 2 - recoil, -4, 27, 8, 3); c.fill();
    if (tw.muzzle > 0) { c.fillStyle = "rgba(255,170,120,0.9)"; c.beginPath(); c.arc(34, 0, 8 * (tw.muzzle / 0.09), 0, Math.PI * 2); c.fill(); }
    // eye glows brighter just before it fires so you have a chance to dodge
    const inR = dist(tw, this.tank) <= RANGE, charge = inR && this.live ? clamp(1 - tw.cool / 0.6, 0, 1) : 0;
    c.fillStyle = tw.flash > 0 ? "#fff" : C.danger; c.beginPath(); c.arc(0, 0, 9, 0, Math.PI * 2); c.fill();
    if (charge > 0) {
      c.globalCompositeOperation = "lighter";
      c.fillStyle = `rgba(255,120,90,${0.25 + charge * 0.6})`; c.beginPath(); c.arc(0, 0, 9 + charge * 7 + Math.sin(t * 30) * 1.5, 0, Math.PI * 2); c.fill();
      c.globalCompositeOperation = "source-over";
    }
    c.restore();
    bar(c, tw.x, tw.y - 38, 42, tw.hp / HP, C.danger);
  }
  hud() {
    const n = this.L.towers.length;
    return [
      { label: "Level", value: `${this.level + 1}/${LEVELS.length}` },
      { label: "Towers", value: `${n - this.towers.length}/${n}` },
      { label: "Hull", value: String(Math.max(0, this.tank.hp)) },
      { label: "Time", value: `${Math.max(0, this.t - DELAY).toFixed(1)}s` },
    ];
  }
  goals(): [string, string, string] { return ["Destroy every tower", `Finish with ${this.L.hull}+ hull`, `Clear it in under ${this.L.time} s`]; }
  stars(): [boolean, boolean, boolean] {
    const won = this.state === "won";
    return [won, won && this.tank.hp >= this.L.hull, won && this.t - DELAY < this.L.time];
  }
  result() {
    const n = this.L.towers.length, acc = this.shots ? Math.round((this.hits / this.shots) * 100) : 0;
    return this.state === "won"
      ? `All ${n} towers down in ${(this.t - DELAY).toFixed(1)} s with ${this.tank.hp} hull left. Accuracy ${acc}%.`
      : `Your tank was destroyed. ${n - this.towers.length} of ${n} towers down.`;
  }
  score() { return this.state === "won" ? Math.round(100000 / Math.max(1, this.t - DELAY)) + this.tank.hp : 0; }
}
