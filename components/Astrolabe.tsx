"use client";
// the skill astrolabe: a carved bronze-and-stone instrument
import { useEffect, useMemo, useRef, useState } from "react";
import { rings, seals } from "../lib/skills";
import { dragonBus } from "./dragonBus";
import { sound } from "./astroSound";
import "./astrolabe.css";

const VB = 560;
const RADII = [245, 320, 395, 468];
const SPEED = [0.035, -0.028, 0.022, -0.017];
const SEAL_R = 150;
const BAND = 34;
const RUNES = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ";
const STORE = "astro-awake";
const FIRE = "#ffb04a";

type Sel = { kind: "skill" | "seal"; id: string } | null;
type Node = { id: string; name: string; short: string; note?: string; uses: string[]; ring: number; idx: number; n: number; glyph: string };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; sprite: number };
type Fire = { start: number; arrived: boolean };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const nodes: Node[] = rings.flatMap((r, ri) =>
  r.skills.map((s, idx) => ({
    id: slug(s.name),
    name: s.name,
    short: s.short ?? s.name,
    note: s.note,
    uses: s.uses,
    ring: ri,
    idx,
    n: r.skills.length,
    glyph: RUNES[(ri * 7 + idx * 3) % RUNES.length],
  })),
);
const TOTAL = nodes.length;
const byId = new Map(nodes.map((n) => [n.id, n]));
const sealPos = new Map(
  seals.map((s, k) => {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / seals.length;
    return [s.id, { x: SEAL_R * Math.cos(a), y: SEAL_R * Math.sin(a) }];
  }),
);
const sealName = new Map(seals.map((s) => [s.id, s.name]));

const ticks = (r: number, n: number, len: number) => {
  let d = "";
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    d += `M${(r * c).toFixed(1)} ${(r * s).toFixed(1)}L${((r - len) * c).toFixed(1)} ${((r - len) * s).toFixed(1)}`;
  }
  return d;
};
const circlePath = (r: number) => `M${r} 0A${r} ${r} 0 1 1 ${-r} 0A${r} ${r} 0 1 1 ${r} 0`;
const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const bez = (p: { x: number; y: number }, c: { x: number; y: number }, q: { x: number; y: number }, u: number) => {
  const v = 1 - u;
  return { x: v * v * p.x + 2 * v * u * c.x + u * u * q.x, y: v * v * p.y + 2 * v * u * c.y + u * u * q.y };
};

// soft round sprites for the fire, one per colour, drawn once
const makeSprite = (hex: string) => {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,250,230,1)");
  gr.addColorStop(0.25, hex);
  gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return c;
};

export default function Astrolabe() {
  const [hover, setHover] = useState<Sel>(null);
  const [locked, setLocked] = useState<Sel>(null);
  const [hidden, setHidden] = useState<number[]>([]);
  const [still, setStill] = useState(false);
  const [view, setView] = useState<"astro" | "scroll">("astro");
  const [awake, setAwake] = useState<Set<string>>(() => new Set());
  const [loaded, setLoaded] = useState(false);
  const [blaze, setBlaze] = useState(false);
  const [compact, setCompact] = useState(false);
  const [focusRing, setFocusRing] = useState(0);
  const [seen, setSeen] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const active = hover ?? locked;
  const complete = awake.size === TOTAL;

  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const nodeEls = useRef(new Map<string, SVGGElement>());
  const ringEls = useRef<(HTMLDivElement | null)[]>([]);
  const sweepLayer = useRef<HTMLDivElement>(null);
  const threadEls = useRef(new Map<string, SVGPathElement>());
  const labelEls = useRef(new Map<string, SVGTextElement>());
  const sweepEls = useRef<(SVGGElement | null)[]>([]);
  const sealsEl = useRef<SVGGElement>(null);
  const pupilEl = useRef<SVGEllipseElement>(null);
  const inscriptionEl = useRef<HTMLDivElement>(null);
  const dwell = useRef<number | null>(null);

  // mutable state shared with the animation loop
  const sim = useRef({
    ang: [0.2, 1.1, 0.5, 2.0],
    vel: [0, 0, 0, 0],
    spd: [...SPEED],
    dragging: -1,
    t0: -1,
    pos: new Map<string, { x: number; y: number }>(),
    look: { x: 0, y: 0, rx: 6 },
    pointer: null as null | { x: number; y: number },
    fires: new Map<string, Fire>(),
    sparks: [] as Spark[],
    bursts: [] as string[], // rune ids that just woke, to burst on the next frame
    queue: [] as { id: string; at: number }[], // staggered wake-ups ("Wake all")
    finaleAt: -1,
    lastBreath: -1e9,
    goto: [null, null, null, null] as (number | null)[], // target angles when a ring is spun to a rune
    ringFlare: [] as { ring: number; at: number }[],
    low: false, // adaptive quality for slow devices
  });
  const awakeRef = useRef(awake);
  awakeRef.current = awake;
  const userWoke = useRef(false);

  // wake runes
  const wake = (ids: string[]) => {
    const fresh = ids.filter((id) => !awakeRef.current.has(id));
    if (!fresh.length) return;
    const next = new Set(awakeRef.current);
    fresh.forEach((id) => next.add(id));
    awakeRef.current = next;
    sim.current.bursts.push(...fresh);
    userWoke.current = true;
    setAwake(next);
  };
  const wakeRef = useRef(wake);
  wakeRef.current = wake;

  // restore woken runes for returning visitors, and save as they change
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || "[]") as string[];
      const valid = saved.filter((id) => byId.has(id));
      if (valid.length) {
        const s = new Set(valid);
        awakeRef.current = s;
        setAwake(s);
      }
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORE, JSON.stringify([...awake]));
    } catch {}
  }, [awake, loaded]);

  // a ring fully awake: sparks race round it, its band takes its colour, and a chord plays
  const doneRings = useMemo(() => rings.map((_, i) => nodes.every((n) => n.ring !== i || awake.has(n.id))), [awake]);
  const prevDone = useRef<boolean[]>([false, false, false, false]);
  useEffect(() => {
    if (!loaded) return;
    doneRings.forEach((d, i) => {
      if (d && !prevDone.current[i] && userWoke.current) {
        sim.current.ringFlare.push({ ring: i, at: performance.now() });
        sound.chord(i);
        if (awakeRef.current.size < TOTAL) {
          setToast(`${rings[i].name} ring fully awake`);
          window.setTimeout(() => setToast(null), 2600);
        }
      }
    });
    prevDone.current = doneRings;
  }, [doneRings, loaded]);

  // finale: every rune awake
  useEffect(() => {
    if (!complete || !userWoke.current) return;
    userWoke.current = false;
    sim.current.finaleAt = performance.now();
    dragonBus.celebrateUntil = performance.now() + 5200;
    setLocked(null);
    setHover(null);
    sound.roar();
    setBlaze(true);
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (m) {
      const p = new DOMPoint(0, 0).matrixTransform(m);
      dragonBus.breathe = { x: p.x, y: p.y };
    }
    const t = window.setTimeout(() => setBlaze(false), 3800);
    return () => window.clearTimeout(t);
  }, [complete]);

  const { litSkills, litSeals, threads } = useMemo(() => {
    const ls = new Set<string>();
    const lz = new Set<string>();
    const th: { key: string; sk: string; sl: string; toRune: boolean }[] = [];
    if (active?.kind === "skill") {
      const n = byId.get(active.id);
      if (n) {
        ls.add(n.id);
        n.uses.forEach((u) => (lz.add(u), th.push({ key: `s:${n.id}>${u}`, sk: n.id, sl: u, toRune: false })));
      }
    } else if (active?.kind === "seal") {
      lz.add(active.id);
      nodes.forEach((n) => {
        if (n.uses.includes(active.id) && !hidden.includes(n.ring)) {
          ls.add(n.id);
          th.push({ key: `z:${n.id}>${active.id}`, sk: n.id, sl: active.id, toRune: true });
        }
      });
    }
    return { litSkills: ls, litSeals: lz, threads: th };
  }, [active, hidden]);

  const live = useRef({ active, still, hidden, threads, lit: litSeals, litSkills, compact, focusRing });
  live.current = { active, still, hidden, threads, lit: litSeals, litSkills, compact, focusRing };

  const screenOf = (p: { x: number; y: number }) => {
    const m = svgRef.current?.getScreenCTM();
    if (!m) return null;
    const q = new DOMPoint(p.x, p.y).matrixTransform(m);
    return { x: q.x, y: q.y };
  };
  const breatheAt = (sel: NonNullable<Sel>) => {
    const s = sim.current;
    const now = performance.now();
    if (now - s.lastBreath < 1200) return;
    const p = sel.kind === "skill" ? s.pos.get(sel.id) : sealPos.get(sel.id);
    const q = p && screenOf(p);
    if (q) {
      dragonBus.breathe = q;
      s.lastBreath = now;
    }
  };

  // animation, fire and input, only while the astrolabe is on screen
  useEffect(() => {
    if (view !== "astro") return;
    const svg = svgRef.current;
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!svg || !canvas || !stage) return;
    const ctx = canvas.getContext("2d");
    const s = sim.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) s.spd = [0, 0, 0, 0];
    const sprites = [makeSprite(FIRE), makeSprite("#ff6a2a"), ...rings.map((r) => makeSprite(r.hue))];
    let raf = 0;
    let last = 0;
    let visible = false;
    let cw = 0, ch = 0, scale = 1, drewSparks = false, kNow = 1.3;
    const placed = new Map<string, string>();
    const widths = new Map<string, number>();
    // re-measure label widths once the web fonts arrive (fallback fonts are narrower)
    document.fonts?.ready.then(() => widths.clear()).catch(() => {});

    // labels sit below their gem, flip above if that would overlap another label or gem, and hide if neither fits
    const placeLabels = () => {
      const L = live.current;
      const font = 16 * kNow;
      const off = (19 + 16 * 0.95) * kNow;
      const boxes: { x: number; y: number; w: number; h: number; id?: string }[] = [];
      const visible = nodes.filter((n) => !L.hidden.includes(n.ring));
      for (const n of visible) {
        const p = s.pos.get(n.id);
        if (p) boxes.push({ x: p.x, y: p.y, w: 44 * kNow, h: 44 * kNow, id: n.id });
      }
      const sk = Math.min(kNow, 1.3);
      for (const q of sealPos.values()) boxes.push({ x: q.x, y: q.y, w: 70 * sk, h: 80 * sk });
      boxes.push({ x: 0, y: 0, w: 148, h: 148 });
      const rank = (n: Node) => (L.litSkills.has(n.id) ? 0 : awakeRef.current.has(n.id) ? 1 : 2);
      const order = [...visible].sort((a, b) => rank(a) - rank(b));
      // a label may touch its own gem's box (it sits right beside it) but nothing else
      const hits = (b: { x: number; y: number; w: number; h: number }, self: string) =>
        boxes.some((o) => o.id !== self && Math.abs(o.x - b.x) * 2 < o.w + b.w && Math.abs(o.y - b.y) * 2 < o.h + b.h);
      for (const n of order) {
        const el = labelEls.current.get(n.id);
        const p = s.pos.get(n.id);
        if (!el || !p) continue;
        const shown = !L.compact || L.litSkills.has(n.id);
        let where = "x";
        if (shown) {
          // real text width (measured once per size), so the boxes match what is drawn
          let wl = widths.get(n.id);
          if (!wl) {
            try {
              wl = el.getComputedTextLength();
            } catch {
              wl = 0;
            }
            if (!wl) wl = n.short.length * 16 * 0.58;
            widths.set(n.id, wl);
          }
          const w = (wl + 16) * kNow;
          const hh = font * 1.45;
          const side = (24 + wl / 2 + 2) * kNow;
          const dg = (14 + wl / 2) * kNow;
          const cands: [string, number, number][] = [
            ["b", 0, off],
            ["a", 0, -off],
            ["r", side, 0],
            ["l", -side, 0],
            ["br", dg, off * 0.85],
            ["bl", -dg, off * 0.85],
            ["ar", dg, -off * 0.85],
            ["al", -dg, -off * 0.85],
          ];
          // keep the current spot while it still fits, so labels don't flicker between positions
          const cur = (placed.get(n.id) ?? "").split(":")[0];
          cands.sort((a, b) => (a[0] === cur ? -1 : b[0] === cur ? 1 : 0));
          for (const [k, dx, dy] of cands) {
            const box = { x: p.x + dx, y: p.y + dy, w, h: hh };
            // stay inside the instrument's square, so no label is clipped at the screen edge or pokes into the card
            const inside = Math.abs(box.x) + box.w / 2 <= VB - 10 && Math.abs(box.y) + box.h / 2 <= VB - 10;
            if (inside && !hits(box, n.id)) {
              where = k;
              boxes.push(box);
              break;
            }
          }
        }
        const key = `${where}:${Math.round(widths.get(n.id) ?? 0)}`;
        if (placed.get(n.id) !== key) {
          placed.set(n.id, key);
          const wl = widths.get(n.id) ?? 0;
          const dgl = 14 + wl / 2;
          const lx = where === "r" ? 24 + wl / 2 + 2 : where === "l" ? -(24 + wl / 2 + 2) : where === "br" || where === "ar" ? dgl : where === "bl" || where === "al" ? -dgl : 0;
          const ly = where === "a" ? -29 : where === "ar" || where === "al" ? -23.5 : where === "br" || where === "bl" ? 34.7 : where === "r" || where === "l" ? 5.6 : 40;
          el.setAttribute("x", lx.toFixed(1));
          el.setAttribute("y", String(ly));
          el.style.opacity = shown && where === "x" ? "0" : "";
        }
      }
    };
    let frameNo = 0;
    let sweepMask = "";
    let ema = 0.016, slow = 0, tickAcc = 0;

    const spawn = (x: number, y: number, n: number, speed: number, sprite: number, size = 14, life = 0.7) => {
      if (reduce || s.sparks.length > (s.low ? 250 : 700)) return;
      if (s.low) n = Math.ceil(n / 2);
      for (let k = 0; k < n; k++) {
        const a = Math.random() * Math.PI * 2;
        const v = speed * (0.3 + Math.random() * 0.7);
        const l = life * (0.6 + Math.random() * 0.6);
        s.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: l, max: l, size: size * (0.6 + Math.random() * 0.8), sprite });
      }
    };

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (s.t0 < 0) s.t0 = reduce ? t - 5000 : t;
      const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016);
      last = t;
      const L = live.current;
      const act = L.active;
      const actRing = act?.kind === "skill" ? byId.get(act.id)?.ring ?? -1 : -1;

      // rings turn; the ring under inspection slows to a stop
      for (let i = 0; i < 4; i++) {
        const target = L.still || reduce || i === actRing ? 0 : SPEED[i];
        s.spd[i] += (target - s.spd[i]) * Math.min(1, dt * 3);
        const g = s.goto[i];
        if (g !== null && s.dragging !== i) {
          // spinning a ring to bring a rune to the top
          s.ang[i] += (g - s.ang[i]) * Math.min(1, dt * 4.5);
          s.vel[i] = 0;
          if (Math.abs(g - s.ang[i]) < 0.003) s.goto[i] = null;
        } else if (s.dragging !== i) {
          s.ang[i] += (s.spd[i] + s.vel[i]) * dt;
          s.vel[i] *= Math.exp(-dt * 1.4);
        }
        const e = ease((t - s.t0 - i * 160) / 1400);
        const dir = Math.sign(SPEED[i]);
        const a = s.ang[i] - dir * Math.pow(1 - e, 2) * 2.6;
        const r = RADII[i] * e;
        const rl = ringEls.current[i];
        if (rl) rl.style.transform = `rotate(${((a * 180) / Math.PI).toFixed(2)}deg) scale(${e.toFixed(3)})`;
        for (const n of nodes) {
          if (n.ring !== i) continue;
          const th = a + (n.idx * 2 * Math.PI) / n.n;
          const x = r * Math.cos(th), y = r * Math.sin(th);
          s.pos.set(n.id, { x, y });
          const el = nodeEls.current.get(n.id);
          if (el) {
            el.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
            el.style.opacity = e < 1 ? e.toFixed(3) : "";
          }
        }
      }
      sealsEl.current?.setAttribute("transform", `scale(${ease((t - s.t0) / 900).toFixed(3)})`);
      if (inscriptionEl.current && !reduce) inscriptionEl.current.style.transform = `rotate(${(-(t - s.t0) / 1100).toFixed(2)}deg)`;
      ema = ema * 0.95 + dt * 0.05;
      slow = ema > 0.03 ? slow + 1 : 0;
      if (slow > 120 && !s.low) s.low = true;
      if (frameNo % 240 === 0) widths.clear();
      if (frameNo++ % (s.low ? 6 : 3) === 0) placeLabels();

      // light sweeps along the bands: all four on arrival, then one ring at a time
      {
        let u = -1, mask = "";
        const intro = (t - s.t0 - 900) / 1900;
        if (intro >= 0 && intro < 1) (u = intro), (mask = "0123");
        else if (t - s.t0 > 4000) {
          const cyc = (t - s.t0 - 4000) / 3000;
          const k = (cyc % 1) * 1.6;
          if (k < 1) (u = k), (mask = String(Math.floor(cyc) % 4));
        }
        const layer = sweepLayer.current;
        if (layer) {
          if (u >= 0 && !reduce && !s.low) {
            if (mask !== sweepMask) {
              sweepMask = mask;
              sweepEls.current.forEach((g, i) => g && (g.style.opacity = mask.includes(String(i)) ? "1" : "0"));
            }
            const dir = mask.length === 1 ? Math.sign(SPEED[+mask]) : 1;
            layer.style.transform = `rotate(${(-90 + dir * ease(u) * 360).toFixed(1)}deg)`;
            layer.style.opacity = Math.sin(u * Math.PI).toFixed(3);
          } else if (layer.style.opacity !== "0") layer.style.opacity = "0";
        }
      }

      // staggered wake-ups
      if (s.queue.length) {
        const due = s.queue.filter((q) => q.at <= t).map((q) => q.id);
        if (due.length) {
          s.queue = s.queue.filter((q) => q.at > t);
          wakeRef.current(due);
        }
      }
      // bursts for runes that just woke
      for (const id of s.bursts.splice(0)) {
        const p = s.pos.get(id);
        const n = byId.get(id);
        if (n) sound.chime(n.ring, n.idx);
        if (p && n) {
          spawn(p.x, p.y, 26, 140, 2 + n.ring, 16, 0.8);
          spawn(p.x, p.y, 10, 60, 0, 22, 0.5);
        }
      }

      for (let f = s.ringFlare.length - 1; f >= 0; f--) {
        const rf = s.ringFlare[f];
        const ft = (t - rf.at) / 1000;
        if (ft > 1.4) {
          s.ringFlare.splice(f, 1);
          continue;
        }
        // two comets of sparks race round the completed ring
        for (const side of [0, Math.PI]) {
          const a = side + ft * Math.PI * 2.2;
          spawn(RADII[rf.ring] * Math.cos(a), RADII[rf.ring] * Math.sin(a), 3, 70, 2 + rf.ring, 18, 0.6);
        }
      }

      // fire channels: the flame front runs rune to seal (a skill) or seal to rune (a project)
      const keys = new Set(L.threads.map((th) => th.key));
      for (const k of s.fires.keys()) if (!keys.has(k)) s.fires.delete(k);
      const arrivals: string[] = [];
      for (const th of L.threads) {
        let f = s.fires.get(th.key);
        if (!f) s.fires.set(th.key, (f = { start: t, arrived: false }));
        const p = s.pos.get(th.sk);
        const q = sealPos.get(th.sl);
        if (!p || !q) continue;
        const c = { x: (p.x + q.x) * 0.3, y: (p.y + q.y) * 0.3 };
        const prog = reduce ? 1 : Math.min(1, (t - f.start) / 620);
        const el = threadEls.current.get(th.key);
        if (el) {
          // absolute dash lengths (not pathLength), which Safari has handled inconsistently
          let len = 0, prev = p;
          for (let j = 1; j <= 10; j++) {
            const b = bez(p, c, q, j / 10);
            len += Math.hypot(b.x - prev.x, b.y - prev.y);
            prev = b;
          }
          el.setAttribute("d", `M${p.x.toFixed(1)} ${p.y.toFixed(1)}Q${c.x.toFixed(1)} ${c.y.toFixed(1)} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`);
          el.style.strokeDasharray = `${len.toFixed(1)} ${(len + 2).toFixed(1)}`;
          el.style.strokeDashoffset = ((th.toRune ? -(1 - prog) : 1 - prog) * len).toFixed(1);
        }
        const front = bez(p, c, q, th.toRune ? 1 - prog : prog);
        if (prog < 1) spawn(front.x, front.y, 3, 40, 0, 20, 0.45);
        else {
          if (!f.arrived) {
            f.arrived = true;
            const end = th.toRune ? p : q;
            spawn(end.x, end.y, 18, 120, 1, 16, 0.6);
            if (th.toRune) arrivals.push(th.sk);
          }
          if (Math.random() < 0.25) {
            const m = bez(p, c, q, Math.random());
            spawn(m.x, m.y, 1, 12, 0, 12, 0.6);
          }
        }
      }
      if (arrivals.length) wakeRef.current(arrivals);
      // lit seals burn
      for (const id of L.lit) {
        const q = sealPos.get(id);
        if (q && Math.random() < 0.6 && !reduce) s.sparks.push({ x: q.x + (Math.random() - 0.5) * 30, y: q.y - 10, vx: (Math.random() - 0.5) * 10, vy: -40 - Math.random() * 40, life: 0.7, max: 0.7, size: 16, sprite: Math.random() < 0.5 ? 0 : 1 });
      }
      // finale: rings of fire sweep outward from the eye
      if (s.finaleAt > 0) {
        const ft = (t - s.finaleAt) / 1000;
        if (ft < 2.4) {
          for (let i = 0; i < 4; i++) {
            const local = ft - i * 0.25;
            if (local > 0 && local < 1.2) {
              const a = Math.random() * Math.PI * 2;
              for (let k = 0; k < 4; k++) {
                const b = a + (k * Math.PI) / 2;
                spawn(RADII[i] * Math.cos(b), RADII[i] * Math.sin(b), 2, 80, k % 2 ? 0 : 2 + i, 22, 0.8);
              }
            }
          }
          if (ft < 0.5) spawn(0, 0, 8, 260, 0, 26, 0.9);
        } else s.finaleAt = -1;
      }

      // draw the sparks
      if (ctx && (s.sparks.length || drewSparks)) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, cw, ch);
        ctx.setTransform(scale, 0, 0, scale, cw / 2, ch / 2);
        ctx.globalCompositeOperation = "lighter";
        for (let k = s.sparks.length - 1; k >= 0; k--) {
          const p = s.sparks[k];
          p.life -= dt;
          if (p.life <= 0) {
            s.sparks.splice(k, 1);
            continue;
          }
          p.vx *= Math.exp(-dt * 2.2);
          p.vy = p.vy * Math.exp(-dt * 2.2) - 60 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          const life = p.life / p.max;
          const sz = p.size * (0.5 + life * 0.7);
          ctx.globalAlpha = Math.min(1, life * 1.4);
          ctx.drawImage(sprites[p.sprite], p.x - sz, p.y - sz, sz * 2, sz * 2);
        }
        ctx.globalAlpha = 1;
        drewSparks = s.sparks.length > 0;
      }

      // the eye follows whatever is lit, or the pointer
      let tx = 0, ty = 0;
      const tgt = act ? (act.kind === "skill" ? s.pos.get(act.id) : sealPos.get(act.id)) : s.pointer;
      if (tgt) {
        const d = Math.hypot(tgt.x, tgt.y) || 1;
        const m = Math.min(15, d * 0.05);
        tx = (tgt.x / d) * m;
        ty = (tgt.y / d) * m * 0.6;
      }
      const k = Math.min(1, dt * 8);
      s.look.x += (tx - s.look.x) * k;
      s.look.y += (ty - s.look.y) * k;
      s.look.rx += ((act ? 11 : 5.5) - s.look.rx) * Math.min(1, dt * 5);
      const pu = pupilEl.current;
      if (pu) {
        pu.setAttribute("cx", s.look.x.toFixed(2));
        pu.setAttribute("cy", s.look.y.toFixed(2));
        pu.setAttribute("rx", s.look.rx.toFixed(2));
      }

      // ask the dragon to guard the rim while the astrolabe is centred on screen
      const rect = svg.getBoundingClientRect();
      const cy = rect.top + rect.height / 2;
      dragonBus.guard =
        cy > window.innerHeight * 0.2 && cy < window.innerHeight * 0.8
          ? { cx: rect.left + rect.width / 2, cy, r: (rect.width / 2) * (552 / VB) + 6 }
          : null;
    };

    const start = () => {
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      dragonBus.guard = null;
    };
    const io = new IntersectionObserver(
      ([en]) => {
        visible = en.isIntersecting;
        if (en.intersectionRatio > 0.3) setSeen(true);
        if (visible && !document.hidden) start();
        else stop();
      },
      { threshold: [0, 0.3, 0.6] },
    );
    io.observe(stage);
    // while any part of the section fills the middle of the screen, tuck the dragon's button rail away (phones)
    const root = stage.closest(".astro");
    const near = new IntersectionObserver(([en]) => document.documentElement.classList.toggle("astro-near", en.isIntersecting), {
      rootMargin: "-30% 0px -30% 0px",
    });
    if (root) near.observe(root);
    const onVis = () => (document.hidden ? stop() : visible && start());
    document.addEventListener("visibilitychange", onVis);

    // size the fire canvas to the stage, and scale runes up on small screens so they stay readable
    const ro = new ResizeObserver(() => {
      const w = svg.getBoundingClientRect().width || 600;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cw = canvas.width = Math.round(w * dpr);
      ch = canvas.height = Math.round(w * dpr);
      scale = cw / (VB * 2);
      widths.clear();
      kNow = Math.max(1, ((VB * 2) / w) * (w < 560 ? 0.7 : 0.9));
      svg.style.setProperty("--k", kNow.toFixed(3));
      // hit areas: as big as possible without reaching into the next ring (rings are 75 units apart)
      const hitR = Math.max(20, 36 / kNow).toFixed(1);
      svg.querySelectorAll(".rune-hit").forEach((c) => c.setAttribute("r", hitR));
      setCompact(w < 560);
    });
    ro.observe(svg);

    // turning a ring and picking things
    type Cand = { ring: number; id: string | null; kind: string | null; x0: number; y0: number; claimed: boolean; moved: boolean; last: number; lt: number; v: number; touch: boolean };
    let cand: Cand | null = null;
    const toSvg = (cx: number, cy: number) => {
      const m = svg.getScreenCTM();
      if (!m) return { x: 0, y: 0 };
      const p = new DOMPoint(cx, cy).matrixTransform(m.inverse());
      return { x: p.x, y: p.y };
    };
    const begin = (cx: number, cy: number, target: EventTarget | null, touch: boolean) => {
      const p = toSvg(cx, cy);
      const d = Math.hypot(p.x, p.y);
      let ring = -1;
      RADII.forEach((r, i) => {
        if (Math.abs(d - r) < BAND && !live.current.hidden.includes(i)) ring = i;
      });
      if (ring >= 0) setFocusRing(ring);
      const hit = (target as Element | null)?.closest?.<SVGElement>("[data-kind]");
      cand = { ring, id: hit?.dataset.id ?? null, kind: hit?.dataset.kind ?? null, x0: cx, y0: cy, claimed: !touch && ring >= 0, moved: false, last: Math.atan2(p.y, p.x), lt: performance.now(), v: 0, touch };
    };
    const drag = (cx: number, cy: number) => {
      if (!cand) return;
      const dx = cx - cand.x0, dy = cy - cand.y0;
      if (!cand.moved && Math.hypot(dx, dy) > 6) {
        cand.moved = true;
        if (cand.touch && cand.ring >= 0 && Math.abs(dx) > Math.abs(dy) * 1.2) cand.claimed = true;
      }
      if (!cand.claimed || cand.ring < 0 || !cand.moved) return;
      const p = toSvg(cx, cy);
      s.dragging = cand.ring;
      svg.classList.add("grabbing");
      const a = Math.atan2(p.y, p.x);
      const da = wrapAngle(a - cand.last);
      const now = performance.now();
      s.ang[cand.ring] += da;
      s.goto[cand.ring] = null;
      cand.v = cand.v * 0.6 + (da / Math.max(0.008, (now - cand.lt) / 1000)) * 0.4;
      // friction sparks where the ring is grabbed, and a ratchet click every few degrees
      const sp = Math.abs(cand.v);
      if (sp > 1.2) spawn(p.x, p.y, Math.min(6, Math.round(sp)), 90 + sp * 30, Math.random() < 0.5 ? 0 : 1, 10, 0.4);
      tickAcc += Math.abs(da);
      if (tickAcc > 0.12) {
        tickAcc = 0;
        sound.tick();
      }
      cand.last = a;
      cand.lt = now;
    };
    const finish = () => {
      if (!cand) return;
      if (s.dragging >= 0) {
        s.vel[s.dragging] = Math.max(-5, Math.min(5, cand.v - s.spd[s.dragging]));
        s.dragging = -1;
      } else if (!cand.moved) {
        if (cand.kind === "eye") oracleRef.current();
        else if (cand.id && cand.kind) {
          pickRef.current({ kind: cand.kind as "skill" | "seal", id: cand.id });
          if (cand.touch) setHover(null);
        } else setLocked(null);
      }
      svg.classList.remove("grabbing");
      cand = null;
    };
    const cancel = () => {
      if (s.dragging >= 0) s.dragging = -1;
      svg.classList.remove("grabbing");
      cand = null;
    };

    let pid = -1;
    const down = (e: PointerEvent) => {
      e.stopPropagation();
      if (e.pointerType === "touch" || e.button > 0) return;
      pid = e.pointerId;
      begin(e.clientX, e.clientY, e.target, false);
      if (cand?.claimed) {
        try {
          svg.setPointerCapture(pid);
        } catch {}
      }
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (e.pointerType === "mouse") {
        s.pointer = toSvg(e.clientX, e.clientY);
        const r = svg.getBoundingClientRect();
        stage.style.setProperty("--tx", `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
        stage.style.setProperty("--ty", `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
        stage.classList.add("torch");
      }
      if (cand && !cand.touch && e.pointerId === pid) drag(e.clientX, e.clientY);
    };
    const up = (e: PointerEvent) => {
      if (e.pointerType === "touch" || !cand || cand.touch || e.pointerId !== pid) return;
      finish();
    };
    const pcancel = (e: PointerEvent) => {
      if (e.pointerType !== "touch") cancel();
    };
    const tStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return cancel();
      const t = e.touches[0];
      begin(t.clientX, t.clientY, e.target, true);
    };
    const tMove = (e: TouchEvent) => {
      if (!cand || !cand.touch) return;
      if (e.touches.length !== 1) return cancel();
      const t = e.touches[0];
      drag(t.clientX, t.clientY);
      if (cand?.claimed && e.cancelable) e.preventDefault();
      // a vertical swipe belongs to the page: drop it so lifting the finger isn't treated as a tap
      if (cand && cand.moved && !cand.claimed) cand = null;
    };
    const tEnd = (e: TouchEvent) => {
      if (!cand || !cand.touch) return;
      if (cand.claimed || !cand.moved) e.preventDefault();
      finish();
    };
    const leave = () => {
      s.pointer = null;
      stage.classList.remove("torch");
    };
    svg.addEventListener("pointerdown", down);
    svg.addEventListener("pointermove", move);
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointercancel", pcancel);
    svg.addEventListener("pointerleave", leave);
    svg.addEventListener("touchstart", tStart, { passive: true });
    svg.addEventListener("touchmove", tMove, { passive: false });
    svg.addEventListener("touchend", tEnd, { passive: false });
    svg.addEventListener("touchcancel", cancel);

    return () => {
      stop();
      io.disconnect();
      near.disconnect();
      ro.disconnect();
      document.documentElement.classList.remove("astro-near");
      document.removeEventListener("visibilitychange", onVis);
      svg.removeEventListener("pointerdown", down);
      svg.removeEventListener("pointermove", move);
      svg.removeEventListener("pointerup", up);
      svg.removeEventListener("pointercancel", pcancel);
      svg.removeEventListener("pointerleave", leave);
      svg.removeEventListener("touchstart", tStart);
      svg.removeEventListener("touchmove", tMove);
      svg.removeEventListener("touchend", tEnd);
      svg.removeEventListener("touchcancel", cancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // choosing a rune or seal: lock it, wake it, and have the dragon breathe on it
  const pick = (sel: NonNullable<Sel>) => {
    setLocked((cur) => (cur && cur.id === sel.id && cur.kind === sel.kind ? null : sel));
    if (sel.kind === "skill") wakeRef.current([sel.id]);
    sound.whoosh();
    breatheAt(sel);
  };

  // spin a rune's ring so the rune comes to the top, then pick it
  const bringToTop = (id: string) => {
    const n = byId.get(id);
    if (!n) return;
    const s = sim.current;
    setHidden((h) => h.filter((x) => x !== n.ring));
    if (view !== "astro") setView("astro");
    const th = s.ang[n.ring] + (n.idx * 2 * Math.PI) / n.n;
    s.goto[n.ring] = s.ang[n.ring] + wrapAngle(-Math.PI / 2 - th);
    setFocusRing(n.ring);
    if (window.innerWidth < 960) stageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      setLocked(null);
      pickRef.current({ kind: "skill", id });
    }, 650);
  };

  // the dragon's eye points you to a sleeping rune; once all are awake it calls for another victory lap
  const oracle = () => {
    const sleeping = nodes.filter((n) => !awakeRef.current.has(n.id));
    if (!sleeping.length) {
      dragonBus.celebrateUntil = performance.now() + 4000;
      sound.roar();
      return;
    }
    const linked = sleeping.filter((n) => n.uses.length);
    const pool = linked.length ? linked : sleeping;
    bringToTop(pool[Math.floor(Math.random() * pool.length)].id);
  };
  const oracleRef = useRef(oracle);
  oracleRef.current = oracle;

  // best matches first: exact name, then names starting with the query, then any word starting with it
  const matches = (() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const score = (n: Node) => {
      const name = n.name.toLowerCase();
      if (name === q || n.short.toLowerCase() === q) return 0;
      if (name.startsWith(q)) return 1;
      if (name.split(/[\s.]+/).some((w) => w.startsWith(q))) return 2;
      return name.includes(q) ? 3 : 9;
    };
    return nodes
      .map((n) => [score(n), n] as const)
      .filter(([sc]) => sc < 9)
      .sort((a, b) => a[0] - b[0] || a[1].name.length - b[1].name.length)
      .slice(0, 6)
      .map(([, n]) => n);
  })();
  const findSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (matches[0]) {
      bringToTop(matches[0].id);
      setQuery("");
    }
  };
  const toggleSound = () => {
    const v = !soundOn;
    sound.set(v);
    setSoundOn(v);
    if (v) sound.chime(0, 4);
  };
  const pickRef = useRef(pick);
  pickRef.current = pick;

  const hoverOn = (sel: NonNullable<Sel>) => (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    setHover(sel);
    if (dwell.current) window.clearTimeout(dwell.current);
    if (sel.kind === "skill") dwell.current = window.setTimeout(() => wakeRef.current([sel.id]), 320);
  };
  const hoverOff = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    setHover(null);
    if (dwell.current) window.clearTimeout(dwell.current);
  };
  const keyed = (sel: NonNullable<Sel>) => ({
    tabIndex: 0,
    role: "button",
    onFocus: () => {
      setHover(sel);
      if (sel.kind === "skill") wakeRef.current([sel.id]);
    },
    onBlur: () => setHover(null),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pickRef.current(sel);
      }
      if (e.key === "Escape") setLocked(null);
      if (sel.kind === "skill" && e.key.startsWith("Arrow")) {
        // arrow keys move between runes: left and right along a ring, up and down between rings
        e.preventDefault();
        const n = byId.get(sel.id)!;
        let ring = n.ring, idx = n.idx;
        if (e.key === "ArrowRight") idx = (idx + 1) % n.n;
        if (e.key === "ArrowLeft") idx = (idx - 1 + n.n) % n.n;
        if (e.key === "ArrowUp") ring = Math.min(3, ring + 1);
        if (e.key === "ArrowDown") ring = Math.max(0, ring - 1);
        const list = nodes.filter((m) => m.ring === ring);
        const next = list[Math.min(idx, list.length - 1)];
        svgRef.current?.querySelector<SVGGElement>(`[data-id="${next.id}"]`)?.focus();
      }
    },
  });
  const realign = () => {
    const s = sim.current;
    s.vel = [0, 0, 0, 0];
    s.ang = [0.2, 1.1, 0.5, 2.0];
    s.t0 = performance.now();
    setLocked(null);
  };
  const wakeAll = () => {
    const now = performance.now();
    const sleeping = nodes.filter((n) => !awakeRef.current.has(n.id));
    sim.current.queue = sleeping.map((n, i) => ({ id: n.id, at: now + n.ring * 260 + i * 45 }));
    if (view !== "astro") wake(sleeping.map((n) => n.id));
  };
  const sleepAll = () => {
    sim.current.queue = [];
    const empty = new Set<string>();
    awakeRef.current = empty;
    setAwake(empty);
    setLocked(null);
  };
  const toggleRing = (i: number) => setHidden((h) => (h.includes(i) ? h.filter((x) => x !== i) : [...h, i]));

  const activeNode = active?.kind === "skill" ? byId.get(active.id) : undefined;
  const activeSeal = active?.kind === "seal" ? seals.find((s) => s.id === active.id) : undefined;
  const hint = seen && loaded && awake.size === 0 && !active ? "next-js" : null;
  const ringAwake = (i: number) => nodes.filter((n) => n.ring === i && awake.has(n.id)).length;

  return (
    <div className={`astro view-${view}`}>
      {view === "astro" && (
        <div className={`astro-stage${complete ? " is-complete" : ""}`} ref={stageRef}>
          <div className="astro-disc" aria-hidden="true" />
          {/* static layer: rim and bronze bands */}
          <svg className="astro-layer" viewBox={`${-VB} ${-VB} ${VB * 2} ${VB * 2}`} aria-hidden="true">
            <defs>
              <linearGradient id="astro-bronze" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#f6e2a6" />
                <stop offset="0.18" stopColor="#c99a4e" />
                <stop offset="0.42" stopColor="#6b4a1c" />
                <stop offset="0.6" stopColor="#a87a36" />
                <stop offset="0.8" stopColor="#4a3112" />
                <stop offset="1" stopColor="#2a1c0a" />
              </linearGradient>
              <linearGradient id="astro-rim" x1="0" y1="0" x2="0.8" y2="1">
                <stop offset="0" stopColor="#fbe9b4" />
                <stop offset="0.3" stopColor="#b3843f" />
                <stop offset="0.55" stopColor="#5a3e17" />
                <stop offset="0.8" stopColor="#8c6328" />
                <stop offset="1" stopColor="#24180a" />
              </linearGradient>
              <radialGradient id="astro-light" cx="30%" cy="22%" r="80%">
                <stop offset="0" stopColor="#fff6dc" stopOpacity="0.16" />
                <stop offset="0.45" stopColor="#fff6dc" stopOpacity="0.03" />
                <stop offset="0.8" stopColor="#000" stopOpacity="0.12" />
                <stop offset="1" stopColor="#000" stopOpacity="0.45" />
              </radialGradient>
            </defs>
            <circle r="538" className="rim-band" />
            <circle r="551" className="rim-edge" />
            <circle r="525" className="rim-edge" />
            <path d={ticks(524, 120, 7)} className="rim-ticks" />
            {RADII.map((r, i) => (
              <g key={i} className={`band${hidden.includes(i) ? " gone" : ""}${doneRings[i] ? " done" : ""}`} style={{ ["--hue" as string]: rings[i].hue }}>
                <circle r={r} className="band-metal" />
                <circle r={r + 15} className="band-groove" />
                <circle r={r - 15} className="band-groove" />
                <circle r={r - 13} className="band-shine" />
              </g>
            ))}
            <circle r="552" fill="url(#astro-light)" />
          </svg>

          <div className="astro-torch" aria-hidden="true" />

          {/* turning layers, rotated by the compositor without repainting */}
          <div className="astro-spins">
          <div ref={inscriptionEl} className="astro-spin" style={{ inset: 0 }} aria-hidden="true">
            <svg viewBox={`${-VB} ${-VB} ${VB * 2} ${VB * 2}`}>
              <defs>
                <path id="astro-inscribe" d={circlePath(538)} />
              </defs>
              <text className="rim-text">
                <textPath href="#astro-inscribe" xlinkHref="#astro-inscribe">{(RUNES + "  ").repeat(5)}</textPath>
              </text>
            </svg>
          </div>
          {rings.map((ring, i) => {
            const R = RADII[i] + 22;
            const pct = (R / VB) * 50;
            return (
              <div
                key={ring.name}
                ref={(el) => void (ringEls.current[i] = el)}
                className={`astro-spin${hidden.includes(i) ? " gone" : ""}`}
                style={{ left: `${50 - pct}%`, top: `${50 - pct}%`, width: `${pct * 2}%`, height: `${pct * 2}%` }}
                aria-hidden="true"
              >
                <svg viewBox={`${-R} ${-R} ${R * 2} ${R * 2}`}>
                  <defs>
                    <path id={`astro-band-${i}`} d={circlePath(RADII[i])} />
                  </defs>
                  <path d={ticks(RADII[i] + 14, 96, 5)} className="ring-ticks" />
                  {[0, 0.5].map((off) => (
                    <text key={off} className="ring-name" dy="0.35em">
                      <textPath href={`#astro-band-${i}`} xlinkHref={`#astro-band-${i}`} startOffset={`${(off + 0.5 / ring.skills.length) * 100}%`} textAnchor="middle">
                        {ring.label}
                      </textPath>
                    </text>
                  ))}
                </svg>
              </div>
            );
          })}
          <div ref={sweepLayer} className="astro-spin astro-sweep" style={{ inset: 0, opacity: 0 }} aria-hidden="true">
            <svg viewBox={`${-VB} ${-VB} ${VB * 2} ${VB * 2}`}>
              {RADII.map((r, i) => (
                <g key={i} ref={(el) => void (sweepEls.current[i] = el)} style={{ opacity: 0 }}>
                  {[0.5, 0.28, 0.12].map((len, j) => (
                    <path
                      key={j}
                      d={`M${r} 0A${r} ${r} 0 0 0 ${(r * Math.cos(-len)).toFixed(1)} ${(r * Math.sin(-len)).toFixed(1)}`}
                      style={{ strokeOpacity: [0.18, 0.4, 0.9][j], strokeWidth: [22, 14, 6][j] }}
                    />
                  ))}
                </g>
              ))}
            </svg>
          </div>

          </div>

          {/* live layer: runes, seals, fire channels and the eye */}
          <svg
            ref={svgRef}
            className={`astro-svg${active ? " has-active" : ""}${blaze ? " blaze" : ""}${compact ? " compact" : ""}${complete ? " complete" : ""}${seen ? " seen" : ""}`}
            data-focus={focusRing}
            viewBox={`${-VB} ${-VB} ${VB * 2} ${VB * 2}`}
            role="group"
            aria-label="Skill astrolabe. Each rune is a skill; the seals in the centre are projects."
          >
            <defs>
              <radialGradient id="astro-rim2" cx="35%" cy="30%" r="75%">
                <stop offset="0" stopColor="#fbe9b4" />
                <stop offset="0.45" stopColor="#9c7032" />
                <stop offset="1" stopColor="#24180a" />
              </radialGradient>
              <radialGradient id="astro-bezel" cx="38%" cy="32%" r="70%">
                <stop offset="0" stopColor="#f8e6ae" />
                <stop offset="0.45" stopColor="#a87a36" />
                <stop offset="1" stopColor="#3a2610" />
              </radialGradient>
              <radialGradient id="astro-socket" cx="50%" cy="40%" r="60%">
                <stop offset="0" stopColor="#2c3d32" />
                <stop offset="1" stopColor="#050a07" />
              </radialGradient>
              {rings.map((r, i) => (
                <radialGradient key={i} id={`astro-gem-${i}`} cx="38%" cy="32%" r="72%">
                  <stop offset="0" stopColor="#fffbe8" />
                  <stop offset="0.3" stopColor={r.hue} />
                  <stop offset="1" stopColor="#120b04" />
                </radialGradient>
              ))}
              {rings.map((r, i) => (
                <radialGradient key={`h${i}`} id={`astro-halo-${i}`}>
                  <stop offset="0" stopColor={r.hue} stopOpacity="0.75" />
                  <stop offset="0.45" stopColor={r.hue} stopOpacity="0.22" />
                  <stop offset="1" stopColor={r.hue} stopOpacity="0" />
                </radialGradient>
              ))}
              <radialGradient id="astro-fire-halo">
                <stop offset="0" stopColor="#ffd27a" stopOpacity="0.9" />
                <stop offset="0.5" stopColor="#ff7a2a" stopOpacity="0.3" />
                <stop offset="1" stopColor="#ff7a2a" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="astro-iris" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#fff1b8" />
                <stop offset="0.35" stopColor="#ffc24a" />
                <stop offset="0.75" stopColor="#d2631a" />
                <stop offset="1" stopColor="#5a1a06" />
              </radialGradient>
              <clipPath id="astro-almond">
                <path d="M-54 0Q0 -46 54 0Q0 46 -54 0Z" />
              </clipPath>
            </defs>
            {RADII.map((r, i) => (
              <circle key={i} r={r} className={`ring-hit${hidden.includes(i) ? " gone" : ""}`} />
            ))}

            <g className="astro-threads" aria-hidden="true">
              {threads.map((th) => (
                <path
                  key={th.key}
                  ref={(el) => void (el ? threadEls.current.set(th.key, el) : threadEls.current.delete(th.key))}
                  className="thread"
                />
              ))}
            </g>

            <g ref={sealsEl} className="astro-seals">
              <circle r={SEAL_R} className="seal-orbit" aria-hidden="true" />
              {seals.map((s) => {
                const p = sealPos.get(s.id)!;
                const on = litSeals.has(s.id);
                return (
                  <g
                    key={s.id}
                    transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}
                    className={`seal${on ? " lit" : active ? " dim" : ""}`}
                    data-id={s.id}
                    data-kind="seal"
                    aria-label={`${s.name}: ${s.line}`}
                    aria-pressed={locked?.id === s.id}
                    onPointerEnter={hoverOn({ kind: "seal", id: s.id })}
                    onPointerLeave={hoverOff}
                    {...keyed({ kind: "seal", id: s.id })}
                  >
                    <g className="seal-body">
                      <circle r="52" fill="url(#astro-fire-halo)" className="seal-halo" />
                      <circle r="44" className="seal-hit" />
                      <path d="M0 -36L31.2 -18L31.2 18L0 36L-31.2 18L-31.2 -18Z" className="seal-hex" />
                      <path d="M0 -28L24.2 -14L24.2 14L0 28L-24.2 14L-24.2 -14Z" className="seal-face" />
                      <text className="seal-mono" dy="0.36em">
                        {s.mono}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>

            {nodes.map((n) => {
              const on = litSkills.has(n.id);
              const gone = hidden.includes(n.ring);
              const isAwake = awake.has(n.id);
              return (
                <g key={n.id} ref={(el) => void (el ? nodeEls.current.set(n.id, el) : nodeEls.current.delete(n.id))} className="rune-pos">
                  <g
                    className={`rune r${n.ring}${on ? " lit" : active ? " dim" : ""}${gone ? " gone" : ""}${isAwake ? " awake" : ""}`}
                    data-id={n.id}
                    data-kind="skill"
                    aria-label={`${n.name}${n.uses.length ? `, used in ${n.uses.map((u) => sealName.get(u)).join(", ")}` : ""}`}
                    aria-pressed={locked?.id === n.id}
                    onPointerEnter={hoverOn({ kind: "skill", id: n.id })}
                    onPointerLeave={hoverOff}
                    {...keyed({ kind: "skill", id: n.id })}
                    tabIndex={gone ? -1 : 0}
                  >
                    <circle r="40" fill={`url(#astro-halo-${n.ring})`} className="rune-halo" />
                    {hint === n.id && <circle r="25" className="rune-hint" />}
                    <circle r="26" className="rune-hit" />
                    <circle r="19" fill="url(#astro-bezel)" className="rune-bezel" />
                    <circle r="14.5" fill="url(#astro-socket)" />
                    <circle r="14.5" fill={`url(#astro-gem-${n.ring})`} className="rune-gem" />
                    <text className="rune-glyph" dy="0.36em" style={{ animationDelay: `${((n.idx * 0.53 + n.ring * 0.71) % 3.2).toFixed(2)}s` }}>
                      {n.glyph}
                    </text>
                    <text className="rune-label" y="40" ref={(el) => void (el ? labelEls.current.set(n.id, el) : labelEls.current.delete(n.id))}>
                      {n.short}
                    </text>
                  </g>
                </g>
              );
            })}

            <g
              className="astro-eye"
              data-kind="eye"
              role="button"
              tabIndex={0}
              aria-label={complete ? "Every rune is awake. Ask the dragon for a victory lap" : "Ask the dragon's eye to show you a sleeping rune"}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  oracle();
                }
              }}
            >
              <title>{complete ? "Victory lap" : "Show me a sleeping rune"}</title>
              <circle r="100" fill="url(#astro-fire-halo)" className="eye-halo" />
              <circle r="72" fill="url(#astro-rim)" className="eye-bezel" />
              <circle r="62" className="eye-rim" />
              <path d={ticks(70, 36, 5)} className="eye-ticks" />
              <g className="eye-lid">
                <path d="M-54 0Q0 -46 54 0Q0 46 -54 0Z" className="eye-white" />
                <g clipPath="url(#astro-almond)">
                  <circle r="40" fill="url(#astro-iris)" />
                  <ellipse ref={pupilEl} rx="5.5" ry="30" className="eye-pupil" />
                  <circle cx="-12" cy="-12" r="4" className="eye-shine" />
                </g>
                <path d="M-54 0Q0 -46 54 0Q0 46 -54 0Z" className="eye-edge" />
              </g>
            </g>
          </svg>
          <canvas ref={canvasRef} className="astro-fire" aria-hidden="true" />
          {toast && (
            <p className="astro-toast" role="status">
              {toast}
            </p>
          )}
          {(activeNode || activeSeal) && (
            <button type="button" className="astro-caption" onClick={() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}>
              <strong>{activeNode?.name ?? activeSeal?.name}</strong>
              <span>
                {activeNode
                  ? activeNode.uses.length
                    ? `${activeNode.uses.length} project${activeNode.uses.length > 1 ? "s" : ""}`
                    : "In the hoard"
                  : `${litSkills.size} runes`}{" "}
                &middot; details &darr;
              </span>
            </button>
          )}
        </div>
      )}

      {/* on phones the rings are too tight for every name, so the chosen ring's runes are listed here instead */}
      {view === "astro" && compact && (
        <div className="astro-strip">
          <div className="astro-tabs" role="tablist" aria-label="Rings">
            {rings.map((r, i) => (
              <button key={r.name} type="button" role="tab" aria-selected={focusRing === i} onClick={() => setFocusRing(i)} style={{ color: r.hue }}>
                {r.tag}
              </button>
            ))}
          </div>
          <ul className="astro-runes">
            {nodes
              .filter((n) => n.ring === focusRing)
              .map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`${awake.has(n.id) ? "on" : ""}${locked?.id === n.id ? " sel" : ""}`}
                    style={{ ["--hue" as string]: rings[n.ring].hue }}
                    onClick={() => bringToTop(n.id)}
                  >
                    <span className="g">{n.glyph}</span>
                    {n.name}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="astro-panel" ref={panelRef}>
        <form className="astro-find" onSubmit={findSubmit} role="search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a skill: React, Stripe, C…"
            aria-label="Find a skill"
            autoComplete="off"
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            onBlur={() => window.setTimeout(() => setQuery(""), 200)}
          />
          {matches.length > 0 && (
            <ul className="astro-matches">
              {matches.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      bringToTop(n.id);
                      setQuery("");
                    }}
                  >
                    <span className="dot" style={{ background: rings[n.ring].hue }} />
                    {n.name}
                    <small>{rings[n.ring].tag}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>
        <div className="astro-inspect" aria-live="polite" hidden={view === "scroll"}>
          {activeNode ? (
            <>
              <p className="astro-kicker" style={{ color: rings[activeNode.ring].hue }}>
                {rings[activeNode.ring].name}
              </p>
              <h3>{activeNode.name}</h3>
              {activeNode.uses.length ? (
                <>
                  {activeNode.note && <p>{activeNode.note}</p>}
                  <p className="astro-sub">Forged in</p>
                  <ul className="astro-chips">
                    {activeNode.uses.map((u) => (
                      <li key={u}>
                        <button type="button" onClick={() => (setHover(null), pick({ kind: "seal", id: u }))}>
                          <span className="mono">{seals.find((s) => s.id === u)?.mono}</span>
                          {sealName.get(u)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>Kept in the hoard: part of my toolkit, waiting for its first shipped project here.</p>
              )}
            </>
          ) : activeSeal ? (
            <>
              <p className="astro-kicker">Seal &middot; project</p>
              <h3>{activeSeal.name}</h3>
              <p>{activeSeal.line}.</p>
              <p className="astro-sub">Fire runs to {litSkills.size} runes</p>
              <ul className="astro-chips">
                {nodes
                  .filter((n) => litSkills.has(n.id))
                  .map((n) => (
                    <li key={n.id}>
                      <button type="button" onClick={() => (setHover(null), pick({ kind: "skill", id: n.id }))} style={{ borderColor: `${rings[n.ring].hue}55` }}>
                        <span className="dot" style={{ background: rings[n.ring].hue }} />
                        {n.name}
                      </button>
                    </li>
                  ))}
              </ul>
              <a className="astro-link" href={activeSeal.href}>
                {activeSeal.href === "#top" ? "You're looking at it" : "Read about it ↑"}
              </a>
            </>
          ) : complete ? (
            <>
              <p className="astro-kicker">All {TOTAL} runes awake</p>
              <h3>The hoard is yours</h3>
              <p>You&rsquo;ve seen everything I build with. If any of it is what your team needs, the dragon and I are both available.</p>
              <a className="astro-link" href="#contact">
                Start a conversation &darr;
              </a>
            </>
          ) : (
            <>
              <p className="astro-kicker">The runes are sleeping</p>
              <h3>Wake them</h3>
              <p>
                Hover or tap a rune to wake it and see where it was used. Tap a seal to send fire through every skill
                that project was built with. Flick a ring to spin it, search for a skill above, or tap the dragon&rsquo;s
                eye and it will show you one.
              </p>
            </>
          )}
        </div>

        <div className={`astro-progress${complete ? " done" : ""}`}>
          <div className="astro-progress-top">
            <span>Runes awakened</span>
            <strong>
              {awake.size}
              <small> / {TOTAL}</small>
            </strong>
          </div>
          <div className="astro-pips" aria-hidden="true">
            {nodes.map((n) => (
              <i key={n.id} className={awake.has(n.id) ? "on" : ""} style={{ color: rings[n.ring].hue }} />
            ))}
          </div>
          <button type="button" className="astro-wake" onClick={complete ? sleepAll : wakeAll}>
            {complete ? "Let them sleep" : awake.size ? "Wake the rest" : "Wake them all"}
          </button>
        </div>

        <div className="astro-legend" role="group" aria-label="Show or hide rings">
          {rings.map((r, i) => (
            <button key={r.name} type="button" aria-pressed={!hidden.includes(i)} onClick={() => toggleRing(i)} style={{ color: r.hue }}>
              <span className="dot" />
              <span className="txt">{r.tag}</span>
              <span className="count">
                {ringAwake(i)}/{r.skills.length}
              </span>
            </button>
          ))}
        </div>

        <div className="astro-actions">
          {view === "astro" && (
            <>
              <button type="button" onClick={() => setStill((v) => !v)} aria-pressed={still}>
                {still ? "Wake rings" : "Still rings"}
              </button>
              <button type="button" onClick={realign}>
                Realign
              </button>
              <button type="button" onClick={toggleSound} aria-pressed={soundOn} className="astro-sound">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
                  {soundOn ? <path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" /> : <path d="M16 9.5l5 5M21 9.5l-5 5" />}
                </svg>
                Sound
              </button>
            </>
          )}
          <button type="button" onClick={() => setView((v) => (v === "astro" ? "scroll" : "astro"))}>
            {view === "astro" ? "Scroll view" : "Back to the astrolabe"}
          </button>
        </div>
      </div>

      {/* the same content as plain text: the scroll view, and what search engines and screen readers read */}
      <div className={view === "scroll" ? "astro-scroll" : "sr-only"}>
        {rings.map((r, i) => (
          <section key={r.name} className={hidden.includes(i) && view === "scroll" ? "gone" : ""} style={{ ["--hue" as string]: r.hue }}>
            <h3>{r.name}</h3>
            <ul>
              {r.skills.map((s) => (
                <li key={s.name}>
                  <span>{s.name}</span>
                  <span className="where">{s.uses.length ? s.uses.map((u) => sealName.get(u)).join(" · ") : "In the toolkit"}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
