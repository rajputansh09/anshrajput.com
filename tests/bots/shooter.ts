// Simple Shooter bot: hunts the nearest robot on the nav grid, fights when it can see one
import { Shooter } from "../../components/arcade/shooter";
import { idle, Nav } from "../../components/arcade/core";

export function playShooter(level: number) {
  const g: any = new Shooter(level);
  const nav = new Nav(g.walls, 15, 20) as any;
  let n = 0, path: any[] | null = null, seenFor = 0;
  for (; n < 60 * 240 && g.state === "play"; n++) {
    const me = g.me;
    const live = g.bots.filter((b: any) => !b.dead);
    const vis = live.filter((b: any) => g.sees(me, b) && Math.hypot(b.x - me.x, b.y - me.y) < 560);
    const t = (vis.length ? vis : live).sort((a: any, b: any) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
    let ax = 0, ay = 0;
    if (vis.length) {
      seenFor++;
      if (vis.length >= 3 || me.hp < 40) {
        const away = Math.atan2(me.y - t.y, me.x - t.x);
        ax = Math.cos(away) * 0.6; ay = Math.sin(away) * 0.6;
      }
    } else {
      seenFor = 0;
      if (n % 20 === 0) path = nav.path(me, t);
      if (path) {
        while (path.length > 1 && Math.hypot(path[0].x - me.x, path[0].y - me.y) < 12) path.shift();
        const w = nav.steer(me, path, g.walls);
        const d = Math.hypot(w.x - me.x, w.y - me.y) || 1;
        ax = (w.x - me.x) / d; ay = (w.y - me.y) / d;
      }
    }
    const e = () => (Math.random() - 0.5) * 20;
    g.step(1 / 60, Object.assign(idle(), { ax, ay, aimX: t.x + e(), aimY: t.y + e(), aimed: true, fire: vis.length > 0 && seenFor > 12 }));
  }
  return { state: g.state as string, seconds: n / 60 };
}
