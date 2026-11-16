"use client";
// split out of Dragon.tsx so each source file stays small; the code is unchanged
export function makeParts(ctx: CanvasRenderingContext2D) {
  const limb = (x1: number, y1: number, x2: number, y2: number, w1: number, w2: number) => {
    const a = Math.atan2(y2 - y1, x2 - x1);
    const nx = Math.cos(a + Math.PI / 2), ny = Math.sin(a + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(x1 + nx * w1, y1 + ny * w1);
    ctx.lineTo(x2 + nx * w2, y2 + ny * w2);
    ctx.arc(x2, y2, w2, a + Math.PI / 2, a - Math.PI / 2, true);
    ctx.lineTo(x1 - nx * w1, y1 - ny * w1);
    ctx.arc(x1, y1, w1, a - Math.PI / 2, a + Math.PI / 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  // bone gradient shared by spines, horns, spurs and talons (dark root, pale tip), as on the crest
  const boneFill = (x1: number, y1: number, x2: number, y2: number) => {
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    g.addColorStop(0, "#5a4320");
    g.addColorStop(0.45, "#c9aa6e");
    g.addColorStop(1, "#fbf0d0");
    return g;
  };
  // a curved bone blade from (x, y) toward angle ang
  const blade = (x: number, y: number, ang: number, len: number, base: number, bend = 0.18) => {
    const nx = Math.cos(ang + Math.PI / 2), ny = Math.sin(ang + Math.PI / 2);
    const tx = x + Math.cos(ang + bend) * len, ty = y + Math.sin(ang + bend) * len;
    ctx.fillStyle = boneFill(x, y, tx, ty);
    ctx.beginPath();
    ctx.moveTo(x + nx * base, y + ny * base);
    ctx.quadraticCurveTo(x + Math.cos(ang) * len * 0.6 + nx * base * 0.7, y + Math.sin(ang) * len * 0.6 + ny * base * 0.7, tx, ty);
    ctx.quadraticCurveTo(x + Math.cos(ang) * len * 0.5 - nx * base * 0.3, y + Math.sin(ang) * len * 0.5 - ny * base * 0.3, x - nx * base, y - ny * base);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  return { limb, boneFill, blade };
}
export type Parts = ReturnType<typeof makeParts>;
