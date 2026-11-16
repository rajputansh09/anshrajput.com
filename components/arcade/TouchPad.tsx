"use client";

// touch controls for phones and tablets
import { useRef, type MutableRefObject, type PointerEvent as RPE } from "react";

export type Stick = { x: number; y: number; id: number; cx: number; cy: number };
export type Kind = "twin" | "button" | "aim";

type Props = {
  kind: Kind;
  axis?: "x";
  label: string;
  toggle?: boolean;
  toggled: boolean;
  onToggle: (on: boolean) => void;
  move: MutableRefObject<Stick>;
  aim: MutableRefObject<Stick>;
  btn: MutableRefObject<{ a: boolean; b: boolean }>;
  drag: MutableRefObject<number>;
  hint?: string;
};

const R = 58;
const DEAD = 0.12;
const AIM_DRAG = 18;
const buzz = (ms: number) => { try { navigator.vibrate?.(ms); } catch { /* no vibration */ } };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const capture = (e: RPE<HTMLElement>) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not critical */ } };

export default function TouchPad(p: Props) {
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLSpanElement>(null);
  const o = useRef({ x: 0, y: 0, lastY: 0 });
  const f = useRef({ id: -1, x: 0, y: 0 });

  // left zone
  const place = (x: number, y: number) => {
    const b = base.current;
    if (b) { b.style.left = `${x}px`; b.style.top = `${y}px`; }
  };
  const leftMove = (e: RPE<HTMLDivElement>) => {
    const s = p.move.current;
    if (s.id !== e.pointerId) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (p.kind === "aim") {
      p.drag.current += e.clientY - o.current.lastY;
      o.current.lastY = e.clientY;
      if (knob.current) knob.current.style.transform = `translate3d(0, ${clamp(e.clientY - r.top - o.current.y, -R, R)}px, 0)`;
      return;
    }
    let dx = e.clientX - r.left - o.current.x;
    let dy = p.axis === "x" ? 0 : e.clientY - r.top - o.current.y;
    const d = Math.hypot(dx, dy);
    if (d > R) {
      // past the edge, so drag the stick along with the thumb
      o.current.x = clamp(o.current.x + dx - (dx * R) / d, R, r.width - R);
      if (p.axis !== "x") o.current.y = clamp(o.current.y + dy - (dy * R) / d, R, r.height - R);
      place(o.current.x, o.current.y);
      dx = (dx * R) / d; dy = (dy * R) / d;
    }
    const m = Math.min(1, Math.hypot(dx, dy) / R);
    const k = m < DEAD ? 0 : (m - DEAD) / (1 - DEAD) / (m || 1);
    s.x = (dx / R) * k; s.y = (dy / R) * k;
    if (knob.current) knob.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  };
  const leftDown = (e: RPE<HTMLDivElement>) => {
    if (p.move.current.id !== -1) return;
    capture(e);
    const r = e.currentTarget.getBoundingClientRect();
    o.current.x = clamp(e.clientX - r.left, R + 6, r.width - R - 6);
    o.current.y = clamp(e.clientY - r.top, R + 6, r.height - R - 6);
    o.current.lastY = e.clientY;
    place(o.current.x, o.current.y);
    base.current?.classList.add("on");
    p.move.current = { x: 0, y: 0, id: e.pointerId, cx: 0, cy: 0 };
    leftMove(e);
  };
  const leftUp = (e: RPE<HTMLDivElement>) => {
    if (p.move.current.id !== e.pointerId) return;
    p.move.current = { x: 0, y: 0, id: -1, cx: 0, cy: 0 };
    const b = base.current;
    if (b) { b.classList.remove("on"); b.style.left = ""; b.style.top = ""; }
    if (knob.current) knob.current.style.transform = "";
  };

  // right zone
  const rightDown = (e: RPE<HTMLDivElement>) => {
    if (f.current.id !== -1) return;
    capture(e);
    f.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    buzz(8);
    if (p.toggle) {
      const on = !p.btn.current.a;
      p.btn.current.a = on;
      p.onToggle(on);
    } else {
      p.btn.current.a = true;
      button.current?.classList.add("press");
    }
  };
  const rightMove = (e: RPE<HTMLDivElement>) => {
    if (f.current.id !== e.pointerId || p.kind !== "twin") return;
    const dx = e.clientX - f.current.x, dy = e.clientY - f.current.y, d = Math.hypot(dx, dy);
    if (d > AIM_DRAG) {
      p.aim.current = { x: dx / d, y: dy / d, id: e.pointerId, cx: 0, cy: 0 };
      if (dot.current) dot.current.style.transform = `translate3d(${(dx / d) * 30}px, ${(dy / d) * 30}px, 0)`;
      button.current?.classList.add("aiming");
    } else {
      p.aim.current = { x: 0, y: 0, id: -1, cx: 0, cy: 0 };
      if (dot.current) dot.current.style.transform = "";
      button.current?.classList.remove("aiming");
    }
  };
  const rightUp = (e: RPE<HTMLDivElement>) => {
    if (f.current.id !== e.pointerId) return;
    f.current.id = -1;
    if (!p.toggle) p.btn.current.a = false;
    p.aim.current = { x: 0, y: 0, id: -1, cx: 0, cy: 0 };
    button.current?.classList.remove("press", "aiming");
    if (dot.current) dot.current.style.transform = "";
  };

  const stop = (e: React.SyntheticEvent) => e.preventDefault();
  const shape = p.kind === "aim" ? " tp-y" : p.axis === "x" ? " tp-x" : "";
  const leftLabel = p.kind === "aim" ? "Drag up or down to aim" : p.axis === "x" ? "Slide to run" : p.kind === "twin" ? "Move" : "Walk";

  return (
    <div className={`tp tp-${p.kind}`} aria-hidden="true">
      <div
        className="tp-zone tp-left"
        onPointerDown={leftDown}
        onPointerMove={leftMove}
        onPointerUp={leftUp}
        onPointerCancel={leftUp}
        onLostPointerCapture={leftUp}
        onContextMenu={stop}
      >
        <div className={`tp-base${shape}`} ref={base}><span className="tp-knob" ref={knob} /></div>
        <span className="tp-label tp-label-l">{leftLabel}</span>
      </div>
      {p.hint && <p className="arc-rotate">{p.hint}</p>}
      <div
        className="tp-zone tp-right"
        onPointerDown={rightDown}
        onPointerMove={rightMove}
        onPointerUp={rightUp}
        onPointerCancel={rightUp}
        onLostPointerCapture={rightUp}
        onContextMenu={stop}
      >
        <div className={`tp-btn${p.kind === "twin" ? " tp-fire" : ""}${p.toggle && p.toggled ? " on" : ""}`} ref={button}>
          {p.kind === "twin" && <span className="tp-dot" ref={dot} />}
          <span className="tp-btn-t">{p.toggle && p.toggled ? "Drop" : p.label}</span>
        </div>
        {p.kind === "twin" && <span className="tp-label tp-label-r">Hold to fire. Drag to aim yourself.</span>}
      </div>
    </div>
  );
}
