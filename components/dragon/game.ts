"use client";
// the two games behind the Trials button
import type { Float, GameKind, GameState, Lantern, LanternKind, P, Phase, Wall } from "./types";

// Trial numbers in roman numerals, correct past 40 (XL, L, XC, C and on)
export const roman = (n: number) => {
  const map: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "";
  for (const [v, r] of map) while (n >= v) { out += r; n -= v; }
  return out;
};
export const clock = (sec: number) => { const s = Math.max(0, Math.floor(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

// ---------- Fire ---------- A full fire lasts about three seconds of breathing
export const FIRE = { drain: 30, regen: 25, delay: 0.35, relight: 35 };

// ---------- The Dragon's Trial ---------- Sand for each trial: 45 s at trial I
export const trialTime = (L: number) => Math.round(L <= 20 ? 45 - ((L - 1) * 15) / 19 : L <= 30 ? 30 - (L - 20) : Math.max(18, 20 - (L - 30) * 0.2));
export const tier = (L: number) => (L <= 10 ? { name: "Easy", base: 100 } : L <= 20 ? { name: "Medium", base: 150 } : L <= 30 ? { name: "Hard", base: 200 } : { name: "Master", base: 250 });
export const BONUS = 50;
// what a trial holds
export const fitCap = (w: number, h: number) => Math.max(5, Math.min(9, Math.floor(((w - 100) * (h - 230)) / 14000)));
export const trialPlan = (L: number, cap = 9) => {
  const lanterns = Math.min(cap, L <= 20 ? Math.min(4 + Math.floor((L - 1) / 3.5), 9) : Math.max(6, 9 - Math.floor((L - 20) / 3)));
  const iron = L < 6 ? 0 : Math.min(3, lanterns - 2, 1 + Math.floor((L - 6) / 6));
  const moving = L < 3 ? 0 : Math.min(lanterns, 1 + Math.floor((L - 3) / 2));
  const walls = Math.min(1 + Math.floor(L * 0.7), 11);
  return { lanterns, iron, moving, walls, time: trialTime(L), ...tier(L) };
};
// points for clearing a trial: the tier's base, and the bonus when at least half the sand is left
export const clearPoints = (L: number, left: number, start: number) => ({ base: tier(L).base, bonus: left >= start / 2 ? BONUS : 0 });

// ---------- The Lantern Siege ----------
export const SIEGE = { hp: 100, dmg: { plain: 10, great: 15, jade: 0, iron: 10 }, pts: { plain: 10, great: 20, jade: 10, iron: 10 }, heal: 10, greatFrom: 50, jadeFrom: 40 };
// how fast plain lanterns rise, against the starting pace: a little faster after the first minute
export const siegeSpeed = (e: number) => (e < 60 ? 1 : e < 120 ? 1.1 : Math.min(1.35, 1.18 + Math.floor((e - 120) / 60) * 0.05));
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
// the rhythm: a few slow lanterns for the first ten seconds, more for the next thirty, then steadily more
const plainGap = (e: number) => (e < 10 ? rnd(3.2, 4) : e < 40 ? rnd(2.2, 2.8) : e < 60 ? rnd(1.9, 2.5) : Math.max(1.2, 2.1 - (e - 60) * 0.003) * rnd(0.85, 1.15));
const plainMax = (e: number) => (e < 10 ? 2 : e < 40 ? 3 : e < 60 ? 4 : Math.min(6, 4 + Math.floor((e - 60) / 60)));
// great lanterns: from 0:50, one at a time and rarely; from 1:35, two at a time; from 4:00, three
const greatMax = (e: number) => (e < SIEGE.greatFrom ? 0 : e < 95 ? 1 : e < 240 ? 2 : 3);
const greatGap = (e: number) => (e < 95 ? rnd(13, 18) : e < 180 ? rnd(10, 14) : rnd(8, 11));
// news of what is coming, shown for a moment as the siege grows harder
const STAGES: [number, string][] = [
  [10, "More lanterns are rising"],
  [SIEGE.jadeFrom, "Jade lanterns heal Balerian: burn them"],
  [SIEGE.greatFrom, "Great lanterns approach: they take more fire"],
  [60, "The wind quickens"],
  [95, "Two great lanterns at once now"],
  [120, "The wind quickens again"],
  [180, "Faster still"],
  [240, "Three great lanterns at once"],
];
const MEDAL_NEWS: [number, string][] = [[60, "Bronze medal: you held a minute"], [120, "Silver medal: two minutes"], [180, "Gold medal: three minutes"], [300, "Jade medal: five minutes, a legend"]];

// medals for how long the siege was held
export const MEDALS: [number, string][] = [[300, "Jade"], [180, "Gold"], [120, "Silver"], [60, "Bronze"]];
export const medal = (sec: number) => MEDALS.find(([t]) => sec >= t)?.[1] ?? null;
export const nextMedal = (sec: number) => [...MEDALS].reverse().find(([t]) => sec < t) ?? null;

export const newState = (kind: GameKind = "trial"): GameState => ({
  kind, lanterns: [], walls: [], time: 0, start: 1, total: 0, left: 0, doneAt: 0, elapsed: 0,
  fuel: 100, overheat: false, lastBurn: -9, score: 0, shown: 0, burned: 0,
  health: SIEGE.hp, hpShown: SIEGE.hp, plain: 0, great: 0, jade: 0, escaped: 0, nextPlain: 0, nextGreat: 0, nextJade: 0, over: false, stage: 0,
  hurtAt: -9, floats: [], toast: null,
});

export type GameEnv = {
  ctx: CanvasRenderingContext2D; s: number; w: number; h: number; t: number; dpr: number; G: GameState; seg: P[];
  levelRef: { current: number }; phaseRef: { current: Phase };
};
export function makeGame($: GameEnv) {
  // ---------- Trial: build a level ---------- A lantern gets at most two walls on different sides
  const build = (L: number) => {
    const { s, w, h, G, seg } = $;
    const plan = trialPlan(L, fitCap(w, h));
    const nT = plan.lanterns, nW = plan.walls, moving = plan.moving, armoured = plan.iron;
    const lv = Math.min(L, 25);
    // clear of the scoreboard at the top
    const area = { x0: 50 * s + 20, y0: 150, x1: w - 50 * s - 20, y1: h - 80 };
    const lr = Math.max(13, 17 * s);
    const lanterns: Lantern[] = [];
    const walls: Wall[] = [];
    // every planned lantern is placed: if they will not fit with generous spacing (a small screen), the spacing
    for (let tries = 0; lanterns.length < nT && tries < 6000; tries++) {
      const i = lanterns.length, squeeze = Math.max(0.3, 1 - Math.floor(tries / 300) * 0.1);
      const amp = i < moving ? Math.min(58, 18 + lv * 2.2) * Math.max(0.7, s) * Math.max(0.6, squeeze) : 0;
      const x = area.x0 + amp + Math.random() * (area.x1 - area.x0 - 2 * amp);
      const y = area.y0 + amp + Math.random() * (area.y1 - area.y0 - 2 * amp);
      const minGap = 120 * Math.max(0.75, s) * squeeze;
      if (lanterns.some((o) => Math.hypot(o.bx - x, o.by - y) < minGap + o.amp + amp)) continue;
      if (Math.hypot(seg[0].x - x, seg[0].y - y) < 150 * squeeze) continue;
      const arm = i >= nT - armoured;
      lanterns.push({ x, y, bx: x, by: y, r: arm ? lr * 1.18 : lr, heat: 0, need: arm ? 36 : 14, ph: Math.random() * 6.28, amp, spd: 0.6 + Math.min(L, 30) * 0.035, burst: 0, kind: arm ? "iron" : "plain" });
    }
    const clearOf = (wl: Wall) => {
      if (wl.x < area.x0 - 30 || wl.y < area.y0 - 20 || wl.x + wl.w > area.x1 + 30 || wl.y + wl.h > area.y1 + 20) return false;
      for (const o of lanterns) {
        const cx = Math.max(wl.x, Math.min(o.bx, wl.x + wl.w)), cy = Math.max(wl.y, Math.min(o.by, wl.y + wl.h));
        if (Math.hypot(o.bx - cx, o.by - cy) < o.r + o.amp + 22) return false;
      }
      // never build a wall on top of the dragon
      for (let i = 0; i < seg.length; i += 2) {
        const m = (i < 4 ? 90 : 34) * s, q = seg[i];
        if (q.x > wl.x - m && q.x < wl.x + wl.w + m && q.y > wl.y - m && q.y < wl.y + wl.h + m) return false;
      }
      for (const o of walls) {
        const m = 26;
        if (wl.x < o.x + o.w + m && wl.x + wl.w > o.x - m && wl.y < o.y + o.h + m && wl.y + wl.h > o.y - m) return false;
      }
      return true;
    };
    const sides = new Map<Lantern, number[]>();
    const th = Math.max(12, 16 * s);
    for (let i = 0, tries = 0; walls.length < nW && tries < 900; tries++) {
      const o = lanterns[i % lanterns.length];
      const used = sides.get(o) ?? [];
      let wl: Wall;
      if (used.length < 2 && tries < 600) {
        // shield: a wall on one side of a lantern, never on the side opposite an existing one
        const side = Math.floor(Math.random() * 4);
        if (used.includes(side) || used.some((u) => (u + 2) % 4 === side)) { i++; continue; }
        const len = (90 + Math.random() * 70) * Math.max(0.75, s);
        const off = o.r + o.amp + 34 * Math.max(0.8, s);
        const horiz = side % 2 === 0;
        const cx = o.bx + (side === 1 ? off : side === 3 ? -off : 0) + (horiz ? (Math.random() - 0.5) * 30 : 0);
        const cy = o.by + (side === 0 ? -off : side === 2 ? off : 0) + (horiz ? 0 : (Math.random() - 0.5) * 30);
        wl = horiz ? { x: cx - len / 2, y: cy - th / 2, w: len, h: th, seed: Math.random() } : { x: cx - th / 2, y: cy - len / 2, w: th, h: len, seed: Math.random() };
        if (clearOf(wl)) {
          walls.push(wl);
          sides.set(o, [...used, side]);
        }
        i++;
      } else {
        // free-standing wall somewhere in the open
        const len = (100 + Math.random() * 120) * Math.max(0.75, s);
        const horiz = Math.random() < 0.5;
        const x = area.x0 + Math.random() * (area.x1 - area.x0 - (horiz ? len : th));
        const y = area.y0 + Math.random() * (area.y1 - area.y0 - (horiz ? th : len));
        wl = horiz ? { x, y, w: len, h: th, seed: Math.random() } : { x, y, w: th, h: len, seed: Math.random() };
        if (clearOf(wl)) walls.push(wl);
      }
    }
    // (The run's score and lanterns burned carry over from level to level.)
    Object.assign(G, { kind: "trial", lanterns, walls, total: lanterns.length, left: lanterns.length, time: plan.time, start: plan.time, doneAt: 0, elapsed: 0, fuel: 100, overheat: false, lastBurn: -9, floats: [], toast: null, over: false });
  };

  // ---------- Siege ----------
  const startSiege = () => {
    Object.assign($.G, newState("siege"), { nextPlain: 0.6, nextGreat: SIEGE.greatFrom + rnd(0, 4), nextJade: SIEGE.jadeFrom + rnd(0, 6) });
  };
  const lr = () => Math.max(13, 17 * $.s);
  // the starting pace: a plain lantern takes about sixteen seconds to cross the screen
  const pace = () => ($.h + 2 * lr()) / (16 + (1 - $.s) * 6);
  const spawn = (kind: LanternKind, e: number) => {
    const { w, h, s, G } = $;
    const r = kind === "great" ? lr() * 1.6 : kind === "jade" ? lr() * 0.9 : lr();
    // not straight under another lantern that has only just risen into view
    let x = 0;
    for (let k = 0; k < 10; k++) {
      x = rnd(40 + r, w - 40 - r);
      if (!G.lanterns.some((o) => o.burst === 0 && o.y > h - 220 && Math.abs(o.x - x) < o.r + r + 60)) break;
    }
    const vy = kind === "great" ? pace() * 0.8 : kind === "jade" ? pace() * 1.2 : pace() * siegeSpeed(e) * rnd(0.92, 1.08);
    const y = h + r + 16;
    G.lanterns.push({ x, y, bx: x, by: y, r, heat: 0, need: kind === "great" ? 36 : kind === "jade" ? 10 : 12, ph: Math.random() * 6.28, amp: rnd(8, 24) * Math.max(0.7, s), spd: rnd(0.5, 1.1), burst: 0, kind, vy });
  };
  // one step of the siege: the clock, new lanterns, lanterns rising, and any that escape off the top
  const stepSiege = (t: number, hurt: (dmg: number) => void) => {
    const { G, h } = $;
    if (!G.over) {
      G.elapsed += 1 / 60;
      const e = G.elapsed;
      while (G.stage < STAGES.length && e >= STAGES[G.stage][0]) { G.toast = { text: STAGES[G.stage][1], at: t }; G.stage++; }
      // (A medal's news comes a moment after any stage news at the same time, so neither hides the other.)
      for (const [m, text] of MEDAL_NEWS) if (e - 1 / 60 < m + 3 && e >= m + 3) G.toast = { text, at: t };
      const alive = (k: LanternKind) => G.lanterns.filter((o) => o.burst === 0 && o.kind === k).length;
      if (e >= G.nextPlain) {
        if (alive("plain") < plainMax(e)) { spawn("plain", e); G.nextPlain = e + plainGap(e); } else G.nextPlain = e + 0.4;
      }
      if (e >= G.nextGreat) {
        if (alive("great") < greatMax(e)) { spawn("great", e); G.nextGreat = e + greatGap(e); } else G.nextGreat = e + 1;
      }
      if (e >= G.nextJade) { spawn("jade", e); G.nextJade = e + rnd(32, 46); }
    }
    for (let j = G.lanterns.length - 1; j >= 0; j--) {
      const o = G.lanterns[j];
      if (o.burst > 0) continue;
      o.by -= (o.vy ?? 0) / 60;
      o.y = o.by;
      o.x = o.bx + Math.sin(t * o.spd + o.ph) * o.amp;
      if (o.y < -o.r * 1.4) {
        G.lanterns.splice(j, 1);
        const dmg = SIEGE.dmg[o.kind ?? "plain"];
        if (!dmg || G.over) continue;
        G.escaped++;
        G.health = Math.max(0, G.health - dmg);
        G.hurtAt = t;
        G.floats.push({ x: Math.max(30, Math.min($.w - 30, o.x)), y: 110, text: `-${dmg}`, col: "#ff6b5a", at: t });
        hurt(dmg);
        if (G.health <= 0) { G.over = true; G.doneAt = t + 1.2; }
      }
    }
    void h;
  };
  // a lantern burned: points, counts and (for jade) healing
  const burned = (o: Lantern, t: number) => {
    const { G } = $;
    G.burned++;
    if (G.kind === "siege") {
      const k = o.kind ?? "plain";
      const pts = SIEGE.pts[k];
      G.score += pts;
      if (k === "great") G.great++; else if (k === "jade") G.jade++; else G.plain++;
      let text = `+${pts}`;
      if (k === "jade") {
        const before = G.health;
        G.health = Math.min(SIEGE.hp, G.health + SIEGE.heal);
        if (G.health > before) text += `  ♥+${G.health - before}`;
      }
      G.floats.push({ x: o.x, y: o.y - o.r, text, col: k === "jade" ? "#8ef0b8" : k === "great" ? "#ffd27a" : "#ffe3a8", at: t });
    } else {
      G.left -= 1;
      G.floats.push({ x: o.x, y: o.y - o.r, text: `${G.total - G.left}/${G.total}`, col: "#ffe3a8", at: t });
    }
  };
  // fire use for one step: breathing drains it; resting refills it after a moment
  const fuelStep = (t: number, breathing: boolean) => {
    const { G } = $;
    if (breathing && !G.overheat) {
      G.fuel -= FIRE.drain / 60;
      G.lastBurn = t;
      if (G.fuel <= 0) { G.fuel = 0; G.overheat = true; G.toast = { text: "Out of fire: it must cool for a moment", at: t }; }
    } else if (t - G.lastBurn > FIRE.delay) G.fuel = Math.min(100, G.fuel + FIRE.regen / 60);
    if (G.overheat && G.fuel >= FIRE.relight) G.overheat = false;
    return !G.overheat;
  };

  const rrect = (x: number, y: number, ww: number, hh: number, r: number) => {
    const { ctx } = $;
    r = Math.max(0, Math.min(r, ww / 2, hh / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + ww, y, x + ww, y + hh, r);
    ctx.arcTo(x + ww, y + hh, x, y + hh, r);
    ctx.arcTo(x, y + hh, x, y, r);
    ctx.arcTo(x, y, x + ww, y, r);
    ctx.closePath();
  };

  const drawWalls = () => {
    const { ctx, dpr, G } = $;
    for (const wl of G.walls) {
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
      ctx.shadowBlur = 14 * dpr;
      ctx.shadowOffsetY = 8 * dpr;
      const g = ctx.createLinearGradient(wl.x, wl.y, wl.x, wl.y + wl.h);
      g.addColorStop(0, "#3a4a40");
      g.addColorStop(1, "#1a2620");
      ctx.fillStyle = g;
      rrect(wl.x, wl.y, wl.w, wl.h, 4);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = "#0a120d";
      ctx.lineWidth = 1.5;
      rrect(wl.x, wl.y, wl.w, wl.h, 4);
      ctx.stroke();
      // moss edge and carved blocks
      ctx.strokeStyle = "rgba(111, 207, 151, 0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wl.x + 4, wl.y + 1.5);
      ctx.lineTo(wl.x + wl.w - 4, wl.y + 1.5);
      ctx.stroke();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
      ctx.lineWidth = 1;
      const horiz = wl.w > wl.h;
      const len = horiz ? wl.w : wl.h;
      for (let k = 26 + wl.seed * 14; k < len - 12; k += 30) {
        ctx.beginPath();
        if (horiz) { ctx.moveTo(wl.x + k, wl.y + 3); ctx.lineTo(wl.x + k, wl.y + wl.h - 2); }
        else { ctx.moveTo(wl.x + 3, wl.y + k); ctx.lineTo(wl.x + wl.w - 2, wl.y + k); }
        ctx.stroke();
      }
    }
  };

  // paper colours for each kind of lantern: [highlight, middle, edge, glow]
  const PAPER: Record<LanternKind, { hi: string; mid: string; edge: string; hot: [string, string]; glow: string }> = {
    plain: { hi: "#ffd58a", mid: "#e0612b", edge: "#7d1c10", hot: ["#fff3d0", "#ff9a3a"], glow: "255, 170, 70" },
    iron: { hi: "#ffd58a", mid: "#e0612b", edge: "#7d1c10", hot: ["#fff3d0", "#ff9a3a"], glow: "255, 170, 70" },
    great: { hi: "#ffc27a", mid: "#b8261c", edge: "#4a0b08", hot: ["#fff0c8", "#ff7a2a"], glow: "255, 120, 50" },
    jade: { hi: "#d8ffe9", mid: "#3fae78", edge: "#0f3d27", hot: ["#f2fff7", "#8ef0b8"], glow: "120, 240, 170" },
  };
  const drawLanterns = () => {
    const { ctx, t, G, h } = $;
    const siege = G.kind === "siege";
    for (const o of G.lanterns) {
      const kind = o.kind ?? "plain", pal = PAPER[kind];
      if (o.burst > 0) {
        // flash ring as it bursts
        const k = o.burst / 0.6;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = kind === "jade" ? `rgba(140, 240, 180, ${1 - k})` : `rgba(255, 200, 110, ${1 - k})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r + k * 60, 0, Math.PI * 2); ctx.stroke();
        const fg = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * 3);
        fg.addColorStop(0, `rgba(255, 240, 200, ${0.9 * (1 - k)})`);
        fg.addColorStop(1, `rgba(${pal.glow}, 0)`);
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        continue;
      }
      const hot = Math.min(1, o.heat / o.need);
      const shake = hot > 0.4 ? (Math.random() - 0.5) * hot * 3 : 0;
      const x = o.x + shake, y = o.y, r = o.r;
      // glow
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const gl = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
      gl.addColorStop(0, `rgba(${pal.glow}, ${0.28 + hot * 0.35})`);
      gl.addColorStop(1, `rgba(${pal.glow}, 0)`);
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // about to escape (siege): a pulsing red warning ring
      if (siege && kind !== "jade" && y < h * 0.22) {
        const a = 0.35 + 0.35 * Math.sin(t * 10);
        ctx.strokeStyle = `rgba(255, 90, 70, ${a})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, r + 14, 0, Math.PI * 2); ctx.stroke();
      }
      // string
      ctx.strokeStyle = "rgba(216, 180, 106, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y - r - 4); ctx.lineTo(x, y - r - 14); ctx.stroke();
      // paper body
      const bg = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 1, x, y, r);
      bg.addColorStop(0, hot > 0.6 ? pal.hot[0] : pal.hi);
      bg.addColorStop(0.55, hot > 0.6 ? pal.hot[1] : pal.mid);
      bg.addColorStop(1, pal.edge);
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.86, r, 0, 0, Math.PI * 2); ctx.fill();
      // ribs
      ctx.strokeStyle = kind === "jade" ? "rgba(8, 50, 30, 0.55)" : "rgba(90, 20, 8, 0.6)";
      ctx.lineWidth = 1;
      for (const k of kind === "great" ? [0.2, 0.45, 0.7] : [0.25, 0.6]) {
        ctx.beginPath(); ctx.ellipse(x, y, r * 0.86 * k, r, 0, 0, Math.PI * 2); ctx.stroke();
      }
      // caps and tassel
      ctx.fillStyle = kind === "great" ? "#6b4a18" : "#2a1a0f";
      rrect(x - r * 0.45, y - r - 4, r * 0.9, 6, 2); ctx.fill();
      rrect(x - r * 0.45, y + r - 2, r * 0.9, 6, 2); ctx.fill();
      ctx.strokeStyle = kind === "jade" ? "#8ef0b8" : "#d8b46a";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y + r + 4); ctx.lineTo(x + Math.sin(t * 3 + o.ph) * 2, y + r + 13); ctx.stroke();
      if (kind === "great") {
        ctx.beginPath(); ctx.moveTo(x - r * 0.3, y + r + 4); ctx.lineTo(x - r * 0.3 + Math.sin(t * 3 + o.ph + 1) * 2, y + r + 11); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + r * 0.3, y + r + 4); ctx.lineTo(x + r * 0.3 + Math.sin(t * 3 + o.ph + 2) * 2, y + r + 11); ctx.stroke();
      }
      // iron-banded and great lanterns: bands (iron grey, or gold)
      if (kind === "iron" || kind === "great") {
        ctx.strokeStyle = kind === "great" ? "#c9a24e" : "#2e3430";
        ctx.lineWidth = kind === "great" ? 2.5 : 3;
        for (const k of [-0.42, 0.42]) {
          ctx.beginPath(); ctx.ellipse(x, y + k * r, r * 0.8, r * 0.18, 0, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = kind === "great" ? "#f0d79a" : "#9aa39d";
        for (const k of [-0.42, 0.42]) for (const sx of [-0.5, 0, 0.5]) {
          ctx.beginPath(); ctx.arc(x + sx * r, y + k * r + r * 0.17, 1.4, 0, Math.PI * 2); ctx.fill();
        }
      }
      // jade: a small leaf mark
      if (kind === "jade") {
        ctx.strokeStyle = "rgba(240, 255, 245, 0.85)";
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x - r * 0.3, y); ctx.lineTo(x + r * 0.3, y); ctx.moveTo(x, y - r * 0.3); ctx.lineTo(x, y + r * 0.3); ctx.stroke();
      }
      // heat ring
      if (hot > 0) {
        ctx.strokeStyle = kind === "jade" ? `rgba(140, 240, 180, ${0.5 + hot * 0.5})` : `rgba(255, 190, 90, ${0.5 + hot * 0.5})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, r + 8, -Math.PI / 2, -Math.PI / 2 + hot * Math.PI * 2); ctx.stroke();
      }
    }
  };

  // ---------- Scoreboard ---------- One panel at the top: the game's name
  const font = (px: number, kind: "serif" | "sans" | "mono", weight = 600, italic = false) =>
    `${italic ? "italic " : ""}${weight} ${px}px ${kind === "serif" ? `"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif` : kind === "mono" ? `"JetBrains Mono", ui-monospace, monospace` : `"Schibsted Grotesk", system-ui, sans-serif`}`;
  const bar = (x: number, y: number, ww: number, hh: number, frac: number, col: string) => {
    const { ctx } = $;
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    rrect(x, y, ww, hh, hh / 2); ctx.fill();
    const f = Math.max(0, Math.min(1, frac));
    if (f > 0.002) { ctx.fillStyle = col; rrect(x, y, Math.max(hh, ww * f), hh, hh / 2); ctx.fill(); }
  };
  const drawHud = () => {
    const { ctx, w, t, G, levelRef, phaseRef } = $;
    const siege = G.kind === "siege";
    if (!siege && !G.total) return;
    // the score counts up to its new value rather than jumping
    G.shown += (G.score - G.shown) * 0.12;
    if (Math.abs(G.score - G.shown) < 0.5) G.shown = G.score;
    G.hpShown += (G.health - G.hpShown) * 0.15;
    const narrow = w < 460;
    // on narrower screens the panel leaves room at the right for the round pause button
    const room = w < 720 ? 58 : 0;
    const pw = Math.min(600, w - 24 - room), px = room ? 12 : (w - pw) / 2, py = 10, ph = 98, pad = narrow ? 12 : 16;
    ctx.save();
    ctx.fillStyle = "rgba(14, 32, 23, 0.86)";
    rrect(px, py, pw, ph, 14); ctx.fill();
    // hurt just now: the panel's edge flashes red
    const hurt = siege ? Math.max(0, 1 - (t - G.hurtAt) / 0.6) : 0;
    ctx.strokeStyle = hurt > 0 ? `rgba(255, 90, 70, ${0.45 + hurt * 0.5})` : "rgba(216, 180, 106, 0.45)";
    ctx.lineWidth = 1 + hurt;
    rrect(px, py, pw, ph, 14); ctx.stroke();
    ctx.textBaseline = "middle";
    // line 1: name, score, clock
    const y1 = py + 20;
    ctx.textAlign = "left";
    ctx.font = font(narrow ? 15 : 17, "serif", 600, true);
    ctx.fillStyle = "#d8b46a";
    ctx.fillText(siege ? "Lantern Siege" : `Trial ${roman(levelRef.current)}`, px + pad, y1);
    ctx.textAlign = "center";
    ctx.font = font(narrow ? 13 : 15, "sans", 700);
    ctx.fillStyle = "#f0d79a";
    ctx.fillText(`Score ${Math.round(G.shown)}`, px + pw / 2 + (narrow ? 18 : 0), y1);
    ctx.textAlign = "right";
    ctx.font = font(narrow ? 13 : 15, "mono");
    if (siege) {
      ctx.fillStyle = "#e6efe8";
      ctx.fillText(clock(G.elapsed), px + pw - pad, y1);
    } else {
      const sec = Math.ceil(G.time);
      ctx.fillStyle = sec <= 5 && phaseRef.current === "play" ? "#ff8a5c" : "#e6efe8";
      ctx.fillText(clock(sec), px + pw - pad, y1);
    }
    // line 2: the sand (trial) or the dragon's health (siege)
    const y2 = py + 38, lw = narrow ? 52 : 62;
    ctx.textAlign = "left";
    ctx.font = font(narrow ? 11 : 12, "sans", 600);
    ctx.fillStyle = "rgba(230, 239, 232, 0.7)";
    if (siege) {
      const hp = G.hpShown / SIEGE.hp;
      ctx.fillText(`Health ${Math.round(G.health)}`, px + pad, y2 + 3);
      bar(px + pad + lw + 14, y2, pw - pad * 2 - lw - 14, 7, hp, hp > 0.55 ? "#6fcf97" : hp > 0.3 ? "#d8b46a" : "#ff6b5a");
    } else {
      const full = G.time / G.start;
      ctx.fillText("Sand", px + pad, y2 + 3);
      bar(px + pad + lw + 14, y2, pw - pad * 2 - lw - 14, 7, full, full > 0.5 ? "#6fcf97" : full > 0.2 ? "#d8b46a" : "#ff7a45");
      // the half-sand mark: finish before it for the bonus
      const mx = px + pad + lw + 14 + (pw - pad * 2 - lw - 14) / 2;
      ctx.fillStyle = "rgba(240, 215, 154, 0.8)";
      ctx.fillRect(mx - 1, y2 - 3, 2, 13);
    }
    // line 3: the counts and the time
    const y3 = py + 60;
    ctx.font = font(narrow ? 11.5 : 13, "sans", 600);
    ctx.fillStyle = "#e6efe8";
    ctx.textAlign = "left";
    if (siege) {
      ctx.fillText(narrow ? `Burned ${G.burned}` : `Burned ${G.burned}  ·  great ${G.great}  ·  jade ${G.jade}`, px + pad, y3);
      ctx.textAlign = "right";
      ctx.fillStyle = G.escaped ? "#ffb4a8" : "#e6efe8";
      ctx.fillText(`Escaped ${G.escaped}`, px + pw - pad, y3);
    } else {
      ctx.fillText(`Lanterns ${G.total - G.left}/${G.total}`, px + pad, y3);
      ctx.textAlign = "center";
      ctx.fillText(`Burned ${G.burned}`, px + pw / 2 + (narrow ? 8 : 0), y3);
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(230, 239, 232, 0.75)";
      ctx.fillText(`${narrow ? "" : "Elapsed "}${clock(G.elapsed)}`, px + pw - pad, y3);
    }
    // line 4: fire
    const y4 = py + 80;
    ctx.textAlign = "left";
    ctx.font = font(narrow ? 11 : 12, "sans", 600);
    const blink = G.overheat ? 0.5 + 0.5 * Math.sin(t * 9) : 1;
    ctx.fillStyle = G.overheat ? `rgba(255, 120, 90, ${0.6 + 0.4 * blink})` : "rgba(230, 239, 232, 0.7)";
    ctx.fillText(G.overheat ? "Cooling" : "Fire", px + pad, y4 + 3);
    bar(px + pad + lw + 14, y4, pw - pad * 2 - lw - 14, 7, G.fuel / 100, G.overheat ? `rgba(255, 90, 70, ${0.5 + 0.5 * blink})` : G.fuel > 40 ? "#ff9a3a" : "#ff6b3a");
    if (G.overheat) {
      // where it lights again
      const mx = px + pad + lw + 14 + (pw - pad * 2 - lw - 14) * (FIRE.relight / 100);
      ctx.fillStyle = "rgba(255, 220, 180, 0.85)";
      ctx.fillRect(mx - 1, y4 - 3, 2, 13);
    }
    ctx.restore();
  };

  // ---------- Effects over the game: floating points, news, a red edge when hurt ----------
  const drawFx = () => {
    const { ctx, w, h, t, G } = $;
    // hurt: the screen's edges glow red for a moment
    const hurt = G.kind === "siege" ? Math.max(0, 1 - (t - G.hurtAt) / 0.55) : 0;
    if (hurt > 0) {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
      g.addColorStop(0, "rgba(255, 40, 30, 0)");
      g.addColorStop(1, `rgba(255, 40, 30, ${0.35 * hurt})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    // the top edge, where siege lanterns escape: a faint red line
    if (G.kind === "siege") {
      const g = ctx.createLinearGradient(0, 0, 0, 10);
      g.addColorStop(0, "rgba(255, 80, 60, 0.45)");
      g.addColorStop(1, "rgba(255, 80, 60, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, 10);
    }
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = font(15, "sans", 800);
    G.floats = G.floats.filter((f: Float) => t - f.at < 1.2);
    for (const f of G.floats) {
      const k = (t - f.at) / 1.2;
      ctx.globalAlpha = 1 - k * k;
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillText(f.text, f.x + 1, f.y - k * 46 + 1);
      ctx.fillStyle = f.col;
      ctx.fillText(f.text, f.x, f.y - k * 46);
    }
    ctx.globalAlpha = 1;
    // news: fades in and out under the scoreboard
    if (G.toast) {
      const k = t - G.toast.at;
      if (k > 2.8) G.toast = null;
      else {
        const a = Math.min(1, k * 4, (2.8 - k) * 2);
        ctx.globalAlpha = a;
        ctx.font = font(w < 460 ? 15 : 18, "serif", 600, true);
        const tw = ctx.measureText(G.toast.text).width + 36;
        ctx.fillStyle = "rgba(14, 32, 23, 0.9)";
        rrect(w / 2 - tw / 2, 120, tw, 34, 17); ctx.fill();
        ctx.fillStyle = "#f0d79a";
        ctx.fillText(G.toast.text, w / 2, 137);
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  };
  return { build, startSiege, stepSiege, burned, fuelStep, rrect, drawWalls, drawLanterns, drawHud, drawFx };
}
