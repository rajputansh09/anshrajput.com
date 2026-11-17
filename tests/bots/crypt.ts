// Crypt Raider bot: for each level it has the list of which relic goes on which plate
import { Crypt } from "../../components/arcade/crypt";
import { idle, Nav, inRect } from "../../components/arcade/core";

const TASKS: [string, number | "exit"][][] = [
  [["gargoyle", 0], ["urn", 1], ["statue", "exit"]],
  [["gargoyle", 0], ["urn", 1], ["statue", "exit"]],
  [["gargoyle", 0], ["urn", 1], ["skull", 2], ["statue", "exit"]],
];
const SPEED = 190;

export function playCrypt(level: number) {
  const g: any = new Crypt(level);
  const L = g.L;
  let k = 0, n = 0, nav: any = null, navKey = "", path: any[] | null = null, last: any = null, jig = 0;
  for (; n < 60 * 240 && g.state === "play"; n++) {
    const P = g.p, task = TASKS[level][k];
    // gates move, so rebuild the grid whenever one opens or closes
    const key = g.gates.map((x: any) => x.y | 0).join(",");
    if (key !== navKey) { nav = new Nav(g.solids(), 15, 10); navKey = key; path = null; }
    const it = g.items.find((i: any) => i.tag === task[0]);
    let goal: any = it, fire = !!g.held;
    if (g.held) {
      goal = task[1] === "exit"
        ? { x: L.exit.x + L.exit.w / 2, y: L.exit.y + L.exit.h / 2 }
        : { x: g.plates[task[1]].x + 30, y: g.plates[task[1]].y + 30 };
      if (task[1] !== "exit" && inRect(it.x, it.y, g.plates[task[1]], 4)) { fire = false; k++; path = null; }
    }
    if (!g.held && Math.hypot(it.x - P.x, it.y - P.y) < 70) {
      g.step(1 / 60, Object.assign(idle(), { aimX: it.x, aimY: it.y, aimed: true, fire: n % 30 < 26 }));
      continue;
    }
    if (n % 15 === 0 || !path) path = nav.path(P, goal);
    while (path!.length > 1 && Math.hypot(path![0].x - P.x, path![0].y - P.y) < 8) path!.shift();
    const w = nav.steer(P, path, g.solids());
    let dx = w.x - P.x, dy = w.y - P.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    if (jig > 0) { jig--; dx = Math.random() - 0.5; dy = Math.random() - 0.5; }
    for (const s of L.spikes) {
      const inNow = inRect(P.x, P.y, s, 0), inNext = inRect(P.x + dx * 6, P.y + dy * 6, s, -2);
      if (!inNow && inNext) {
        const ph = (g.t + s.ph) % s.cycle, downLeft = ph >= s.cycle / 2 ? s.cycle - ph : 0;
        const need = (Math.min(s.w, s.h) + 40) / (SPEED * (g.held ? 0.82 : 1)) + 0.1;
        if (downLeft < need) { dx = 0; dy = 0; }
      }
    }
    const aim = g.held ? { aimX: P.x + dx * 50, aimY: P.y + dy * 50, aimed: dx !== 0 || dy !== 0 } : {};
    g.step(1 / 60, Object.assign(idle(), { ax: dx, ay: dy, fire, ...aim }));
    // stuck on a corner: wiggle for a moment
    if (n % 60 === 0) {
      if (last && Math.hypot(P.x - last.x, P.y - last.y) < 4 && (dx || dy)) jig = 20;
      last = { x: P.x, y: P.y };
    }
  }
  return { state: g.state as string, seconds: n / 60 };
}
