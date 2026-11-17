// Warehouse Wreckage bot: picks a target (red barrels first, they take crates with them)
import { Warehouse } from "../../components/arcade/warehouse";
import { idle } from "../../components/arcade/core";

// same launch numbers as the game: speed 380 to 1140 by charge, gravity 1400, fired from (90, 430)
function solve(tx: number, ty: number) {
  let best: { a: number; c: number } | null = null, bestErr = 1e9;
  for (let c = 0.5; c <= 1.001; c += 0.05) for (let a = -1.35; a <= 0.35; a += 0.01) {
    const v = 380 + c * 760, sx = 90 + Math.cos(a) * 30, sy = 430 + Math.sin(a) * 30;
    const vx = Math.cos(a) * v, vy = Math.sin(a) * v;
    const tt = (tx - sx) / vx;
    if (tt <= 0) continue;
    const err = Math.abs(sy + vy * tt + 0.5 * 1400 * tt * tt - ty) + (c < 0.8 ? 3 : 0);
    if (err < bestErr) { bestErr = err; best = { a, c }; }
  }
  return best;
}

export function playWarehouse(level: number) {
  const g: any = new Warehouse(level);
  let n = 0, plan: { a: number; c: number } | null = null, hold = 0, wait = 0;
  for (; n < 60 * 120 && g.state === "play"; n++) {
    if (!plan && wait <= 0) {
      const live = g.bodies.filter((b: any) => !b.dead && (b.kind === "crate" || b.kind === "red"));
      const reds = live.filter((b: any) => b.kind === "red");
      const pool = (reds.length ? reds : live.filter((b: any) => b.kind === "crate")).sort((a: any, b: any) => a.x - b.x);
      const t = pool[Math.floor(Math.random() * Math.min(3, pool.length))] || live[0];
      if (!t) { g.step(1 / 60, idle()); continue; }
      plan = solve(t.x + (Math.random() - 0.5) * 10, t.y + (Math.random() - 0.5) * 10);
      if (!plan) { wait = 30; g.step(1 / 60, idle()); continue; }
      hold = Math.ceil((plan.c / 0.9) * 60);
    }
    let fire = false;
    if (plan) {
      if (hold > 0) { fire = true; hold--; } else { plan = null; wait = 150; }
    } else wait--;
    const a = plan ? plan.a : g.aim;
    g.step(1 / 60, Object.assign(idle(), { aimX: 90 + Math.cos(a) * 100, aimY: 430 + Math.sin(a) * 100, aimed: true, fire }));
  }
  return { state: g.state as string, seconds: n / 60 };
}
