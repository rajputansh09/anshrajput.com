"use client";
// the living world behind the page: a dark Chinatown in the side margins
import type { Wall } from "./types";
import { roof } from "../../lib/emailArt";

export type Sky = { x: number; bx: number; y: number; vy: number; ph: number; r: number; a: number };
export type Ring = { x: number; y: number; r: number; age: number };
type Win = { x: number; y: number; w: number; h: number; ph: number; base: number };

const WRAP = 1180;

export class World {
  w = 0;
  h = 0;
  s = 1;
  wide = false;
  phone = false;
  margin = 0;
  walls: Wall[] = [];
  live = false;
  sky: Sky[] = [];
  rings: Ring[] = [];
  private nextSky = 1.5;
  private town: HTMLCanvasElement | null = null;
  private wins: Win[] = [];
  private townOpacity = 1;

  // town: a canvas of its own under the scene, drawn once per resize (the houses never move
  layout(w: number, h: number, s: number, dpr: number, hb: number, rail: DOMRect | null, town: HTMLCanvasElement) {
    this.w = w; this.h = h; this.s = s;
    this.phone = w < 700;
    const gutter = Math.max(20, Math.min(48, w * 0.05));
    this.margin = (w - Math.min(w, WRAP)) / 2 + gutter * 0.7;
    this.wide = !this.phone && this.margin >= 90;
    // walls: one jutting in from each side, clear of the dragon rail and the navigation bar
    this.walls = [];
    this.live = false;
    if (this.wide) {
      const T = 34, L = Math.min(this.margin - 16, 260);
      this.walls.push({ x: -12, y: Math.round(h * 0.52), w: L + 12, h: T, seed: 0.3 });
      const top = rail ? rail.top : h * 0.5 - 170;
      const y = Math.round((hb + top) / 2 - T / 2);
      if (top - hb > 120) this.walls.push({ x: w - L, y, w: L + 12, h: T, seed: 0.7 });
      else if (h - (rail ? rail.bottom : h * 0.5 + 170) > 260) this.walls.push({ x: w - L, y: Math.round((rail ? rail.bottom : h * 0.5 + 170) + 60), w: L + 12, h: T, seed: 0.7 });
    }
    this.buildTown(dpr, town);
    // lanterns already rising stay where they are; drop any now off-screen to the side
    this.sky = this.sky.filter((o) => o.x > -20 && o.x < w + 20);
  }

  // ---------- The town (side view, drawn once per resize) ----------
  private buildTown(dpr: number, c: HTMLCanvasElement) {
    const { w, h } = this;
    this.town = c;
    const H = this.phone ? 90 : 230;
    c.width = Math.round(w * dpr);
    c.height = Math.round(H * dpr);
    c.style.width = `${w}px`;
    c.style.height = `${H}px`;
    const g = c.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, H);
    this.wins = [];
    let seed = 7;
    const r = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const zones: [number, number][] = this.wide ? [[0, this.margin + 10], [w - this.margin - 10, w]] : [[0, w]];
    const k = this.phone ? 0.62 : this.wide ? Math.min(1.1, Math.max(0.75, this.margin / 170)) : 0.8;
    this.townOpacity = this.wide ? 1 : this.phone ? 0.38 : 0.45;
    c.style.opacity = String(this.townOpacity);
    const row = (base: number, wMin: number, wMax: number, maxTiers: number, lit: boolean, fill: string, stroke: string) => {
      for (const [z0, z1] of zones) {
        let x = z0 + 4;
        while (x < z1) {
          let hw = (wMin + r() * (wMax - wMin)) * k;
          const half = hw * 0.62 + 12 * k;
          if (x + half * 2 > z1 - 4) {
            hw = (z1 - 4 - x - 24 * k) / 1.24;
            if (hw < wMin * k * 0.6) break;
          }
          const hh = hw * 0.62 + 12 * k;
          const cx = x + hh;
          const tiers = Math.min(maxTiers, 1 + Math.floor(r() * (lit ? 3 : 2)));
          this.house(g, cx, base, hw, tiers, lit, r, fill, stroke, k);
          x = cx + hh + (6 + r() * 10) * k;
        }
      }
    };
    row(H - 40 * k, 44, 64, this.phone ? 1 : 3, false, "#0d271a", "#0d271a");
    // mist between the rows
    const mist = g.createLinearGradient(0, H - 120 * k, 0, H);
    mist.addColorStop(0, "rgba(10, 31, 21, 0)");
    mist.addColorStop(1, "rgba(4, 10, 6, 0.85)");
    g.fillStyle = mist;
    g.fillRect(0, H - 120 * k, w, 120 * k);
    row(H + 2, 60, 88, this.phone ? 2 : 3, true, "#0a1a12", "rgba(216, 180, 106, 0.24)");
    // windows are drawn every frame (they flicker), so convert them to screen space now
    for (const wn of this.wins) wn.y += h - H;
  }

  private house(g: CanvasRenderingContext2D, x: number, base: number, w: number, tiers: number, lit: boolean, r: () => number, fill: string, stroke: string, k: number) {
    let y = base, ww = w;
    g.lineJoin = "round";
    for (let i = 0; i < tiers; i++) {
      const hgt = (i === 0 ? 30 : 22) * k, hw = ww / 2;
      g.fillStyle = fill;
      g.strokeStyle = stroke;
      g.lineWidth = 1;
      g.fillRect(x - hw, y - hgt, ww, hgt + 2);
      g.strokeRect(x - hw, y - hgt, ww, hgt + 2);
      if (lit) {
        if (i === 0) {
          g.fillStyle = "#020604";
          g.beginPath();
          g.moveTo(x - 6 * k, y); g.lineTo(x - 6 * k, y - 13 * k);
          g.quadraticCurveTo(x, y - 20 * k, x + 6 * k, y - 13 * k); g.lineTo(x + 6 * k, y);
          g.closePath(); g.fill();
          if (hw * 0.55 - 5 * k > 9 * k) for (const sd of [-1, 1]) if (r() < 0.8) this.wins.push({ x: x + sd * hw * 0.55 - 5 * k, y: y - hgt + 8 * k, w: 10 * k, h: 12 * k, ph: r() * 9, base: 0.5 + r() * 0.35 });
        } else if (r() < 0.75) this.wins.push({ x: x - 5 * k, y: y - hgt + 6 * k, w: 10 * k, h: 11 * k, ph: r() * 9, base: 0.45 + r() * 0.4 });
      }
      const above = i < tiers - 1 ? (ww * 0.7) / 2 - 2 : null;
      // the roof outline is shared with the email banner; scale it about the wall top
      g.save();
      g.translate(x, y - hgt);
      g.scale(k, k);
      const p = new Path2D(roof(0, 0, (ww * 0.62) / k, above === null ? null : above / k));
      g.fillStyle = fill;
      g.fill(p);
      g.lineWidth = 1.1 / k;
      g.stroke(p);
      g.restore();
      y = y - hgt - 10 * k;
      ww *= 0.7;
    }
  }

  // ---------- Each step ----------
  step(t: number, hb: number) {
    const { w, h, s } = this;
    const cap = this.phone ? 3 : this.wide ? 8 : 5;
    if (t > this.nextSky && this.sky.length < cap) {
      this.nextSky = t + (this.phone ? 3.5 : 1.6) + Math.random() * 2.2;
      const r = (11 + Math.random() * 4) * Math.max(0.75, s);
      let x: number;
      if (this.wide && Math.random() < 0.7) {
        const left = Math.random() < 0.5, m = this.margin;
        x = left ? 16 + Math.random() * (m - 32) : w - m + 16 + Math.random() * (m - 32);
      } else x = 24 + Math.random() * (w - 48);
      this.sky.push({ x, bx: x, y: h + 40, vy: -(0.3 + Math.random() * 0.25) * Math.max(0.8, s), ph: Math.random() * 6.28, r, a: 0 });
    }
    for (const o of this.sky) {
      o.y += o.vy;
      o.x = o.bx + Math.sin(t * 0.55 + o.ph) * 14 * s + Math.sin(t * 1.7 + o.ph * 2) * 3;
      // fade in rising out of the street, fade out under the navigation bar
      o.a = Math.max(0, Math.min(1, (h + 40 - o.y) / 90, (o.y - hb - 6) / 130));
    }
    this.sky = this.sky.filter((o) => o.y > hb - 4);
    for (const g of this.rings) g.age += 1 / 60;
    this.rings = this.rings.filter((g) => g.age < 0.6);
  }

  // ---------- Drawing ---------- Behind the page, over the town: flickering windows and the rising lanterns
  drawScene(g: CanvasRenderingContext2D, t: number) {
    const { w, h } = this;
    g.clearRect(0, 0, w, h);
    if (this.town) {
      g.globalAlpha = this.townOpacity;
      for (const wn of this.wins) {
        const f = wn.base + Math.sin(t * 2.3 + wn.ph) * 0.06 + Math.sin(t * 7.1 + wn.ph * 3) * 0.04;
        g.fillStyle = `rgba(255, 179, 71, ${Math.max(0.2, f)})`;
        g.fillRect(wn.x, wn.y, wn.w, wn.h);
      }
      g.globalAlpha = 1;
    }
    for (const o of this.sky) if (o.a > 0.01) this.lantern(g, o, t);
  }

  private lantern(g: CanvasRenderingContext2D, o: Sky, t: number) {
    const { x, y, r } = o;
    const pulse = 0.85 + 0.15 * Math.sin(t * 1.4 + o.ph);
    g.save();
    g.globalAlpha = o.a;
    g.globalCompositeOperation = "lighter";
    const gl = g.createRadialGradient(x, y, 0, x, y, r * 3.4);
    gl.addColorStop(0, `rgba(255, 160, 60, ${0.3 * pulse})`);
    gl.addColorStop(1, "rgba(255, 110, 30, 0)");
    g.fillStyle = gl;
    g.beginPath(); g.arc(x, y, r * 3.4, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = "source-over";
    const bg = g.createRadialGradient(x - r * 0.25, y - r * 0.25, 1, x, y, r);
    bg.addColorStop(0, "#ffd58a");
    bg.addColorStop(0.55, "#e0612b");
    bg.addColorStop(1, "#7d1c10");
    g.fillStyle = bg;
    g.beginPath(); g.ellipse(x, y, r * 0.86, r, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(90, 20, 8, 0.55)";
    g.lineWidth = 1;
    for (const k of [0.3, 0.65]) { g.beginPath(); g.ellipse(x, y, r * 0.86 * k, r, 0, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = "#2a1a0f";
    g.fillRect(x - r * 0.45, y - r - 3, r * 0.9, 5);
    g.fillRect(x - r * 0.45, y + r - 2, r * 0.9, 5);
    // a small flame showing through the open base, and a tassel trailing below
    g.fillStyle = `rgba(255, 230, 160, ${0.8 * pulse})`;
    g.beginPath(); g.ellipse(x, y + r * 0.55, r * 0.18, r * 0.28, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#d8b46a";
    g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(x, y + r + 3); g.lineTo(x + Math.sin(t * 2.4 + o.ph) * 2.5, y + r + 12); g.stroke();
    g.restore();
  }

  // on the dragon layer, under the dragons: the walls (top view, brick with a tiled coping) and burst flashes
  drawWalls(g: CanvasRenderingContext2D, dpr: number) {
    if (!this.live) return;
    for (const wl of this.walls) {
      if (wl.ghost) continue;
      g.save();
      g.shadowColor = "rgba(0, 0, 0, 0.65)";
      g.shadowBlur = 16 * dpr;
      g.shadowOffsetX = 6 * dpr;
      g.shadowOffsetY = 12 * dpr;
      g.fillStyle = "#3b2119";
      g.fillRect(wl.x, wl.y, wl.w, wl.h);
      g.restore();
      // running-bond bricks either side of the coping
      g.save();
      g.beginPath(); g.rect(wl.x, wl.y, wl.w, wl.h); g.clip();
      g.fillStyle = "#2a150e";
      g.fillRect(wl.x, wl.y, wl.w, wl.h);
      // old bricks, each a slightly different shade, in running bond, with dark mortar between
      const rowH = wl.h / 6;
      let sd = Math.floor(wl.seed * 1000) + 3;
      const rnd = () => ((sd = (sd * 16807) % 2147483647) - 1) / 2147483646;
      for (let rI = 0; rI < 6; rI++) {
        if (rI >= 2 && rI <= 3) continue;
        for (let x = wl.x - (rI % 2) * 9 - 18; x < wl.x + wl.w; x += 18) {
          const l = 24 + rnd() * 14;
          g.fillStyle = `hsl(${12 + rnd() * 8}, ${38 + rnd() * 14}%, ${l * 0.62}%)`;
          g.fillRect(x + 1, wl.y + rI * rowH + 1, 16, rowH - 1.5);
          g.fillStyle = "rgba(255, 210, 170, 0.08)";
          g.fillRect(x + 1, wl.y + rI * rowH + 1, 16, 1);
        }
      }
      // coping: a ridge of dark glazed tiles down the middle, each tile rounded, with a brass rim along the edge
      const cy = wl.y + wl.h / 2, ch = rowH * 2.6;
      g.fillStyle = "#101a15";
      g.fillRect(wl.x, cy - ch / 2, wl.w, ch);
      for (let x = wl.x - 9 + wl.seed * 9; x < wl.x + wl.w; x += 9) {
        const tg = g.createLinearGradient(x, 0, x + 9, 0);
        tg.addColorStop(0, "#0b1410");
        tg.addColorStop(0.35, "#3a4f44");
        tg.addColorStop(0.6, "#1d2b24");
        tg.addColorStop(1, "#0b1410");
        g.fillStyle = tg;
        g.fillRect(x + 0.5, cy - ch / 2, 8.5, ch);
      }
      g.fillStyle = "rgba(216, 180, 106, 0.35)";
      g.fillRect(wl.x, cy - ch / 2, wl.w, 1);
      g.fillRect(wl.x, cy + ch / 2 - 1, wl.w, 1);
      g.restore();
      // tile end caps on the open end, and a thin outline
      const open = wl.x < 0 ? wl.x + wl.w : wl.x;
      g.fillStyle = "#1b2722";
      g.beginPath(); g.arc(open, cy, ch * 0.62, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "rgba(216, 180, 106, 0.45)";
      g.lineWidth = 1.2;
      g.beginPath(); g.arc(open, cy, ch * 0.62, 0, Math.PI * 2); g.stroke();
      g.fillStyle = "#d8b46a";
      g.beginPath(); g.arc(open, cy, 1.6, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#140a06";
      g.lineWidth = 1.4;
      g.strokeRect(wl.x, wl.y, wl.w, wl.h);
    }
  }

  drawRings(g: CanvasRenderingContext2D) {
    if (!this.rings.length) return;
    g.save();
    g.globalCompositeOperation = "lighter";
    for (const o of this.rings) {
      const k = o.age / 0.6;
      g.strokeStyle = `rgba(255, 200, 110, ${1 - k})`;
      g.lineWidth = 3;
      g.beginPath(); g.arc(o.x, o.y, o.r + k * 60 * this.s, 0, Math.PI * 2); g.stroke();
      const fg = g.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * 3);
      fg.addColorStop(0, `rgba(255, 240, 200, ${0.9 * (1 - k)})`);
      fg.addColorStop(1, "rgba(255, 140, 40, 0)");
      g.fillStyle = fg;
      g.beginPath(); g.arc(o.x, o.y, o.r * 3, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }
}
