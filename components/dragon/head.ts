"use client";
// the head, coloured from the dragon's palette
import type { P } from "./types";
import type { Parts } from "./parts";
import type { Pal } from "./palette";

// the head, seen from above: local frame +x toward the snout, +y to the dragon's right
let cache: ReturnType<typeof makePaths> | null = null;
function makePaths() {
  return {
    skull: new Path2D(
      "M-20 0 C-20 -9 -14 -17 -4 -19 C4 -20 10 -16 16 -13 C26 -11 38 -9 48 -5 C54 -3 57 -1.5 57 0" +
        " C57 1.5 54 3 48 5 C38 9 26 11 16 13 C10 16 4 20 -4 19 C-14 17 -20 9 -20 0 Z",
    ),
    fin: new Path2D("M-12 11 C-15 19 -19 27 -25 34 Q-28 29 -35 29.5 Q-36 24 -45 22 C-37 16 -30 11 -24 8 Z"),
    finRibs: new Path2D("M-13 12 Q-18 23 -25 32.5 M-17 11 Q-26 19 -34 28 M-21 9.5 Q-33 14 -43 21.5"),
    horn1: new Path2D("M3 8 C-12 9.5 -30 13 -48 19 C-60 23 -72 29 -84 38 C-72 25 -58 20 -42 18.5 C-28 17.5 -18 17.5 -8 17 Z"),
    horn1Rings: new Path2D("M-12 10.5 L-13 17.5 M-24 12 L-25.5 17.6 M-36 15.2 L-37.5 19.4 M-48 19 L-49.5 22.4 M-59 22.8 L-60.5 25.6 M-69 27.4 L-70.5 29.6"),
    horn2: new Path2D("M-4 15.5 C-14 19 -26 25 -38 33 C-47 39 -55 46 -61 54 C-53 41 -44 33 -32 27 C-24 23.5 -17 22 -11 21.5 Z"),
    horn2Rings: new Path2D("M-15 19 L-15.5 23 M-24 22.6 L-25.5 26.8 M-33 27.6 L-35 31 M-42 33.6 L-44 36.6 M-50 40 L-52 42.6"),
    jaw: new Path2D("M0 8 C14 12.5 32 12 46 6.5 L53 2.5 L46 2.5 C32 6 16 6 0 4 Z"),
    jawTicks: new Path2D("M14 9 L14.5 11.5 M24 9.4 L24.6 11.9 M34 8.4 L34.6 10.7 M42 6.6 L42.6 8.6"),
    lowFangs: new Path2D("M28 6.2 L30 3.2 L32 6 Z M38 5.2 L39.6 2.6 L41.2 4.8 Z M46 3.6 L47.2 1.6 L48.4 3.2 Z"),
    beard: new Path2D("M34 9.5 C30 15 22 19 10 21 M40 7.5 C37 13 31 17 22 20 M26 11 C22 16 15 19 4 20"),
    upFangs: new Path2D("M22 11.4 L26 10.6 L24.6 14.6 Z M32 9.8 L36.5 8.7 L35 13.6 Z M42 7.6 L45.4 6.6 L44.4 10 Z"),
    brow: new Path2D("M-3 17.5 C4 15 14 11 23.5 8.2 L21 5.6 C13 7.6 5 9.6 -1 11.6 Z"),
    browLight: new Path2D("M-1 12.3 C6 10.4 13 8.6 20.5 6.6"),
    eye: new Path2D("M4 11.6 C8 14.8 15 13.6 20 7.6 C14 7.4 8 8.4 4 11.6 Z"),
    cheek: new Path2D("M-12 15 Q-2 16.5 8 13.2 M-16 9 Q-8 11 -2 9.5"),
    ridges: new Path2D("M16 -3 L20.5 0 L16 3 M24 -3 L28.5 0 L24 3 M32 -2.8 L36.5 0 L32 2.8 M40 -2.4 L44 0 L40 2.4"),
    scales: new Path2D("M-14 4 Q-11 1 -8 4 M-14 -4 Q-11 -7 -8 -4 M-8 9 Q-5 6 -2 9 M-8 -9 Q-5 -12 -2 -9 M-6 0 Q-3 -3 0 0 M0 5 Q3 2 6 5 M0 -5 Q3 -8 6 -5"),
    crest: new Path2D("M-20 0 C-12 -1 -2 -1 10 0 C-2 1 -12 1 -20 0 Z"),
    lip: new Path2D("M10 12.6 C22 12 36 9.6 48 5.6 C52 4.2 55 2.6 56.5 1.2"),
  };
}

export type HeadEnv = {
  ctx: CanvasRenderingContext2D; seg: P[]; dirAt: (i: number) => number; HS: () => number; mouth: number; t: number;
  blinkAt: number; blinkLen: number; look: P; s: number; dpr: number; blade: Parts["blade"]; boneFill: Parts["boneFill"]; pal: Pal;
};

export function drawHead($: HeadEnv) {
  const { ctx, seg, dirAt, HS, mouth, t, blinkAt, blinkLen, look, s, dpr, blade, boneFill, pal } = $;
  const A = (cache ??= makePaths());
    // head, seen from above: fins, ringed horns, jaws that part sideways, fangs, brows, tracking eyes and whiskers
    const hp = seg[0], hd = dirAt(0);
    const open = mouth * mouth * (3 - 2 * mouth);
    const bp = (t - blinkAt) / blinkLen;
    const lid = open > 0 || bp < 0 || bp > 1 ? 0 : blinkLen > 0.3 ? Math.abs(Math.sin(bp * 2 * Math.PI)) : Math.sin(bp * Math.PI);
    const lg = (x1: number, y1: number, x2: number, y2: number, stops: [number, string][]) => {
      const g = ctx.createLinearGradient(x1, y1, x2, y2);
      for (const [o, c] of stops) g.addColorStop(o, c);
      return g;
    };
    ctx.save();
    ctx.translate(hp.x, hp.y);
    ctx.rotate(hd);
    ctx.scale(HS(), HS());
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const halves = (fn: (side: number) => void) => {
      for (const side of [1, -1]) { ctx.save(); ctx.scale(1, side); fn(side); ctx.restore(); }
    };
    halves(() => {
      // webbed neck fin with brass ribs
      ctx.fillStyle = lg(-12, 10, -50, 36, [[0, pal.fin[0]], [1, pal.fin[1]]]);
      ctx.strokeStyle = pal.line;
      ctx.lineWidth = 1.2;
      ctx.fill(A.fin);
      ctx.stroke(A.fin);
      ctx.strokeStyle = "rgba(201, 170, 110, 0.75)";
      ctx.lineWidth = 1;
      ctx.stroke(A.finRibs);
      // two swept horns, ringed
      ctx.strokeStyle = "#2a1a08";
      ctx.lineWidth = 1.2;
      ctx.fillStyle = boneFill(-6, 19, -61, 54);
      ctx.fill(A.horn2);
      ctx.stroke(A.horn2);
      ctx.fillStyle = boneFill(0, 13, -84, 38);
      ctx.fill(A.horn1);
      ctx.stroke(A.horn1);
      ctx.strokeStyle = "#6a4a1c";
      ctx.lineWidth = 1;
      ctx.stroke(A.horn2Rings);
      ctx.stroke(A.horn1Rings);
      // beard under the chin
      ctx.strokeStyle = "rgba(217, 196, 140, 0.7)";
      ctx.lineWidth = 1.3;
      ctx.stroke(A.beard);
      // throat, then the lower jaw hinged at the back, swinging out to breathe
      if (open > 0.01) {
        // throat: from the centre line out to the swung jaw's inner edge, so nothing pokes past the snout
        const a = open * 0.3, ca = Math.cos(a), sa = Math.sin(a);
        const rot = (x: number, y: number) => [x * ca - (y - 6) * sa, x * sa + (y - 6) * ca + 6] as const;
        ctx.fillStyle = "#4a0d06";
        ctx.beginPath();
        ctx.moveTo(2, 0);
        ctx.lineTo(52, 0);
        ctx.lineTo(...rot(50, 2.5));
        ctx.lineTo(...rot(32, 6));
        ctx.lineTo(...rot(16, 6));
        ctx.lineTo(...rot(2, 4));
        ctx.closePath();
        ctx.fill();
      }
      ctx.save();
      ctx.translate(0, 6);
      ctx.rotate(open * 0.3);
      ctx.translate(0, -6);
      ctx.fillStyle = lg(0, 2, 0, 12, [[0, "#d9b56c"], [1, "#7a5622"]]);
      ctx.strokeStyle = pal.jawLine;
      ctx.lineWidth = 1.2;
      ctx.fill(A.jaw);
      ctx.stroke(A.jaw);
      ctx.strokeStyle = "#5a3e14";
      ctx.lineWidth = 0.9;
      ctx.stroke(A.jawTicks);
      ctx.fillStyle = "#f2e6c4";
      ctx.fill(A.lowFangs);
      ctx.restore();
    });
    if (open > 0) {
      const mg = ctx.createRadialGradient(50, 0, 0, 50, 0, 22);
      mg.addColorStop(0, `rgba(255, 220, 140, ${open})`);
      mg.addColorStop(1, "rgba(255, 120, 30, 0)");
      ctx.fillStyle = mg;
      ctx.beginPath(); ctx.arc(50, 0, 22, 0, Math.PI * 2); ctx.fill();
    }
    // skull: deep green, rounded with shading, snout ridge plates and fine scales
    ctx.fillStyle = lg(-20, 0, 57, 0, [[0, pal.skull[0]], [0.45, pal.skull[1]], [1, pal.skull[2]]]);
    ctx.fill(A.skull);
    ctx.save();
    ctx.clip(A.skull);
    ctx.fillStyle = lg(0, -20, 0, 20, [[0, `rgba(${pal.shade}, 0.55)`], [0.36, `rgba(${pal.shade}, 0)`], [0.5, pal.shadeLight], [0.64, `rgba(${pal.shade}, 0)`], [1, `rgba(${pal.shade}, 0.55)`]]);
    ctx.fillRect(-22, -22, 82, 44);
    ctx.fillStyle = pal.crest;
    ctx.fill(A.crest);
    ctx.strokeStyle = pal.ridge;
    ctx.lineWidth = 1;
    ctx.stroke(A.ridges);
    ctx.strokeStyle = pal.scale;
    ctx.lineWidth = 0.9;
    ctx.stroke(A.scales);
    ctx.restore();
    ctx.strokeStyle = pal.line;
    ctx.lineWidth = 1.5;
    ctx.stroke(A.skull);
    halves((side) => {
      ctx.fillStyle = "#f6ecd0";
      ctx.strokeStyle = "#3a2a10";
      ctx.lineWidth = 0.5;
      ctx.fill(A.upFangs);
      ctx.stroke(A.upFangs);
      ctx.strokeStyle = pal.cheek;
      ctx.lineWidth = 0.9;
      ctx.stroke(A.cheek);
      // mouth seam along the jaw line, as on the crest
      ctx.strokeStyle = `rgba(74, 13, 6, ${0.9 * (1 - open)})`;
      ctx.lineWidth = 1.1;
      ctx.stroke(A.lip);
      ctx.strokeStyle = "#2a1a08";
      ctx.lineWidth = 0.8;
      blade(-6, 17.5, Math.PI * 0.8, 11, 2.4, 0.1);
      ctx.fillStyle = pal.brow;
      ctx.strokeStyle = pal.line;
      ctx.lineWidth = 0.8;
      ctx.fill(A.brow);
      ctx.stroke(A.brow);
      ctx.strokeStyle = pal.browLight;
      ctx.lineWidth = 0.9;
      ctx.stroke(A.browLight);
      // glowing eye; the slit pupil follows what the dragon is watching, and the lid blinks
      ctx.save();
      if (s > 0.7) {
        // the glow blur is costly and barely visible at phone size, so it only runs on larger screens
        ctx.shadowColor = `rgba(255, 110, 20, ${0.75 + open * 0.25})`;
        ctx.shadowBlur = (9 + open * 16) * dpr;
      }
      const eg = ctx.createRadialGradient(12, 10.4, 0, 12, 10.4, 9);
      eg.addColorStop(0, "#fff1b0");
      eg.addColorStop(0.45, "#ffb43c");
      eg.addColorStop(1, "#d4430c");
      ctx.fillStyle = eg;
      ctx.fill(A.eye);
      ctx.restore();
      ctx.save();
      ctx.clip(A.eye);
      const px = 12 + look.x * 3.4, py = 10.4 + look.y * side * 1.5;
      ctx.fillStyle = "#160600";
      ctx.beginPath();
      ctx.ellipse(px, py, 1.25 - open * 0.5, 3.4, -0.245, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff6dc";
      ctx.beginPath();
      ctx.arc(9.6, 10.6, 0.85, 0, Math.PI * 2);
      ctx.fill();
      if (lid > 0.02) {
        ctx.translate(12, 10.4);
        ctx.rotate(-0.245);
        const top = 4 - 8 * lid;
        ctx.fillStyle = pal.lid;
        ctx.fillRect(-10, top, 20, 6);
        ctx.strokeStyle = pal.line;
        ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.moveTo(-10, top); ctx.lineTo(10, top); ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = "#020604";
      ctx.beginPath(); ctx.ellipse(50, 2.6, 2.2, 1.1, 0.4, 0, Math.PI * 2); ctx.fill();
      // long whisker, swaying, fading toward its tip
      ctx.strokeStyle = lg(49, 4, -43, 26, [[0, "#f3e2b0"], [1, "rgba(243, 226, 176, 0)"]]);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let k = 0; k <= 22; k++) {
        const u = k / 22;
        const x = 49 - u * 92;
        const y = 4 + u * 22 + Math.sin(t * 3.4 + u * 7 + side) * 7 * u;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
    ctx.restore();
}
