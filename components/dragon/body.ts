"use client";
// the body seen from above, coloured from the dragon's palette
import type { P } from "./types";
import type { Parts } from "./parts";
import type { Pal } from "./palette";

// the body seen from above: legs, barbed tail, scales, bronze flank armour, sheen and the bone dorsal spines
export type BodyEnv = {
  ctx: CanvasRenderingContext2D; seg: P[]; N: number; s: number; gait: number;
  rad: (i: number) => number; dirAt: (i: number) => number; bodyPath: (L: P[], R: P[]) => void; L: P[]; R: P[];
  limb: Parts["limb"]; blade: Parts["blade"]; boneFill: Parts["boneFill"]; pal: Pal;
};
export function drawLeg($: BodyEnv, i: number, side: number, phase: number) {
  const { ctx, seg, s, gait, rad, dirAt, limb, blade, boneFill, pal } = $;
    const p = seg[i], d = dirAt(i), r = rad(i);
    const n = d + (side * Math.PI) / 2;
    const ax = p.x + Math.cos(n) * r * 0.5, ay = p.y + Math.sin(n) * r * 0.5;
    const stride = Math.sin(gait + phase) * 0.45;
    const up = d + side * (Math.PI / 2 + 0.75) + stride * side;
    const kx = ax + Math.cos(up) * 19 * s, ky = ay + Math.sin(up) * 19 * s;
    const lo = up - side * (1.45 + Math.cos(gait + phase) * 0.15);
    const fx = kx + Math.cos(lo) * 15 * s, fy = ky + Math.sin(lo) * 15 * s;
    const g = ctx.createLinearGradient(ax, ay, fx, fy);
    g.addColorStop(0, pal.leg[0]);
    g.addColorStop(1, pal.leg[1]);
    ctx.fillStyle = g;
    ctx.strokeStyle = pal.line;
    ctx.lineWidth = 1.3 * s;
    limb(ax, ay, kx, ky, 7 * s, 4.8 * s);
    ctx.fillStyle = g;
    limb(kx, ky, fx, fy, 4.8 * s, 3.4 * s);
    // limb scales: arcs across the upper arm and forearm, as on the crest's legs
    ctx.strokeStyle = pal.legScale;
    ctx.lineWidth = 0.9 * s;
    ctx.beginPath();
    for (const [x1, y1, x2, y2, ww] of [[ax, ay, kx, ky, 5.6], [kx, ky, fx, fy, 3.8]] as const) {
      const a = Math.atan2(y2 - y1, x2 - x1), ux = Math.cos(a), uy = Math.sin(a);
      const vx = -uy, vy = ux;
      for (const u of [0.3, 0.62]) {
        const cx = x1 + (x2 - x1) * u, cy = y1 + (y2 - y1) * u, wv = ww * s * (1 - u * 0.25);
        ctx.moveTo(cx + vx * wv, cy + vy * wv);
        ctx.quadraticCurveTo(cx - ux * wv * 0.9, cy - uy * wv * 0.9, cx - vx * wv, cy - vy * wv);
      }
    }
    ctx.stroke();
    // elbow spur and three hooked bone talons
    ctx.strokeStyle = "#2a1a08";
    ctx.lineWidth = 0.9 * s;
    blade(kx, ky, d + Math.PI + side * 0.5, 12 * s, 2.2 * s, -side * 0.15);
    ctx.strokeStyle = "#3a2810";
    for (const c of [-0.55, 0, 0.55]) {
      const ca = lo + c;
      const bx = fx + Math.cos(ca) * 2 * s, by = fy + Math.sin(ca) * 2 * s;
      const tx = fx + Math.cos(ca + side * 0.55) * 11 * s, ty = fy + Math.sin(ca + side * 0.55) * 11 * s;
      const nx = Math.cos(ca + Math.PI / 2) * 1.9 * s, ny = Math.sin(ca + Math.PI / 2) * 1.9 * s;
      ctx.fillStyle = boneFill(bx, by, tx, ty);
      ctx.beginPath();
      ctx.moveTo(bx + nx, by + ny);
      ctx.quadraticCurveTo(fx + Math.cos(ca) * 9 * s, fy + Math.sin(ca) * 9 * s, tx, ty);
      ctx.quadraticCurveTo(fx + Math.cos(ca) * 6 * s, fy + Math.sin(ca) * 6 * s, bx - nx, by - ny);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // knuckle lines where the talons meet the foot
    ctx.strokeStyle = pal.legScale;
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath();
    for (const c of [-0.55, 0, 0.55]) {
      const ca = lo + c, nx = Math.cos(ca + Math.PI / 2) * 1.6 * s, ny = Math.sin(ca + Math.PI / 2) * 1.6 * s;
      const kx2 = fx - Math.cos(ca) * 1.5 * s, ky2 = fy - Math.sin(ca) * 1.5 * s;
      ctx.moveTo(kx2 + nx, ky2 + ny); ctx.lineTo(kx2 - nx, ky2 - ny);
    }
    ctx.stroke();
}
export function drawBody($: BodyEnv) {
  const { ctx, seg, N, s, rad, dirAt, bodyPath, L, R, pal } = $;
  const leg = (i: number, side: number, phase: number) => drawLeg($, i, side, phase);
  const nrm = (i: number) => dirAt(i) + Math.PI / 2;
  const offP = (i: number, k: number) => {
    const a = nrm(i), r = rad(i), p = seg[i];
    return { x: p.x + Math.cos(a) * r * k, y: p.y + Math.sin(a) * r * k };
  };
  const band = (k1: number, k2: number, from: number, to: number) => {
    ctx.beginPath();
    for (let i = from; i <= to; i++) { const q = offP(i, k1); if (i === from) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y); }
    for (let i = to; i >= from; i--) { const q = offP(i, k2); ctx.lineTo(q.x, q.y); }
    ctx.closePath();
  };

  // barbed spade at the tail tip, as on the crest
  {
    const e = N - 1, p = seg[e], td = dirAt(e - 1) + Math.PI, k = 0.9 * s;
    const tb = (u: number, v: number) => ({ x: p.x + Math.cos(td) * u * k - Math.sin(td) * v * k, y: p.y + Math.sin(td) * u * k + Math.cos(td) * v * k });
    const P = (u: number, v: number) => { const q = tb(u, v); return [q.x, q.y] as const; };
    const g = ctx.createLinearGradient(...P(-6, 0), ...P(42, 0));
    g.addColorStop(0, "#5a4320");
    g.addColorStop(0.45, "#c9aa6e");
    g.addColorStop(1, "#fbf0d0");
    ctx.fillStyle = g;
    ctx.strokeStyle = "#2a1a08";
    ctx.lineWidth = 1.4 * s;
    ctx.beginPath();
    ctx.moveTo(...P(-6, 4));
    ctx.bezierCurveTo(...P(4, 9), ...P(6, 19), ...P(2, 22));
    ctx.lineTo(...P(14, 15));
    ctx.bezierCurveTo(...P(22, 12), ...P(30, 6), ...P(42, 0));
    ctx.bezierCurveTo(...P(30, -6), ...P(22, -12), ...P(14, -15));
    ctx.lineTo(...P(2, -22));
    ctx.bezierCurveTo(...P(6, -19), ...P(4, -9), ...P(-6, -4));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#6a4a1c";
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(...P(-2, 0)); ctx.lineTo(...P(36, 0));
    ctx.moveTo(...P(10, 0)); ctx.lineTo(...P(6, 12));
    ctx.moveTo(...P(10, 0)); ctx.lineTo(...P(6, -12));
    ctx.moveTo(...P(20, 0)); ctx.lineTo(...P(17, 8));
    ctx.moveTo(...P(20, 0)); ctx.lineTo(...P(17, -8));
    ctx.stroke();
  }

  // four legs, fore and hind, on both flanks
  leg(14, 1, 0); leg(14, -1, Math.PI);
  leg(46, 1, Math.PI); leg(46, -1, 0);

  // body: the old deep greens, rounded with shading, scale rows
  const body = ctx.createLinearGradient(seg[0].x, seg[0].y, seg[N - 1].x, seg[N - 1].y);
  body.addColorStop(0, pal.body[0]);
  body.addColorStop(0.22, pal.body[1]);
  body.addColorStop(0.6, pal.body[2]);
  body.addColorStop(1, pal.body[3]);
  ctx.fillStyle = body;
  bodyPath(L, R);
  ctx.fill();
  ctx.save();
  bodyPath(L, R);
  ctx.clip();
  // rounded shading: two lighter bands toward the spine (one fill each)
  ctx.fillStyle = pal.band1;
  band(-0.62, 0.62, 0, N - 3);
  ctx.fill();
  ctx.fillStyle = pal.band2;
  band(-0.31, 0.31, 0, N - 3);
  ctx.fill();
  // bronze belly armour showing along both flanks, with plate seams
  const belly = ctx.createLinearGradient(seg[0].x, seg[0].y, seg[N - 1].x, seg[N - 1].y);
  belly.addColorStop(0, "#c9aa6e");
  belly.addColorStop(0.5, "#8f7035");
  belly.addColorStop(1, "#4a3812");
  ctx.fillStyle = belly;
  for (const sd of [1, -1]) { band(sd * 0.8, sd * 1.08, 1, N - 6); ctx.fill(); }
  ctx.strokeStyle = "rgba(60, 40, 12, 0.8)";
  ctx.lineWidth = 1 * s;
  ctx.beginPath();
  for (let i = 3; i < N - 8; i += 2) for (const sd of [1, -1]) {
    const a = offP(i, sd * 0.8), b = offP(i + 1, sd * 1.05);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  ctx.strokeStyle = pal.seam;
  ctx.lineWidth = 1.1 * s;
  ctx.beginPath();
  for (const sd of [1, -1]) for (let i = 1; i < N - 6; i++) { const q = offP(i, sd * 0.8); if (i === 1) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y); }
  ctx.stroke();
  // overlapping scale plates in staggered rows, opening toward the tail
  const plates = new Path2D(), rims = new Path2D();
  for (let i = 2; i < N - 6; i++) {
    const p = seg[i], d = dirAt(i), r = rad(i);
    if (r < 3 * s) continue;
    const sz = r * 0.36, na = d + Math.PI / 2;
    for (const o of i % 2 ? [-0.36, 0.36] : [-0.68, 0, 0.68]) {
      const cx = p.x + Math.cos(na) * o * r, cy = p.y + Math.sin(na) * o * r;
      plates.moveTo(cx, cy);
      plates.arc(cx, cy, sz, d + Math.PI - 1.25, d + Math.PI + 1.25);
      plates.closePath();
      rims.moveTo(cx + Math.cos(d + Math.PI - 1.05) * sz, cy + Math.sin(d + Math.PI - 1.05) * sz);
      rims.arc(cx, cy, sz, d + Math.PI - 1.05, d + Math.PI + 1.05);
    }
  }
  ctx.fillStyle = pal.plate;
  ctx.fill(plates);
  ctx.strokeStyle = pal.rim;
  ctx.lineWidth = 0.9 * s;
  ctx.stroke(rims);
  ctx.fillStyle = pal.sheen;
  band(-0.2, 0.2, 2, Math.floor(N * 0.85));
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = pal.line;
  ctx.lineWidth = 1.7 * s;
  bodyPath(L, R);
  ctx.stroke();

  // bone dorsal spines down the middle of the back, raking toward the tail, largest at the neck
  ctx.strokeStyle = "#2a1a08";
  ctx.lineWidth = 0.8 * s;
  {
    // all spines in one path with a single head-to-tail bone gradient (cheaper than one gradient per spine)
    const sp = new Path2D();
    for (let i = N - 12; i >= 4; i -= 3) {
      const p = seg[i], d = dirAt(i), r = rad(i);
      const x = p.x + Math.cos(d) * r * 0.25, y = p.y + Math.sin(d) * r * 0.25, ang = d + Math.PI;
      const len = r * 0.85 + 2 * s, base = r * 0.17;
      const nx = Math.cos(ang + Math.PI / 2), ny = Math.sin(ang + Math.PI / 2);
      const tx = x + Math.cos(ang) * len, ty = y + Math.sin(ang) * len;
      sp.moveTo(x + nx * base, y + ny * base);
      sp.quadraticCurveTo(x + Math.cos(ang) * len * 0.6 + nx * base * 0.7, y + Math.sin(ang) * len * 0.6 + ny * base * 0.7, tx, ty);
      sp.quadraticCurveTo(x + Math.cos(ang) * len * 0.5 - nx * base * 0.3, y + Math.sin(ang) * len * 0.5 - ny * base * 0.3, x - nx * base, y - ny * base);
      sp.closePath();
    }
    const sg = ctx.createLinearGradient(seg[0].x, seg[0].y, seg[N - 1].x, seg[N - 1].y);
    sg.addColorStop(0, "#f3e4bc");
    sg.addColorStop(0.5, "#c9aa6e");
    sg.addColorStop(1, "#7a5a2a");
    ctx.fillStyle = sg;
    ctx.fill(sp);
    ctx.stroke(sp);
  }
}
