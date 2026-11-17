// Toon Tanks bot: picks a spot near a tower that it can see from and that as few other towers can reach
import { Tanks } from "../../components/arcade/tanks";
import { idle, trace, wrap, Nav } from "../../components/arcade/core";

export function playTanks(level: number) {
  const g: any = new Tanks(level);
  const nav = new Nav(g.walls, 20, 20) as any;
  let n = 0, prev = false, stuck = 0, path: any[] | null = null, tw: any = null, spot: any = null;

  const spotFor = (t: any, k: any, lo = 315, hi = 420) => {
    let best: any = null, bestScore = 1e9;
    for (let i = 0; i < nav.open.length; i++) {
      if (!nav.open[i]) continue;
      const x = ((i % nav.cols) + 0.5) * 20, y = (Math.floor(i / nav.cols) + 0.5) * 20;
      const d = Math.hypot(x - t.x, y - t.y);
      if (d < lo || d > hi || x < 30 || y < 30 || x > 930 || y > 510) continue;
      // the shell has to have a clear line to the tower from around the spot, not just the centre
      if ([[0, 0], [10, 0], [-10, 0], [0, 10], [0, -10]].some(([u, v]) => trace(x + u, y + v, t.x, t.y, g.walls) < 1)) continue;
      const danger = g.towers.filter((o: any) => Math.hypot(o.x - x, o.y - y) <= 310).length;
      const score = danger * 600 + Math.hypot(x - k.x, y - k.y);
      if (score < bestScore) { bestScore = score; best = { x, y, score }; }
    }
    return best;
  };

  for (; n < 60 * 300 && g.state === "play"; n++) {
    const k = g.tank;
    if (!tw || !g.towers.includes(tw) || n % 120 === 0 || stuck > 90) {
      stuck = 0;
      let bb = 1e9;
      for (const t of g.towers) { const s = spotFor(t, k); if (s && s.score < bb) { bb = s.score; tw = t; spot = s; } }
      if (bb >= 600) for (const t of g.towers) { const s = spotFor(t, k, 120, 300); if (s && s.score < bb) { bb = s.score; tw = t; spot = s; } }
      path = spot ? nav.path(k, spot) : null;
    }
    let ax = 0, ay = 0;
    if (path) while (path.length > 1 && Math.hypot(path[0].x - k.x, path[0].y - k.y) < 14) path.shift();
    const tgt = path && path.length ? nav.steer(k, path, g.walls) : k;
    const togo = path ? Math.hypot(path[path.length - 1].x - k.x, path[path.length - 1].y - k.y) : 0;
    if (togo > 12) {
      const d = wrap(Math.atan2(tgt.y - k.y, tgt.x - k.x) - k.hull);
      ax = Math.abs(d) > 0.15 ? Math.sign(d) : 0;
      ay = Math.abs(d) < 0.9 ? -1 : 0;
    }
    const clear = trace(k.x, k.y, tw.x, tw.y, g.walls) >= 1;
    if (!clear && togo <= 12) stuck++;
    const e = (Math.random() - 0.5) * 10;
    const i = Object.assign(idle(), { ax, ay, aimX: tw.x + e, aimY: tw.y + e, aimed: true, fire: clear && n % 22 < 11 });
    i.firePressed = i.fire && !prev;
    prev = i.fire;
    g.step(1 / 60, i);
  }
  return { state: g.state as string, seconds: n / 60 };
}
