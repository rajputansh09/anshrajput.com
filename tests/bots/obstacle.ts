// Obstacle Assault bot: every quarter second it tries all 3 step combos of run, jump, wait
import { Obstacle } from "../../components/arcade/obstacle";
import { idle, Fx } from "../../components/arcade/core";

const ACT: Record<string, { ax: number; fire: boolean }> = {
  run: { ax: 1, fire: false },
  jump: { ax: 1, fire: true },
  wait: { ax: 0, fire: false },
  back: { ax: -1, fire: false },
  hop: { ax: 0, fire: true },
};
const names = Object.keys(ACT);
const F = 15;

function copy(g: any) {
  const c = structuredClone({ solids: g.solids, hammers: g.hammers, p: g.p });
  const h = Object.assign(Object.create(Obstacle.prototype), g, c);
  h.fx = new Fx();
  h.course = { ...g.course, solids: c.solids, hammers: c.hammers };
  return h;
}

function tryPlan(g: any, seq: string[]) {
  let prev = false;
  const deaths = g.deaths;
  for (const a of seq) for (let k = 0; k < F; k++) {
    const i = Object.assign(idle(), ACT[a]);
    i.firePressed = i.fire && !prev;
    prev = i.fire;
    g.step(1 / 60, i);
    if (g.deaths > deaths) return -1e9;
    if (g.state === "won") return 1e9;
  }
  return g.p.x + (g.p.on ? 30 : 0);
}

export function playObstacle(level: number) {
  const g: any = new Obstacle(level);
  let plan = ["wait"], prev = false, n = 0;
  for (; n < 60 * 180 && g.state === "play"; n++) {
    if (n % F === 0) {
      if (g.dead > 0) plan = ["wait"];
      else {
        let best = -Infinity;
        for (const a of names) for (const b of names) for (const c of names) {
          const v = tryPlan(copy(g), [a, b, c]);
          if (v > best) { best = v; plan = [a, b, c]; }
        }
      }
    }
    const i = Object.assign(idle(), ACT[plan[0]]);
    i.firePressed = i.fire && !prev;
    prev = i.fire;
    g.step(1 / 60, i);
  }
  return { state: g.state as string, seconds: n / 60 };
}
