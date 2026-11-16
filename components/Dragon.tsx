"use client";

import { useEffect, useRef, useState } from "react";
import { dragonBus } from "./dragonBus";
import { sound } from "./astroSound";
import "./dragon.css";

// my two dragons and the world they fly over

import type { P, Spark, Wall, Phase, GameKind, Lantern } from "./dragon/types";
import { Creature, inRect, type Box } from "./dragon/creature";
import { makeParts } from "./dragon/parts";
import { GREEN, RED } from "./dragon/palette";
import { World, type Sky } from "./dragon/world";
import { Avoid, Duel, Wander, fireMeets, homeward, DUEL_LEN } from "./dragon/brains";
import { makeGame, roman, clock, trialPlan, fitCap, clearPoints, newState, medal, nextMedal, BONUS } from "./dragon/game";

// move a dragon onto another canvas (Dravoxus uses the lair canvas while guarding the hero)
const drawOn = (c: Creature, g: CanvasRenderingContext2D) => {
  const x = c as unknown as { ctx: CanvasRenderingContext2D; parts: ReturnType<typeof makeParts> };
  if (x.ctx === g) return;
  x.ctx = g;
  x.parts = makeParts(g);
};

type Mode = "roam" | "follow" | "lair";
const MODE = "dragon-mode";
const OLD_LAIR = "dragon-lair";
const BEST = "dragon-best";
const BEST_SCORE = "dragon-best-score";
const LEVELS = "dragon-trial-levels";
const SIEGE_BEST = "dragon-siege-best";
// Trial record: times cleared, most sand left (s), fastest clear (s)
type LevelRec = { clears: number; left: number; fast: number };
// what the result card shows
type Result = {
  kind: GameKind; won: boolean; base: number; bonus: number; spare: number; done: number; total: number; score: number;
  burned: number; time: number; plain: number; great: number; jade: number; escaped: number; best: boolean;
};
const NO_RESULT: Result = { kind: "trial", won: false, base: 0, bonus: 0, spare: 0, done: 0, total: 0, score: 0, burned: 0, time: 0, plain: 0, great: 0, jade: 0, escaped: 0, best: false };
const readJson = <T,>(key: string, fallback: T): T => {
  try { const v = localStorage.getItem(key); return v ? { ...fallback, ...JSON.parse(v) } : fallback; } catch { return fallback; }
};
const writeJson = (key: string, v: unknown) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} };
const IGNORE = "header.top, a, button, input, textarea, select, label, [role=radio], [role=tab], .board, .palette, .dragon-ui, .game-card";

// rail icons: cave (lair), dragon eye (summon), open sky (release), crossed blades (trials), two flames (duel)
const LairIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 21V12a9 9 0 0 1 18 0v9" />
    <path d="M7 21v-6a5 5 0 0 1 10 0v6" />
    <path d="M12 5v7m-2.5-2.5L12 12l2.5-2.5" />
  </svg>
);
const EyeIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
    <path d="M12 7.5c1.6 1.2 1.6 7.8 0 9-1.6-1.2-1.6-7.8 0-9z" fill="currentColor" />
  </svg>
);
const SkyIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 15c3-5 6-7 9-7 3 0 5 2 7 5" />
    <path d="m16 9 4 4-5 1" />
    <path d="M3 20h18" />
  </svg>
);
const BladesIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
    <path d="m13 19 6-6M16 16l4 4M19 21l2-2" />
    <path d="M14.5 6.5 18 3h3v3l-3.5 3.5" />
    <path d="m5 14 4 4M7 17l-3 3M3 19l2 2" />
  </svg>
);
const DuelIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 20c-3.5 0-5.5-2.6-5.5-5.6 0-3.4 3-5.4 3.6-8.9 2 1.6 3.4 3.8 3.4 6.2.8-.6 1.3-1.6 1.4-2.7" />
    <path d="M15 20c3.5 0 5.5-2.6 5.5-5.6 0-3.4-3-5.4-3.6-8.9-2 1.6-3.4 3.8-3.4 6.2-.8-.6-1.3-1.6-1.4-2.7" />
    <path d="M12 14v7" />
  </svg>
);

type DuelHud = { left: number } | null;
type Side = "left" | "right" | "top" | "bottom";

export default function Dragon() {
  const ref = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<HTMLCanvasElement>(null);
  const townRef = useRef<HTMLCanvasElement>(null);
  const lairRef = useRef<HTMLCanvasElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("roam");
  const [reduce, setReduce] = useState(false);
  const [phase, setPhase] = useState<Phase>("off");
  const [level, setLevel] = useState(1);
  const [best, setBest] = useState(0);
  const [result, setResult] = useState<Result>(NO_RESULT);
  const [game, setGame] = useState<GameKind>("trial");
  const [paused, setPaused] = useState(false);
  const [bestScore, setBestScore] = useState(0);
  const [levelRecs, setLevelRecs] = useState<Record<string, LevelRec>>({});
  const [siegeBest, setSiegeBest] = useState({ score: 0, time: 0 });
  const [run, setRun] = useState({ score: 0, burned: 0 });
  const [hint, setHint] = useState(true);
  const [duelReady, setDuelReady] = useState(false);
  const [duelHud, setDuelHud] = useState<DuelHud>(null);
  const [duelFx, setDuelFx] = useState<Side | null>(null);
  const modeRef = useRef<Mode>("roam");
  const phaseRef = useRef<Phase>("off");
  const levelRef = useRef(1);
  const cmdRef = useRef<"build" | "buildNew" | "siege" | "stage" | "clear" | null>(null);
  const gameRef = useRef<GameKind>("trial");
  const pausedRef = useRef(false);
  const newRunRef = useRef(false);
  const duelCmd = useRef(false);
  const duelReadyRef = useRef(false);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    try {
      const m = localStorage.getItem(MODE);
      if (m === "roam" || m === "follow" || m === "lair") setMode(m);
      else if (localStorage.getItem(OLD_LAIR) === "1") setMode("lair");
      setBest(Number(localStorage.getItem(BEST)) || 0);
      setBestScore(Number(localStorage.getItem(BEST_SCORE)) || 0);
    } catch {}
    setLevelRecs(readJson<Record<string, LevelRec>>(LEVELS, {}));
    setSiegeBest(readJson(SIEGE_BEST, { score: 0, time: 0 }));
  }, []);

  const choose = (m: Mode) => {
    setMode(m);
    try {
      localStorage.setItem(MODE, m);
    } catch {}
  };

  const go = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };
  const pause = (on: boolean) => {
    pausedRef.current = on;
    setPaused(on);
  };
  // game menu (from the Trials button or back from a game)
  const openMenu = (from?: GameKind) => {
    if (from === undefined) { gameRef.current = "trial"; setGame("trial"); }
    cmdRef.current = "clear";
    pause(false);
    go("menu");
  };
  const pick = (g: GameKind) => {
    gameRef.current = g;
    setGame(g);
    // Balerian flies in for the siege
    cmdRef.current = g === "siege" ? "stage" : "clear";
    go("intro");
  };
  // Trial stats card before it starts
  const brief = (n: number, fresh = false) => {
    if (fresh) newRunRef.current = true;
    levelRef.current = n;
    setLevel(n);
    pause(false);
    go("brief");
  };
  const startTrial = () => {
    cmdRef.current = newRunRef.current ? "buildNew" : "build";
    newRunRef.current = false;
    pause(false);
    go("play");
  };
  const startSiege = () => {
    cmdRef.current = "siege";
    pause(false);
    go("play");
  };
  const quit = () => {
    cmdRef.current = "clear";
    pause(false);
    go("off");
  };

  // breathe fire hint next to the rail for a few seconds
  useEffect(() => {
    const id = window.setTimeout(() => setHint(false), 7000);
    return () => clearTimeout(id);
  }, []);

  // page stays still while a game is open
  useEffect(() => {
    if (phase === "off") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if (phaseRef.current === "play" && (k === "Escape" || k === "p" || k === "P")) { e.preventDefault(); pause(!pausedRef.current); return; }
      if (k === "Escape") quit();
    };
    const onHide = () => { if (document.hidden && phaseRef.current === "play") pause(true); };
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === "off"]);

  useEffect(() => {
    if (reduce) return;
    const canvas = ref.current, scene = sceneRef.current, town = townRef.current, lc = lairRef.current;
    if (!canvas || !scene || !town || !lc) return;
    const ctx = canvas.getContext("2d");
    const sctx = scene.getContext("2d");
    const lctx = lc.getContext("2d");
    if (!ctx || !sctx || !lctx) return;

    let w = 0, h = 0, dpr = 1, s = 1;
    let raf = 0, t = 0;
    const env = { get s() { return s; }, get dpr() { return dpr; }, get t() { return t; } };
    const drav = new Creature(ctx, GREEN, env, 0, 0);
    const bal = new Creature(ctx, RED, env, 1, 2.1);
    const D: [Creature, Creature] = [drav, bal];
    const world = new World();
    const duel = new Duel();
    const gw = new Wander(), rw = new Wander();
    const avG = new Avoid(), avR = new Avoid();
    let pointer: P | null = null;
    let lastMove = -99;
    let holding = false;
    // once it reaches a resting cursor it glides on instead of circling, until the cursor moves
    let settled = false;
    let settledAt: P = { x: 0, y: 0 };
    let settledT = 0;
    let tap: { x: number; y: number; t: number; id: number } | null = null;
    let meetAt = 0;
    let duelCool = 0;
    let lastLeft = -1;
    let slowUntil = 0;
    let lastFlare = 0, lastShake = 0, meets = 0;
    let balGuarding = false;
    // where two fire streams meet: a glowing core that grows while they keep meeting
    const core = { x: 0, y: 0, p: 0 };
    const dbgTg: P[] = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
    const landed = [0, 0];
    let header: HTMLElement | null = null;
    let skills: HTMLElement | null = null;
    // read page measurements once per frame since each read can force a layout
    let stamp = 0, hbAt = -1, hbVal = 0, rtAt = -1, rtVal = 0;
    const headerBottom = () => {
      if (hbAt === stamp) return hbVal;
      if (!header || !header.isConnected) header = document.querySelector("header.top");
      hbAt = stamp;
      return (hbVal = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0);
    };
    // Balerian's area starts at the top of the skills section and goes to the bottom of the page
    const regionTop = () => {
      if (rtAt === stamp) return rtVal;
      if (!skills || !skills.isConnected) skills = document.getElementById("skills");
      rtAt = stamp;
      return (rtVal = skills ? skills.getBoundingClientRect().top : h * 0.5);
    };
    const sparks: Spark[] = [];
    const glow = (stops: [number, string][]) => {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d")!, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      for (const [o, col] of stops) gr.addColorStop(o, col);
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
      return c;
    };
    const glowHot = glow([[0, "rgba(255, 250, 225, 0.95)"], [0.5, "rgba(255, 200, 90, 0.7)"], [1, "rgba(120, 20, 0, 0)"]]);
    const glowMid = glow([[0, "rgba(255, 190, 70, 0.9)"], [0.5, "rgba(255, 110, 20, 0.65)"], [1, "rgba(120, 20, 0, 0)"]]);
    const glowCool = glow([[0, "rgba(230, 80, 15, 0.8)"], [0.5, "rgba(150, 30, 5, 0.5)"], [1, "rgba(120, 20, 0, 0)"]]);
    // test hook: with ?dragon-debug in the URL every step gets recorded for the motion tests
    const prof = { step: 0, draw: 0, n: 0 };
    const trace: Record<string, number>[] | null = location.search.includes("dragon-debug") ? [] : null;
    let lastScroll = window.scrollY;
    let wasLair = modeRef.current === "lair";
    let wasFollow = modeRef.current === "follow";
    let recallUntil = 0, recallEnd = 0;
    let dravChasing = false;
    const chasingNow = () => dravChasing;
    // Trial: once it reaches a pointer that stopped, it glides on slowly (gameGlide) until the pointer moves
    let gameSettled = false, gameAt: P = { x: 0, y: 0 }, gameGlide: P = { x: 0, y: 0 };
    const G = newState();
    // the dragon you control: Dravoxus in the trial, Balerian in the siege
    const player = () => (gameRef.current === "siege" ? bal : drav);
    const pw = new Wander();
    let wasInGame = false;

    const gameOn = () => phaseRef.current !== "off";
    const lair = () => modeRef.current === "lair" && !duel.on;

    // where Dravoxus can fly: the whole viewport in a game, just the hero when banished
    const view = (): Box => ({ x0: 0, y0: headerBottom() + 12, x1: w, y1: h });
    const bounds = (): Box => {
      if (gameOn()) return { x0: 0, y0: 0, x1: w, y1: h };
      if (lair()) {
        const hero = document.querySelector(".hero");
        if (hero) {
          const b = hero.getBoundingClientRect();
          return { x0: b.left, y0: b.top, x1: b.right, y1: b.bottom };
        }
      }
      return view();
    };
    const inside = (p: P) => {
      const b = bounds();
      return p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1;
    };
    // where Balerian flies: the visible part of its area, inside the content column (away from the margin walls)
    const balBox = (): Box => {
      const v = view(), top = regionTop();
      const x0 = world.wide ? world.margin + 10 : v.x0, x1 = world.wide ? w - world.margin - 10 : v.x1;
      // only a thin strip of its area is showing, so wait out of sight
      if (top > h - Math.max(300 * s, (h - v.y0) * 0.45)) return { x0, y0: h + 150 * s, x1, y1: h + 360 * s };
      return { x0, y0: Math.max(v.y0, top + 30 * s), x1, y1: h - 20 * s };
    };
    const sceneWalls = () => (world.live ? world.walls : []);
    const edgeWalls = (): Wall[] => [
      { x: -1000, y: -1000, w: w + 2000, h: 1000 + 4, seed: 0, ghost: true },
      { x: -1000, y: h - 4, w: w + 2000, h: 1000, seed: 0, ghost: true },
      { x: -1000, y: -1000, w: 1000 + 4, h: h + 2000, seed: 0, ghost: true },
      { x: w - 4, y: -1000, w: 1000, h: h + 2000, seed: 0, ghost: true },
    ];
    const duelEdges = (): Wall[] => {
      const top = headerBottom() + 6, e = 6;
      return [
        { x: -1000, y: -1000, w: w + 2000, h: 1000 + top, seed: 0, ghost: true },
        { x: -1000, y: h - e, w: w + 2000, h: 1000, seed: 0, ghost: true },
        { x: -1000, y: -1000, w: 1000 + e, h: h + 2000, seed: 0, ghost: true },
        { x: w - e, y: -1000, w: 1000, h: h + 2000, seed: 0, ghost: true },
      ];
    };
    const wallsFor = (k: 0 | 1): Wall[] => {
      if (gameOn()) return k === 0 ? [...G.walls, ...edgeWalls()] : [];
      const base = k === 0 && lair() ? [] : sceneWalls();
      // Balerian never goes above its area, the top of skills is a wall for it
      if (k === 1 && !duel.on) {
        const top = regionTop();
        return [...base, { x: -1e5, y: -1e5, w: 2e5, h: 1e5 + top + 4 * s, seed: 0, ghost: true }];
      }
      // screen edges are soft walls during a duel so neither swings out of frame
      return duel.on ? [...base, ...duel.wallsFor(k, D[k]), ...duelEdges()] : base;
    };
    // wander targets stay away from the other dragon's head and body
    const badGreen = (p: P) => {
      const g = dragonBus.guard;
      // while guarding the skill wheel, the wheel and its rim are Balerian's turf
      if (balGuarding && g && Math.hypot(p.x - g.cx, p.y - g.cy) < g.r + 170 * s) return true;
      if (crosses(drav, bal, p) || Math.hypot(p.x - rw.at.x, p.y - rw.at.y) < 300 * s) return true;
      return bal.alpha > 0.5 && (Math.hypot(p.x - bal.seg[0].x, p.y - bal.seg[0].y) < 240 * s || bal.bodyGap(p).gap < 150 * s);
    };
    const badRed = (p: P) => crosses(bal, drav, p) || Math.hypot(p.x - gw.at.x, p.y - gw.at.y) < 300 * s || Math.hypot(p.x - drav.seg[0].x, p.y - drav.seg[0].y) < 260 * s || drav.bodyGap(p).gap < 150 * s;
    // never pick a spot it could only reach by flying across the other dragon (that's how they got tangled)
    const crosses = (me: Creature, o: Creature, p: P) => {
      if (o.alpha < 0.5) return false;
      const hd = me.seg[0];
      for (let u = 0.15; u < 1; u += 0.14) if (o.bodyGap({ x: hd.x + (p.x - hd.x) * u, y: hd.y + (p.y - hd.y) * u }).gap < 70 * s) return true;
      return false;
    };
    // both on screen: Balerian takes lanterns on the left half, Dravoxus the right
    const together = () => !duel.on && !gameOn() && !lair() && bal.alpha > 0.5 && onScreen(drav) && onScreen(bal);
    const lanternHalf = (k: 0 | 1, b: Box): Box => !together() ? b : k === 0 ? { ...b, x0: Math.max(b.x0, w / 2) } : { ...b, x1: Math.min(b.x1, w / 2) };
    let wasTogether = false;

    const railTop = () => {
      const r = railRef.current?.getBoundingClientRect();
      if (!r) return null;
      // the rail is centred, so the Duel button grows it by half its height at the top
      const extra = duelReadyRef.current ? 0 : r.height / (r.height > 260 ? 6 : 5);
      return new DOMRect(r.x, r.y - extra, r.width, r.height + extra * 2);
    };

    let laidW = 0, laidH = 0;
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      // pixel budget of about 3 million per full screen canvas
      const keep = w === laidW && Math.abs(h - laidH) <= 140 && canvas.width > 0 && canvas.height >= Math.round(h * dpr);
      if (!keep) dpr = Math.min(window.devicePixelRatio || 1, 2, Math.max(1, Math.sqrt(3e6 / Math.max(1, w * h))));
      const was = s;
      s = w < 700 ? 0.62 : w < 1100 ? 0.85 : 1;
      if (drav.seg.length && was !== s) for (const c of D) c.rescale(s / was);
      if (!keep) {
        // extra room so the address bar can hide without a rebuild
        const ch = w === laidW ? Math.max(h, laidH) : h;
        for (const [cv, cx] of [[canvas, ctx], [scene, sctx]] as const) {
          cv.width = Math.round(w * dpr);
          cv.height = Math.round(ch * dpr);
          cv.style.width = `${w}px`;
          cv.style.height = `${ch}px`;
          cx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
      }
      if (!drav.seg.length) {
        drav.place(w * 0.78, h * 0.32, Math.PI);
        // Balerian starts below the screen and flies up when its area comes into view
        bal.place(w * 0.3, h + 260 * s, -Math.PI / 2 + 0.3);
      }
      // address bar showing or hiding only changes the height a bit, so keep the town and walls
      if (w !== laidW || Math.abs(h - laidH) > 140) {
        laidW = w; laidH = h;
        world.layout(w, h, s, dpr, headerBottom(), railTop(), town);
      } else world.h = h;
      document.documentElement.style.setProperty("--rule-top", `${Math.round(header?.offsetHeight ?? headerBottom())}px`);
      // redraw right away so the cleared canvas never shows empty for a frame
      stamp++;
      if (keep) return;
      sceneTick = 1;
      if (raf) draw(acc);
    };

    const game = makeGame({
      ctx, G, levelRef, phaseRef,
      get s() { return s; }, get w() { return w; }, get h() { return h; }, get t() { return t; }, get dpr() { return dpr; }, get seg() { return drav.seg; },
    });
    const { build, startSiege: siegeStart, stepSiege, burned, fuelStep } = game;
    // Trial cleared (points, records) or failed
    const finishTrial = (won: boolean) => {
      const L = levelRef.current;
      let base = 0, bonus = 0, best = false;
      if (won) {
        ({ base, bonus } = clearPoints(L, G.time, G.start));
        G.score += base + bonus;
        try {
          const b = Math.max(L, Number(localStorage.getItem(BEST)) || 0);
          localStorage.setItem(BEST, String(b));
          setBest(b);
          const bs = Number(localStorage.getItem(BEST_SCORE)) || 0;
          if (G.score > bs) { localStorage.setItem(BEST_SCORE, String(G.score)); setBestScore(G.score); best = true; }
        } catch {
          setBest((b) => Math.max(b, L));
        }
        const recs = readJson<Record<string, LevelRec>>(LEVELS, {});
        const r = recs[L] ?? { clears: 0, left: 0, fast: 0 };
        recs[L] = { clears: r.clears + 1, left: Math.max(r.left, Math.ceil(G.time)), fast: r.fast ? Math.min(r.fast, G.elapsed) : G.elapsed };
        writeJson(LEVELS, recs);
        setLevelRecs(recs);
      }
      setRun({ score: G.score, burned: G.burned });
      setResult({ ...NO_RESULT, kind: "trial", won, base, bonus, spare: Math.ceil(G.time), done: G.total - G.left, total: G.total, score: G.score, burned: G.burned, time: G.elapsed, best });
      go(won ? "won" : "lost");
    };
    // Siege lost: save the best score and longest time
    const finishSiege = () => {
      const prev = readJson(SIEGE_BEST, { score: 0, time: 0 });
      const best = G.score > prev.score;
      const rec = { score: Math.max(prev.score, G.score), time: Math.max(prev.time, G.elapsed) };
      writeJson(SIEGE_BEST, rec);
      setSiegeBest(rec);
      setResult({ ...NO_RESULT, kind: "siege", score: G.score, burned: G.burned, time: G.elapsed, plain: G.plain, great: G.great, jade: G.jade, escaped: G.escaped, best });
      go("lost");
    };
    // a lantern escaped in the siege: a jolt, and a final burst when health runs out
    const onHurt = (dmg: number) => {
      shake(dmg > 10);
      if (G.health <= 0) {
        const hd = bal.seg[0];
        burst(hd.x, hd.y, 40 * s, 90, 1.4);
        shake(true);
        sound.roar();
      }
    };

    // scrolling
    const followScroll = () => {
      const sy = window.scrollY, ds = sy - lastScroll;
      lastScroll = sy;
      if (!ds || gameOn()) return;
      const ride = (c: Creature, wd: Wander) => {
        c.shift(0, -ds);
        for (const p of sparks) if (p.own === c.id) { p.y -= ds; if (p.py !== undefined) p.py -= ds; }
        wd.at.y -= ds;
      };
      if (lair()) ride(drav, gw);
      // only carry Balerian as far as needed to stay in its area
      if (ds < 0 && !duel.on) {
        let top = Infinity;
        for (let i = 0; i < bal.seg.length; i += 4) top = Math.min(top, bal.seg[i].y);
        const need = Math.min(-ds, Math.max(0, regionTop() + 20 * s - top));
        if (need > 0) {
          bal.shift(0, need);
          for (const p of sparks) if (p.own === bal.id) { p.y += need; if (p.py !== undefined) p.py += need; }
          rw.at.y += need;
          // pushed into Dravoxus, so carry Dravoxus too so they never pass through each other
          if (!lair()) {
            let g = Infinity;
            for (let i = 0; i < drav.seg.length; i += 3) g = Math.min(g, bal.bodyGap(drav.seg[i]).gap - drav.rad(i));
            if (g < 12 * s) { drav.shift(0, need); gw.at.y += need; }
          }
        }
      }
    };

    const burst = (x: number, y: number, r: number, n = 34, speed = 1) => {
      for (let k = 0; k < n; k++) {
        const a = Math.random() * Math.PI * 2, v = (2 + Math.random() * 6) * s * speed;
        const life = 25 + Math.random() * 30;
        sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, r: (2 + Math.random() * 4) * s, smoke: false, fx: true });
      }
      world.rings.push({ x, y, r, age: 0 });
    };
    const burstSky = (o: Sky) => {
      burst(o.x, o.y, o.r, 26);
      world.sky.splice(world.sky.indexOf(o), 1);
    };
    const shake = (strong = false) => {
      canvas.classList.remove("quake", "quake-hard");
      void canvas.offsetWidth;
      canvas.classList.add(strong ? "quake-hard" : "quake");
    };

    // walls only turn solid when no dragon is in the way, so nothing gets trapped inside
    const settleWalls = () => {
      if (world.live || !world.walls.length) return;
      for (const c of D) {
        if (c.faceHits(c.seg[0].x, c.seg[0].y, c.dirAt(0), world.walls, 30 * s)) return;
        for (let i = 0; i < c.seg.length; i += 3) for (const wl of world.walls) if (inRect(c.seg[i].x, c.seg[i].y, wl, c.rad(i) + 30 * s)) return;
      }
      world.live = true;
    };

    // Dravoxus (green): roams anywhere, follows when summoned, guards the hero when banished
    const stepDrav = (inGame: boolean) => {
      const c = drav;
      // in games: you fly it in the trial, in the siege it fades out until the game ends
      c.alpha = Math.max(0, Math.min(1, c.alpha + (inGame && player() !== drav ? -0.06 : 0.03)));
      if (inGame) {
        if (player() === drav) stepPlayer(c);
        return;
      }
      if (lair() !== wasLair) {
        wasLair = lair();
        c.fireAt = null;
        gw.pick(t, bounds(), wallsFor(0), s, badGreen, c);
      }
      const follow = modeRef.current === "follow";
      // summoned: comes back to you within a few seconds, fast when far and slowing as it arrives
      if (follow !== wasFollow) {
        wasFollow = follow;
        if (follow && !inGame) { recallUntil = t + 3.4; recallEnd = t + 8; settled = false; }
      }
      // way off screen (released from the lair or summoned from far away): move it to just past the nearest edge
      if (!inGame && !lair() && !duel.on) bringNear(c);
      // in the lair while the lair is scrolled away: once it's fully out of sight it's just there
      if (!inGame && lair()) intoLair(c);
      // (keeps coming until it actually arrives, even if something slowed it down)
      const recall = !inGame && !duel.on && follow && t < recallEnd;
      const chasing = !duel.on && pointer && (inGame || (follow && !settled && (recall || t - lastMove < 3.5) && inside(pointer)));
      dravChasing = !!chasing;
      if (duel.on) {
        // duel moves are handled by the duel itself
        duel.drive(0, t, D, s, duelFx);
        c.eyes(bal.seg[0], t);
        c.fire(sparks, t, c.range(), 0.45);
        return;
      }
      let top = 2.6 * s, tg: P, steer = { bias: 0, slow: 1 };
      {
        if (!chasing && gw.due(t, c, s)) gw.pick(t, bounds(), wallsFor(0), s, badGreen, c);
        if (!inGame && !lair() && !chasing) gw.hunt(t, c, world.sky, s, bal, lanternHalf(0, bounds()));
        if (!inGame) {
          steer = avG.steer(c, bal, s, t, together() ? 1.45 : 1);
        }
        if (avG.close > (together() ? 0.6 : 1.2) && !chasing) { avG.close = 0; gw.pick(t, bounds(), wallsFor(0), s, badGreen, c); }
        const home = !inGame && !lair() && !recall ? homeward(c, bounds(), s, 0, sceneWalls()) : null;
        const v = view(), back = recall ? (pointer && inside(pointer) ? pointer : { x: (v.x0 + v.x1) / 2, y: (v.y0 + v.y1) / 2 }) : null;
        tg = home ?? c.holdFire ?? c.fireAt ?? back ?? (inGame && gameSettled ? gameGlide : chasing ? pointer! : gw.at);
        const dist = Math.hypot(tg.x - c.seg[0].x, tg.y - c.seg[0].y);
        top = (inGame ? (gameSettled ? 2.6 : 5.2) : c.holdFire ? 1.6 : chasing || c.fireAt || dist > 450 * s ? 4.4 : 2.6) * s;
        // banished while away from the lair, so head back quickly
        if (!inGame && lair() && !inside(c.seg[0]) && !c.fireAt) top = Math.max(top, 7 * s);
        if (recall) {
          // fast enough to get back with time to spare, never slower than its normal chase
          const left = Math.max(0.6, recallUntil - t - 0.7);
          top = Math.max(4.4 * s, Math.min(11 * s, (dist / (left * 60)) * 1.7));
          if (dist < 170 * s) recallUntil = recallEnd = 0;
        }
        // reached the resting cursor, glide past instead of looping around it
        if (chasing && !inGame && !recall && dist < 120 * s) settleOff();
      }
      // keeps an eye on the rival when they're close (always in a duel) and turns its head a bit to look
      dbgTg[0] = tg;
      // in a duel it turns its head to face the rival
      c.glance = !inGame && duel.on ? bal.seg[0] : null;
      c.eyes(!inGame && (duel.on || near(c, bal, 460)) ? bal.seg[0] : pointer && !inGame && t - lastMove < 12 && inside(pointer) ? pointer : tg, t);
      // in the trial it turns sharper while chasing your pointer, and drifts like normal when resting
      const drift = inGame && gameSettled && !c.holdFire && !c.fireAt, scr = { x0: 0, y0: 0, x1: w, y1: h };
      c.move(tg, { top, base: inGame && !drift ? 0.1 : 0.065, walls: wallsFor(0), others: inGame ? [] : [bal], steer: steer.bias, slow: steer.slow, area: drift ? scr : inGame ? undefined : bounds(), edge: drift ? nearEdge(c, scr) : !inGame && nearEdge(c, bounds()) });
      // circling or pinned: fly out the most open way and stop chasing a resting cursor
      if (!duel.on && (c.looping || c.stuck === 49)) {
        const b = bounds();
        gw.set(c.escape(wallsFor(0), { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 }), t, 2.5);
        if (chasing && !inGame) { settled = true; settledT = t; settledAt = { ...pointer! }; }
      }
      c.fire(sparks, t, inGame ? Infinity : c.range(), duel.on ? 0.42 : 0.4);
    };
    // the dragon you fly in a game (both handle the same) It chases your pointer
    const stepPlayer = (c: Creature) => {
      const scr = { x0: 0, y0: 0, x1: w, y1: h }, walls = [...G.walls, ...edgeWalls()];
      const playing = phaseRef.current === "play";
      if (pointer) {
        if (holding && playing && !G.overheat) {
          // aim first: fire only starts once the head is on the spot
          const at = { x: pointer.x, y: pointer.y }, hd0 = c.seg[0];
          const err = Math.abs(Math.atan2(Math.sin(Math.atan2(at.y - hd0.y, at.x - hd0.x) - c.dirAt(0)), Math.cos(Math.atan2(at.y - hd0.y, at.x - hd0.x) - c.dirAt(0))));
          if (c.breath > 0 && c.holdFire) {
            c.holdFire.x = at.x; c.holdFire.y = at.y;
            if (err < 0.75) c.breath = Math.max(c.breath, 0.2);
          } else { c.fireAt = at; c.fireUntil = t + 1; c.aimFn = null; }
          gameSettled = false;
        } else if (gameSettled && Math.hypot(pointer.x - gameAt.x, pointer.y - gameAt.y) > 45 * s) gameSettled = false;
        else if (!gameSettled && Math.hypot(pointer.x - c.seg[0].x, pointer.y - c.seg[0].y) < 130 * s) {
          gameSettled = true;
          gameAt = { x: pointer.x, y: pointer.y };
          pw.pick(t, scr, G.walls, s, () => false, c);
        }
        // breathing at something way off to the side or behind
        const q = c.holdFire ?? c.fireAt ?? (gameSettled ? null : pointer);
        if (q) {
          const hd0 = c.seg[0], a = Math.atan2(q.y - hd0.y, q.x - hd0.x), off = Math.abs(Math.atan2(Math.sin(a - c.course), Math.cos(a - c.course)));
          const near = Math.hypot(q.x - hd0.x, q.y - hd0.y) < 320 * s;
          if (off > (c.holdFire || c.fireAt ? 0.8 : 1.2) && (near || c.holdFire || c.fireAt)) { c.speed = Math.max(1.1 * s, c.speed * 0.92); c.turnBoost = Math.max(c.turnBoost, 0.7); }
        }
      }
      // resting or no pointer: slow lazy drift forward
      if ((gameSettled || !pointer) && pw.due(t, c, s)) pw.pick(t, scr, G.walls, s, () => false, c);
      gameGlide = pw.at;
      const tg = c.holdFire ?? c.fireAt ?? (gameSettled || !pointer ? gameGlide : pointer!);
      c.glance = null;
      c.eyes(pointer ?? tg, t);
      // sharp turns while chasing, normal drift while resting
      const drift = (gameSettled || !pointer) && !c.holdFire && !c.fireAt;
      c.move(tg, { top: (drift ? 2.6 : 5.2) * s, base: drift ? 0.065 : 0.1, walls, others: [], area: drift ? scr : undefined, edge: drift && nearEdge(c, scr) });
      if (c.looping || c.stuck === 49) pw.set(c.escape(walls, { x: w / 2, y: h / 2 }), t, 2.5);
      c.fire(sparks, t, Infinity, 0.4);
    };
    // whole body (and shadow) is off screen
    const offView = (c: Creature, m = 110 * s) => {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let i = 0; i < c.seg.length; i += 3) { const p = c.seg[i]; if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; }
      return x1 < -m || x0 > w + m || y1 < -m || y0 > h + m;
    };
    // put a dragon at (x, y) facing a, but only somewhere clear of the other one
    const placeClear = (c: Creature, x: number, y: number, a: number, along: P) => {
      const o = c === drav ? bal : drav, save = { seg: c.seg.map((p) => ({ ...p })), trail: c.trail.map((p) => ({ ...p })), course: c.course, face: c.face, heading: c.heading, speed: c.speed };
      for (const k of [0, 1, -1, 2, -2, 3, -3, 4, -4]) {
        c.place(x + along.x * k * 160 * s, y + along.y * k * 160 * s, a);
        let g = Infinity;
        if (o.alpha > 0.3) for (let i = 0; i < c.seg.length; i += 3) g = Math.min(g, o.bodyGap(c.seg[i]).gap - c.rad(i));
        if (g > 45 * s) return true;
      }
      c.seg = save.seg; c.prevSeg = save.seg.map((p) => ({ ...p })); c.trail = save.trail;
      c.course = save.course; c.face = save.face; c.heading = save.heading; c.speed = save.speed;
      return false;
    };
    const resetAim = (c: Creature) => { c.fireAt = null; c.holdFire = null; c.aimFn = null; c.prey = null; c.breath = 0; };
    const bringNear = (c: Creature) => {
      const hd = c.seg[0], v = view();
      const ox = hd.x < 0 ? -hd.x : hd.x > w ? hd.x - w : 0, oy = hd.y < 0 ? -hd.y : hd.y > h ? hd.y - h : 0;
      if (Math.max(ox, oy) < 380 * s || !offView(c)) return;
      const g = pointer && inside(pointer) ? pointer : { x: (v.x0 + v.x1) / 2, y: (v.y0 + v.y1) / 2 }, out = 170 * s;
      let x: number, y: number, n: number;
      if (oy >= ox) { x = Math.max(120 * s, Math.min(w - 120 * s, hd.x)); y = hd.y < 0 ? -out : h + out; n = hd.y < 0 ? Math.PI / 2 : -Math.PI / 2; }
      else { y = Math.max(v.y0 + 120 * s, Math.min(h - 120 * s, hd.y)); x = hd.x < 0 ? -out : w + out; n = hd.x < 0 ? 0 : Math.PI; }
      // facing in, turned partly toward where it's going
      const a = n + Math.max(-0.6, Math.min(0.6, wrapA(Math.atan2(g.y - y, g.x - x) - n)));
      if (!placeClear(c, x, y, a, oy >= ox ? { x: 1, y: 0 } : { x: 0, y: 1 })) return;
      c.speed = 4 * s;
      resetAim(c);
    };
    const intoLair = (c: Creature) => {
      const b = bounds(), hd = c.seg[0];
      if (!(b.y1 < -160 * s || b.y0 > h + 160 * s) || !offView(c)) return;
      if (hd.x > b.x0 && hd.x < b.x1 && hd.y > b.y0 && hd.y < b.y1) return;
      const right = Math.random() < 0.5;
      if (!placeClear(c, b.x0 + (b.x1 - b.x0) * (right ? 0.3 : 0.7), b.y0 + (b.y1 - b.y0) * (0.35 + Math.random() * 0.3), right ? 0 : Math.PI, { x: 0, y: 1 })) return;
      c.speed = 2 * s;
      resetAim(c);
      gw.pick(t, b, [], s, badGreen, c);
    };
    const wrapA = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
    const nearEdge = (c: Creature, b: Box) => { const p = c.seg[0], m = 220 * s; return p.x < b.x0 + m || p.x > b.x1 - m || p.y < b.y0 + m || p.y > b.y1 - m; };
    const near = (a: Creature, b: Creature, d: number) => b.alpha > 0.6 && Math.hypot(a.seg[0].x - b.seg[0].x, a.seg[0].y - b.seg[0].y) < d * s;
    const settleOff = () => {
      const c = drav, hd = c.seg[0];
      settled = true;
      settledT = t;
      settledAt = { x: pointer!.x, y: pointer!.y };
      const b = bounds(), m = 80 * s;
      const a = c.heading + (Math.random() - 0.5) * 0.8, L = 380 * s;
      const gx = Math.max(b.x0 + m, Math.min(b.x1 - m, hd.x + Math.cos(a) * L));
      const gy = Math.max(b.y0 + m, Math.min(b.y1 - m, hd.y + Math.sin(a) * L));
      if (Math.hypot(gx - hd.x, gy - hd.y) > 180 * s) gw.set({ x: gx, y: gy }, t, 4);
      else gw.pick(t, bounds(), wallsFor(0), s, badGreen, c);
    };

    // Balerian (red): stays in the skills section and below, guards the skill wheel
    const stepBal = (inGame: boolean) => {
      const c = bal;
      // leaves during the trial (comes back after), in the siege it's the one you fly
      c.alpha = Math.max(0, Math.min(1, c.alpha + (inGame && player() !== bal ? -0.06 : 0.03)));
      if (inGame) {
        if (player() === bal) stepPlayer(c);
        return;
      }
      const box = balBox();
      // the skill wheel asks it to guard the rim and breathe at a rune when one is picked
      const g = dragonBus.guard;
      const guard = !duel.on && !inGame && g && g.cy > regionTop() ? g : null;
      if (dragonBus.breathe) {
        if (guard) c.breatheAt(dragonBus.breathe, t);
        dragonBus.breathe = null;
      }
      balGuarding = !!guard;
      // way below the screen (left behind by a big scroll): move it to just below the edge, still out of sight
      if (!duel.on && !inGame && offView(c) && c.seg[0].y > h + 380 * s) {
        const tx = Math.max(box.x0 + 120 * s, Math.min(box.x1 - 120 * s, c.seg[0].x));
        const ty = box.y0 > h ? h + 220 * s : h + 170 * s;
        if (Math.hypot(c.seg[0].x - tx, c.seg[0].y - ty) > 300 * s && placeClear(c, tx, ty, -Math.PI / 2 + (Math.random() - 0.5) * 0.6, { x: 1, y: 0 })) {
          c.speed = 3 * s;
          resetAim(c);
          rw.pick(t, box, wallsFor(1), s, badRed, c);
        }
      }
      if (duel.on) {
        duel.drive(1, t, D, s, duelFx);
        c.eyes(drav.seg[0], t);
        c.fire(sparks, t, c.range(), 0.45);
        return;
      }
      let top = 2.4 * s, tg: P, steer = { bias: 0, slow: 1 };
      {
        let aim: P | null = null;
        if (guard) {
          // circle the rim
          const hd = c.seg[0];
          const ha = Math.atan2(hd.y - guard.cy, hd.x - guard.cx);
          // where the rim gets close to a wall or the screen edge, the path tucks inside so it doesn't swing out
          const clearOf = (x: number, y: number) => x > 110 * s && x < w - 110 * s && y < h - 100 * s && y > headerBottom() + 90 * s && !sceneWalls().some((wl) => inRect(x, y, wl, 95 * s));
          const rim = (a: number) => {
            let r = guard.r;
            while (r > guard.r * 0.5 && !clearOf(guard.cx + Math.cos(a) * r, guard.cy + Math.sin(a) * r)) r -= 8 * s;
            return { x: guard.cx + Math.cos(a) * r, y: guard.cy + Math.sin(a) * r };
          };
          // inside the disc after breathing, head straight back to the rim instead of looping over the runes
          const here = rim(ha), rimR = Math.hypot(here.x - guard.cx, here.y - guard.cy);
          const inner = Math.hypot(hd.x - guard.cx, hd.y - guard.cy) < rimR * 0.88;
          // (escape target wins if it's pinned)
          if (c.stuck === 0) rw.set(rim(ha + (inner ? 0.2 : 0.5)), t, 1);
          if (inner && !c.fireAt && !c.holdFire) c.turnBoost = Math.max(c.turnBoost, 0.6);
          if (c.fireAt) {
            const fa = Math.atan2(c.fireAt.y - guard.cy, c.fireAt.x - guard.cx);
            const diff = Math.atan2(Math.sin(fa - ha), Math.cos(fa - ha));
            const near = Math.hypot(c.fireAt.x - hd.x, c.fireAt.y - hd.y) < 300 * s;
            if (!near && Math.abs(diff) > 0.35) aim = rim(ha + Math.sign(diff) * 0.6);
          }
        } else {
          if (rw.due(t, c, s)) rw.pick(t, box, wallsFor(1), s, badRed, c);
          rw.hunt(t, c, world.sky, s, drav, lanternHalf(1, box));
        }
        steer = avR.steer(c, drav, s, t, together() ? 1.45 : 1);
        if (avR.close > (together() ? 0.6 : 1.2) && !guard) { avR.close = 0; rw.pick(t, box, wallsFor(1), s, badRed, c); }
        const home = guard ? null : homeward(c, box, s, 40 * s, sceneWalls());
        tg = home ?? aim ?? c.fireAt ?? c.holdFire ?? rw.at;
        const dist = Math.hypot(tg.x - c.seg[0].x, tg.y - c.seg[0].y);
        const celebrating = guard && performance.now() < dragonBus.celebrateUntil;
        top = (c.holdFire ? 1.2 : celebrating ? 7.5 : guard && c.fireAt ? 6.4 : c.fireAt || home || dist > 450 * s ? 4.6 : 2.4) * s;
      }
      dbgTg[1] = tg;
      c.glance = duel.on ? drav.seg[0] : null;
      c.eyes(duel.on || (!guard && near(c, drav, 460)) ? drav.seg[0] : tg, t);
      c.move(tg, { top, base: 0.065, walls: wallsFor(1), others: [drav], steer: steer.bias, slow: steer.slow, area: box.y0 < h && !guard ? box : undefined, edge: box.y0 < h && !guard && nearEdge(c, box) });
      // circling (except around the wheel, which is the point) or pinned: fly out the most open way
      if (!duel.on && ((c.looping && !guard) || c.stuck === 49)) {
        rw.set(c.escape(wallsFor(1), { x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 }), t, 2.5);
      }
      c.fire(sparks, t, guard ? 260 * s : c.range(), duel.on ? 0.42 : 0.4);
    };

    // every now and then outside a duel, if they happen to be close and one is facing the other
    let skirmishAt = 30 + Math.random() * 30;
    let answer: { by: Creature; to: Creature; at: number; back: boolean } | null = null;
    const facing = (a: Creature, p: P) => Math.abs(Math.atan2(Math.sin(Math.atan2(p.y - a.seg[0].y, p.x - a.seg[0].x) - a.course), Math.cos(Math.atan2(p.y - a.seg[0].y, p.x - a.seg[0].x) - a.course)));
    // one breathes a short burst at the other, the other always answers, turning to face it if needed
    let lastSkirmish = -99;
    const strike = (atk: Creature, def: Creature) => {
      lastSkirmish = t;
      skirmishAt = t + 45 + Math.random() * 45;
      atk.breathLen = 0.7;
      const aimer = () => Duel.bodyAim(atk, def);
      atk.breatheAt(aimer(), t, 1.6, aimer);
      answer = { by: def, to: atk, at: t + 0.8 + Math.random() * 0.4, back: true };
    };
    const onScreen = (c: Creature) => { const hb = headerBottom(); return c.seg[0].x > 40 && c.seg[0].x < w - 40 && c.seg[0].y > hb + 40 && c.seg[0].y < h - 40; };
    const calm = () => duel.on || gameOn() || lair() || balGuarding || bal.alpha < 0.95 || !onScreen(drav) || !onScreen(bal);
    const skirmish = () => {
      if (answer && t > answer.at) {
        const { by, to } = answer;
        // still breathing or aiming, so it answers a moment later
        if (by.fireAt || by.breath > 0) answer.at = t + 0.3;
        else {
          answer = null;
          if (!calm()) {
            by.breathLen = 0.7;
            const aimer = () => Duel.bodyAim(by, to);
            by.breatheAt(aimer(), t, 2.4, aimer);
          }
        }
      }
      if (calm() || t < skirmishAt) return;
      const a = drav.seg[0], b = bal.seg[0], dd = Math.hypot(a.x - b.x, a.y - b.y);
      if (dd < 240 * s || dd > 520 * s) return;
      const fa = facing(drav, b), fb = facing(bal, a);
      const [atk, def] = fa < fb ? [drav, bal] : [bal, drav];
      if (Math.min(fa, fb) > 0.8 || atk.fireAt || atk.breath > 0) return;
      strike(atk, def);
    };

    // end of the duel: both stop face to face at the line, then a flash, shockwave
    const clash = (p: P) => {
      burst(p.x, p.y, 30 * s, 110, 1.6);
      world.rings.push({ x: p.x, y: p.y, r: 60 * s, age: 0 });
      for (const c of D) { c.turnBoost = 1; c.smoke(sparks, 8, true); }
      slowUntil = t + 0.16;
      shake(true);
      flashRef.current?.classList.remove("on");
      void flashRef.current?.offsetWidth;
      flashRef.current?.classList.add("on");
      sound.roar();
    };

    // first strike: heads meet at the line with sparks and a jolt
    const knock = (p: P) => {
      burst(p.x, p.y, 24 * s, 80, 1.35);
      world.rings.push({ x: p.x, y: p.y, r: 40 * s, age: 0 });
      for (const c of D) c.turnBoost = Math.max(c.turnBoost, 0.8);
      shake();
    };
    const duelFx = { clash, knock, snort: (c: Creature) => c.smoke(sparks, 8, true) };

    const step = () => {
      drav.begin();
      bal.begin();
      for (const p of sparks) { p.px = p.x; p.py = p.y; }
      const cmd = cmdRef.current;
      if (cmd) {
        cmdRef.current = null;
        if (cmd === "build" || cmd === "buildNew") {
          // new run resets the score, the next trial in a run keeps it
          if (cmd === "buildNew" || G.kind !== "trial") Object.assign(G, newState("trial"));
          build(levelRef.current);
        } else if (cmd === "siege") {
          siegeStart();
          const hd = bal.seg[0];
          if (hd.x < 40 || hd.x > w - 40 || hd.y < 40 || hd.y > h - 40) bal.place(w / 2, h * 0.68, -Math.PI / 2);
          resetAim(bal);
        } else if (cmd === "stage") {
          // siege dragon arrives low in the middle, facing up where the lanterns rise
          Object.assign(G, newState("siege"));
          bal.place(w / 2, h * 0.68, -Math.PI / 2);
          bal.alpha = 0;
          resetAim(bal);
        } else Object.assign(G, newState(G.kind));
        gameSettled = false;
        holding = false;
      }
      const inGame = gameOn();
      // back from the games: if Balerian was flown outside its area, quietly move it below the screen
      if (wasInGame && !inGame) {
        const hd = bal.seg[0], bx = balBox();
        if (hd.x < bx.x0 || hd.x > bx.x1 || hd.y < bx.y0 || hd.y > bx.y1) {
          bal.place(Math.max(bx.x0 + 120 * s, Math.min(bx.x1 - 120 * s, hd.x)), h + 240 * s, -Math.PI / 2);
          bal.alpha = 0;
          resetAim(bal);
          rw.pick(t, balBox(), wallsFor(1), s, badRed, bal);
        }
        resetAim(drav);
      }
      wasInGame = inGame;
      // fire in a game: breathing drains it, and once empty it has to cool down (smoking) before it works again
      if (inGame && phaseRef.current === "play") {
        const pc = player();
        if (!fuelStep(t, pc.breath > 0 && pc.mouth > 0.55)) {
          pc.fireAt = null; pc.holdFire = null; pc.aimFn = null; pc.breath = 0;
          if (Math.random() < 0.12) pc.smoke(sparks, 1);
        }
      }
      const hb = headerBottom();
      // duel: start on request, count down, end after 15s
      if (duelCmd.current) {
        duelCmd.current = false;
        if (!duel.on && !inGame) {
          const v = view();
          // arena is the screen below the nav, mostly inside Balerian's area
          const box = { ...v, y0: Math.max(v.y0, Math.min(regionTop(), v.y0 + (v.y1 - v.y0) * 0.35)) };
          // on wide screens keep it in the content column, away from the town and walls
          if (world.wide) { box.x0 = world.margin + 20; box.x1 = w - world.margin - 20; }
          duel.start(t, D, box, s);
          for (const c of D) { c.fireAt = null; c.holdFire = null; c.aimFn = null; c.prey = null; c.firePower = 1.75; }
          answer = null;
          duelReadyRef.current = false;
          setDuelReady(false);
          const green = duel.sign[0] < 0 ? (duel.axis === "x" ? "left" : "top") : duel.axis === "x" ? "right" : "bottom";
          setDuelFx(green);
          sound.roar();
        }
      }
      if (duel.on) {
        const left = duel.left(t);
        if (inGame || duel.done(t)) {
          duel.on = false;
          duelCool = t + 3;
          lastLeft = -1;
          for (const c of D) { c.breathLen = 0.75; c.firePower = 1; }
          setDuelHud(null);
          setDuelFx(null);
          // after the clash they glide away from each other
          gw.part(() => bal.seg[0], t, 7);
          rw.part(() => drav.seg[0], t, 7);
          gw.pick(t, bounds(), wallsFor(0), s, badGreen, drav);
          rw.pick(t, balBox(), wallsFor(1), s, badRed, bal);
          lastSkirmish = t;
        } else if (left !== lastLeft) {
          lastLeft = left;
          setDuelHud({ left });
        }
      }
      settleWalls();
      // room for legs and spines when they pass (less in the duel where hits need to land on the body)
      for (const c of D) c.pad = (duel.on ? 3 : 14) * s;
      {
        const tg = together();
        if (tg && !wasTogether) {
          if (!chasingNow()) gw.pick(t, bounds(), wallsFor(0), s, badGreen, drav);
          if (!balGuarding) rw.pick(t, balBox(), wallsFor(1), s, badRed, bal);
        }
        wasTogether = tg;
      }
      stepDrav(inGame);
      stepBal(inGame);
      // chance meeting: when their heads get close outside a duel, steering takes them past each other, eyes locked
      if (!duel.on && !inGame && bal.alpha > 0.9 && t > meetAt) {
        const a = drav.seg[0], b = bal.seg[0];
        if (Math.hypot(a.x - b.x, a.y - b.y) < 260 * s) {
          meetAt = t + 5;
          // they drift apart, each heading forward and away from the other..
          gw.part(() => bal.seg[0], t, 6);
          rw.part(() => drav.seg[0], t, 6);
          if (!chasingNow()) gw.pick(t, bounds(), wallsFor(0), s, badGreen, drav);
          if (!balGuarding) rw.pick(t, balBox(), wallsFor(1), s, badRed, bal);
          // ...and sometimes the one facing the other breathes at it and gets an answer
          if (!calm() && t - lastSkirmish > 20 && Math.random() < 0.4) {
            const fa = facing(drav, b), fb = facing(bal, a), [atk, def] = fa < fb ? [drav, bal] : [bal, drav];
            if (Math.min(fa, fb) < 1.1 && !atk.fireAt && atk.breath <= 0) strike(atk, def);
          }
        }
      }
      if (!inGame) skirmish();
      if (!inGame) world.step(t, hb);
      // rising lanterns pop when a dragon's body or face touches them
      if (!inGame) {
        for (let j = world.sky.length - 1; j >= 0; j--) {
          const o = world.sky[j];
          if (o.a < 0.35) continue;
          for (const c of D) {
            if (c.alpha < 0.5) continue;
            const f = c.headPt(20, 0);
            if (c.bodyGap(o).gap < o.r * 0.5 || Math.hypot(f.x - o.x, f.y - o.y) < 30 * s + o.r) { burstSky(o); break; }
          }
        }
      }
      if (trace) {
        const face = (c: Creature) => (c.faceHits(c.seg[0].x, c.seg[0].y, c.dirAt(0), wallsFor(c.id as 0 | 1).filter((wl) => !wl.ghost || duel.on), 0) ? 1 : 0);
        let bb = Infinity;
        for (let i = 0; i < drav.seg.length; i += 3) for (let j = 0; j < bal.seg.length; j += 3) {
          const d = Math.hypot(drav.seg[i].x - bal.seg[j].x, drav.seg[i].y - bal.seg[j].y) - drav.rad(i) - bal.rad(j);
          if (d < bb) bb = d;
        }
        trace.push({
          t, x: drav.seg[0].x, y: drav.seg[0].y, rx: bal.seg[0].x, ry: bal.seg[0].y, gFace: face(drav), rFace: face(bal), bb,
          gsx: drav.headPt(58, 0).x, gsy: drav.headPt(58, 0).y, rsx: bal.headPt(58, 0).x, rsy: bal.headPt(58, 0).y,
          duel: duel.on ? 1 : 0, live: world.live ? 1 : 0, rTop: regionTop(), gStuck: drav.stuck, rStuck: bal.stuck,
          gSpd: drav.speed, rSpd: bal.speed, gHd: drav.heading, rHd: bal.heading, gLoop: drav.looping ? 1 : 0, rLoop: bal.looping ? 1 : 0,
          gS: gameSettled ? 1 : 0, gH: drav.holdFire ? 1 : 0, fg: Math.min(drav.faceGap(drav.seg[0].x, drav.seg[0].y, drav.dirAt(0), [bal]), bal.faceGap(bal.seg[0].x, bal.seg[0].y, bal.dirAt(0), [drav])), gBlk: drav.blocked ? 1 : 0, rBlk: bal.blocked ? 1 : 0, meets, gC: drav.course, rC: bal.course, gF: drav.face, rF: bal.face, gNkx: drav.neck, rNk: bal.neck, gOm: drav.omega, rOm: bal.omega, gNk: drav.neck, core: core.p, skAt: skirmishAt, gSelf: drav.bodyGap(drav.seg[0], 22).gap, rSelf: bal.bodyGap(bal.seg[0], 22).gap, same: drav.prey && drav.prey === bal.prey ? 1 : 0, gBy: drav.dbg.by, rBy: bal.dbg.by, gDf: drav.dbg.diff, gSf: drav.dbg.self, gWl: drav.dbg.wall, gNl: drav.dbg.neckLim, rDf: bal.dbg.diff, rSf: bal.dbg.self, rWl: bal.dbg.wall, rNl: bal.dbg.neckLim, gTx: dbgTg[0].x, gTy: dbgTg[0].y, rTx: dbgTg[1].x, rTy: dbgTg[1].y, grd: balGuarding ? 1 : 0, tog: together() ? 1 : 0, gwx: gw.at.x, gwy: gw.at.y, rwx: rw.at.x, rwy: rw.at.y, gch: dravChasing ? 1 : 0, dm0: ["way", "hold", "lunge", "exit"].indexOf(duel.mode[0]), dm1: ["way", "hold", "lunge", "exit"].indexOf(duel.mode[1]), dr: duel.ready ? duel.elapsed(t) - duel.ready : -1, uv: duel.on ? duel.uv(D).map((x) => Math.round(x)).join(",") as unknown as number : 0, ch0: duel.lined[0] ? 1 : 0, ch1: duel.lined[1] ? 1 : 0, mid: duel.mid, hit0: landed[0], hit1: landed[1], bid0: drav.breathId, bid1: bal.breathId, gBr: drav.breath > 0 ? 1 : 0, rBr: bal.breath > 0 ? 1 : 0, ra: bal.alpha, mouth: drav.mouth, rmouth: bal.mouth,
        });
        if (trace.length > 20000) trace.splice(0, 5000);
      }

      // game lanterns drift in place (trial) or rise (siege)
      const playing = phaseRef.current === "play";
      for (const o of G.lanterns) if (o.burst > 0) o.burst += 1 / 60;
      if (G.kind === "siege") { if (playing) stepSiege(t, onHurt); }
      else for (const o of G.lanterns) {
        if (o.burst > 0) continue;
        o.x = o.bx + Math.cos(t * o.spd + o.ph) * o.amp;
        o.y = o.by + Math.sin(t * o.spd * 1.3 + o.ph) * o.amp * 0.6 + Math.sin(t * 2 + o.ph) * 3;
      }
      for (const o of G.lanterns) if (o.burst === 0) o.heat = Math.max(0, o.heat - 0.05);

      const fireWalls = inGame ? G.walls : sceneWalls();
      for (let k = sparks.length - 1; k >= 0; k--) {
        const p = sparks[k];
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.955; p.vy = p.vy * 0.955 - 0.05;
        p.life -= 1;
        if (!p.smoke && !p.fx) {
          if (fireWalls.some((wl) => !wl.ghost && inRect(p.x, p.y, wl))) {
            // fire splashes off stone and brick, none goes through
            if (Math.random() < 0.25) sparks.push({ x: p.x - p.vx, y: p.y - p.vy, vx: -p.vx * 0.2 + (Math.random() - 0.5) * 2, vy: -p.vy * 0.2 - 1, life: 18, max: 18, r: 2 * s, smoke: false, fx: true });
            sparks.splice(k, 1);
            continue;
          }
          if (playing && !G.over) {
            const o = G.lanterns.find((q) => q.burst === 0 && Math.hypot(q.x - p.x, q.y - p.y) < q.r + 4);
            if (o) {
              o.heat += 1;
              if (o.heat >= o.need) {
                o.burst = 1e-3;
                burned(o, t);
                burst(o.x, o.y, o.r);
                world.rings.pop();
                if (G.kind === "trial" && G.left === 0) G.doneAt = t + 0.7;
              }
              sparks.splice(k, 1);
              continue;
            }
          } else if (!inGame) {
            const o = world.sky.find((q) => q.a > 0.35 && Math.hypot(q.x - p.x, q.y - p.y) < q.r + 4);
            if (o) { burstSky(o); sparks.splice(k, 1); continue; }
          }
        }
        if (!p.smoke && !p.fx && p.life < p.max * 0.35 && Math.random() < 0.05) {
          sparks.push({ x: p.x, y: p.y, vx: p.vx * 0.3, vy: -0.6, life: 50, max: 50, r: p.r, smoke: true });
        }
        if (p.life <= 0) sparks.splice(k, 1);
      }
      if (!inGame) {
        // where the two fire streams meet they burst into white gold sparks
        core.p *= 0.94;
        fireMeets(sparks, s, (x, y) => {
          meets++;
          if (core.p < 0.05) { core.x = x; core.y = y; } else { core.x += (x - core.x) * 0.15; core.y += (y - core.y) * 0.15; }
          core.p = Math.min(1, core.p + 0.05);
          for (let n = 0; n < 3; n++) {
            const a = Math.random() * Math.PI * 2, v = (3 + Math.random() * 5) * s, life = 18 + Math.random() * 16;
            sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, r: (3 + Math.random() * 3) * s, smoke: false, fx: true });
          }
          if (t - lastFlare > 0.12) { lastFlare = t; world.rings.push({ x, y, r: 18 * s, age: 0 }); }
          if (duel.on && t - lastShake > 0.7) { lastShake = t; shake(); }
        });
        // fire hitting the other dragon, it flinches once per breath
        Duel.hits(sparks, D, (k, p, first) => {
          if (first) {
            landed[k]++;
            world.rings.push({ x: p.x, y: p.y, r: 14 * s, age: 0 });
            if (duel.on) shake();
          }
          for (let n = 0; n < (first ? 8 : 1); n++) {
            const a = Math.random() * Math.PI * 2, life = 14 + Math.random() * 10;
            sparks.push({ x: p.x, y: p.y, vx: Math.cos(a) * 3 * s, vy: Math.sin(a) * 3 * s, life, max: life, r: 2.5 * s, smoke: false, fx: true });
          }
        });
      }
      G.lanterns = G.lanterns.filter((o) => o.burst < 0.6);

      if (playing) {
        if (G.kind === "siege") { if (G.over && t >= G.doneAt) finishSiege(); }
        else if (G.left === 0) { if (t >= G.doneAt) finishTrial(true); }
        else {
          G.time -= 1 / 60;
          G.elapsed += 1 / 60;
          if (G.time <= 0) { G.time = 0; finishTrial(false); }
        }
      }
    };

    const { drawWalls, drawLanterns, drawHud, drawFx } = game;
    // fire and smoke
    const drawSparks = (g: CanvasRenderingContext2D, k: number, mine: (p: Spark) => boolean) => {
      g.fillStyle = "rgb(70, 75, 70)";
      for (const p of sparks) {
        if (!p.smoke || !mine(p)) continue;
        const q = p.life / p.max, x = p.px === undefined ? p.x : p.px + (p.x - p.px) * k, y = p.py === undefined ? p.y : p.py + (p.y - p.py) * k;
        g.globalAlpha = 0.22 * q;
        g.beginPath(); g.arc(x, y, p.r * (2.6 - q * 1.4), 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
      // flames use three pre-rendered glows (white hot, orange, ember) instead of a new gradient per spark per frame
      g.save();
      g.globalCompositeOperation = "lighter";
      for (const p of sparks) {
        if (p.smoke || !mine(p)) continue;
        const q = p.life / p.max;
        const rr = p.r * (2.2 - q * 1.2), x = p.px === undefined ? p.x : p.px + (p.x - p.px) * k, y = p.py === undefined ? p.y : p.py + (p.y - p.py) * k;
        g.globalAlpha = Math.max(0, Math.min(1, q));
        g.drawImage(q > 0.7 ? glowHot : q > 0.35 ? glowMid : glowCool, x - rr, y - rr, rr * 2, rr * 2);
      }
      g.restore();
    };
    let sceneClear = false, sceneTick = 0, slowFrame = false;
    const draw = (k: number) => {
      ctx.clearRect(0, 0, w, h);
      const inGame = gameOn();
      if (inGame) {
        if (!sceneClear) { sctx.clearRect(0, 0, w, h); sceneClear = true; }
      } else {
        // town windows and lanterns change slowly, so only repaint them 30 times a second
        if (++sceneTick % 2 === 0 || sceneClear || slowFrame) world.drawScene(sctx, t);
        sceneClear = false;
      }
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (pinned) {
        // lair canvas sits on the hero, so shift by where the hero is on screen
        lctx.setTransform(1, 0, 0, 1, 0, 0);
        lctx.clearRect(0, 0, lc.width, lc.height);
        lctx.setTransform(dpr, 0, 0, dpr, -heroX * dpr, -heroY * dpr);
        lctx.lineCap = "round";
        lctx.lineJoin = "round";
      }
      if (inGame) { drawWalls(); drawLanterns(); }
      else world.drawWalls(ctx, dpr);
      // Dravoxus in the lair while it's scrolled away isn't drawn
      const dravGone = !inGame && offView(drav);
      if (!offView(bal)) bal.draw(k);
      if (!dravGone) drav.draw(k);

      // fire and smoke
      if (sparks.length) {
        // Dravoxus's fire goes on the lair canvas with it so they scroll together
        if (pinned) { drawSparks(ctx, k, (p) => p.own !== drav.id); drawSparks(lctx, k, (p) => p.own === drav.id); }
        else drawSparks(ctx, k, () => true);
      }
      // core where two fire streams fight
      if (core.p > 0.03) {
        const r = (30 + 80 * core.p) * s;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = Math.min(1, core.p * 1.3);
        ctx.drawImage(glowHot, core.x - r, core.y - r, r * 2, r * 2);
        ctx.globalAlpha = Math.min(1, core.p);
        ctx.drawImage(glowMid, core.x - r * 2.2, core.y - r * 2.2, r * 4.4, r * 4.4);
        ctx.restore();
      }
      world.drawRings(ctx);
      // scoreboard while a game is running (not over the menu or rules)
      const ph = phaseRef.current;
      if (inGame && (ph === "play" || ph === "won" || ph === "lost")) { drawFx(); drawHud(); }
    };

    // duel button shows when Dravoxus (free or summoned, not in the lair) is in Balerian's area, both are on screen
    let frames = 0;
    const checkDuel = () => {
      const hb = headerBottom();
      const vis = (c: Creature) => c.alpha > 0.9 && c.seg[0].x > 0 && c.seg[0].x < w && c.seg[0].y > hb && c.seg[0].y < h;
      const inTerritory = drav.seg[0].y > regionTop() + 20 * s;
      const ready = !gameOn() && !duel.on && !lair() && t > duelCool && inTerritory && vis(drav) && vis(bal);
      if (ready !== duelReadyRef.current) {
        duelReadyRef.current = ready;
        setDuelReady(ready);
      }
    };

    // fixed 60 steps a second no matter the refresh rate, so motion stays even on 120Hz
    let last = 0, acc = 0;
    const rootEl = document.documentElement;
    // when banished, Dravoxus lives in the hero, so it's drawn on its own canvas placed over the hero in the page
    let pinned = false, heroX = 0, heroY = 0, lairW = 0, lairH = 0, lairDpr = 0, lairTop = 0, lairLeft = 0;
    const pin = () => {
      const hero = lair() && !gameOn() ? document.querySelector(".hero") : null;
      if (!hero) {
        if (pinned) {
          pinned = false;
          lc.style.display = "none";
          drawOn(drav, ctx);
        }
        return;
      }
      // margin above and below so a tail or breath past the hero's edge isn't cut off
      const b = hero.getBoundingClientRect(), pad = Math.round(220 * s);
      const r = { left: b.left, top: b.top - pad, width: b.width, height: b.height + pad * 2 };
      heroX = r.left; heroY = r.top;
      // only move it to the lair canvas once it's fully inside
      const within = (m: number) => drav.seg.every((p) => p.x > r.left + m && p.x < r.left + r.width - m && p.y > r.top + m && p.y < r.top + r.height - m);
      if (!pinned && within(40 * s)) {
        pinned = true;
        lc.style.display = "block";
        drawOn(drav, lctx);
      } else if (pinned && !within(0)) {
        pinned = false;
        lc.style.display = "none";
        drawOn(drav, ctx);
        return;
      }
      if (!pinned) return;
      // canvas covers the hero plus margin, only resized when the hero size changes
      const cw = Math.ceil(r.width), ch = Math.ceil(r.height);
      if (Math.abs(cw - lairW) > 1 || Math.abs(ch - lairH) > 1 || lairDpr !== dpr) {
        lairW = cw; lairH = ch; lairDpr = dpr;
        lc.width = Math.round(cw * dpr); lc.height = Math.round(ch * dpr);
        lc.style.width = `${cw}px`; lc.style.height = `${ch}px`;
      }
      // keep it lined up exactly on the hero
      const m = lc.getBoundingClientRect();
      if (Math.abs(m.top - r.top) > 0.5 || Math.abs(m.left - r.left) > 0.5) {
        lairTop += r.top - m.top; lairLeft += r.left - m.left;
        lc.style.top = `${lairTop}px`; lc.style.left = `${lairLeft}px`;
      }
    };
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      stamp++;
      // paused, everything holds still
      if (pausedRef.current) { last = now; draw(acc); return; }
      // while an arcade game is running the dragons freeze and stop drawing so the game gets every frame
      if (rootEl.classList.contains("arcade-playing") || rootEl.classList.contains("arcade-open")) { last = now; return; }
      acc += Math.min(4, last ? (now - last) / (1000 / 60) : 1) * (t < slowUntil ? 0.35 : 1);
      slowFrame = now - last > 24;
      last = now;
      followScroll();
      const p0 = trace ? performance.now() : 0;
      while (acc >= 1) {
        acc -= 1;
        t += 1 / 60;
        step();
      }
      const p1 = trace ? performance.now() : 0;
      if (++frames % 12 === 0) checkDuel();
      // draw between the last two steps so it stays smooth on 90/120Hz screens
      pin();
      draw(acc);
      if (trace) { prof.step += p1 - p0; prof.draw += performance.now() - p1; prof.n++; }
    };

    // touch screens have no hover, so Dravoxus doesn't chase your finger while you browse
    const breatheAt = (x: number, y: number) => {
      if (duel.on || !inside({ x, y })) return;
      drav.breatheAt({ x, y }, t);
    };
    const onMove = (e: PointerEvent) => {
      if (tap && e.pointerId === tap.id && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 12) tap = null;
      if (e.pointerType === "touch" && !gameOn()) return;
      // over the nav Dravoxus ignores the cursor
      if (!gameOn() && ((e.target as Element | null)?.closest?.("header.top") || e.clientY < headerBottom())) {
        pointer = null;
        lastMove = -99;
        return;
      }
      // only a real move away from where it settled wakes the chase again (not a jiggle), and not instantly
      if (!pointer || (Math.hypot(e.clientX - settledAt.x, e.clientY - settledAt.y) > 90 * s && t - settledT > 0.7)) settled = false;
      pointer = { x: e.clientX, y: e.clientY };
      lastMove = t;
    };
    const onDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest(IGNORE)) return;
      if (gameOn()) {
        if (pausedRef.current) return;
        pointer = { x: e.clientX, y: e.clientY };
        lastMove = t;
        if (phaseRef.current === "play") holding = true;
        return;
      }
      if (window.getSelection()?.toString()) return;
      if (e.pointerType === "touch") {
        tap = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
        return;
      }
      if (!inside({ x: e.clientX, y: e.clientY })) return;
      breatheAt(e.clientX, e.clientY);
      pointer = { x: e.clientX, y: e.clientY };
      lastMove = t;
      settled = false;
    };
    const onUp = (e: PointerEvent) => {
      holding = false;
      // let go before it turned to face the spot, so no late fire
      if (gameOn()) { const pc = player(); pc.fireAt = null; pc.breath = Math.min(pc.breath, 0.12); }
      if (tap && e.pointerId === tap.id && !gameOn() && performance.now() - tap.t < 350) {
        breatheAt(tap.x, tap.y);
        // following on a phone: stays near the last tap
        if (modeRef.current === "follow") { pointer = { x: tap.x, y: tap.y }; lastMove = t; settled = false; }
      }
      tap = null;
    };
    const onCancel = () => { holding = false; tap = null; if (gameOn()) player().fireAt = null; };
    const onScroll = () => { tap = null; };
    const onLeave = () => { lastMove = -99; };

    if (trace) {
      (window as unknown as { __dragon: unknown }).__dragon = {
        trace, seg: () => drav.seg.map((p) => ({ ...p })), red: () => bal.seg.map((p) => ({ ...p })),
        world: () => ({ walls: world.walls, live: world.live, sky: world.sky.map((o) => ({ ...o })), wide: world.wide, margin: world.margin }),
        duel: () => ({ wlog: duel.wlog, hitIdx: duel.hitIdx, ready: duel.ready, mode: duel.mode, attacker: duel.attacker, on: duel.on, axis: duel.axis, mid: duel.mid, sign: duel.sign, meetAt: duel.meetAt, clashAt: duel.clashAt, knocked: duel.knocked, lined: duel.lined, snouts: [drav.headPt(58, 0), bal.headPt(58, 0)], box: duel.box, el: duel.elapsed(t), g: drav.seg[0], r: bal.seg[0], gStuck: drav.stuck, gFire: drav.fireAt, gHold: drav.holdFire, rFire: bal.fireAt, rHold: bal.holdFire, rFace: bal.face, rMouth: bal.mouth }),
        startDuel: () => { duelCmd.current = true; },
        shift: (k: number, dx: number, dy: number) => D[k].shift(dx, dy),
        state: () => ({ mode: modeRef.current, recall: recallEnd > t, gameSettled, hold: !!drav.holdFire, gone: offView(drav) }),
        prof: () => { const r = { step: +(prof.step / prof.n).toFixed(2), draw: +(prof.draw / prof.n).toFixed(2), n: prof.n }; prof.step = prof.draw = prof.n = 0; return r; },
        aim: (k: number, x: number, y: number) => D[k].breatheAt({ x, y }, t),
        goto: (k: number, x: number, y: number) => (k ? rw : gw).set({ x, y }, t, 6),
        balBox,
        // test hook: set the game state directly to jump to a point without playing there
        patchGame: (o: Record<string, unknown>) => Object.assign(G, o),
        buildLevel: (L: number) => { build(L); return { total: G.total, walls: G.walls.length }; },
        // test hook: the current game state and where your dragon is
        game: () => ({ kind: G.kind, fuel: G.fuel, overheat: G.overheat, score: G.score, burned: G.burned, health: G.health, elapsed: G.elapsed, time: G.time, start: G.start, left: G.left, total: G.total, over: G.over, escaped: G.escaped, great: G.great, jade: G.jade, plain: G.plain,
          lanterns: G.lanterns.map((o: Lantern) => ({ x: o.x, y: o.y, r: o.r, kind: o.kind, burst: o.burst, heat: o.heat, need: o.need })), walls: G.walls.map((wl) => ({ ...wl })), head: player().seg[0], dir: player().dirAt(0), phase: phaseRef.current, paused: pausedRef.current,
          holding, fireAt: player().fireAt, holdFire: player().holdFire, breath: player().breath, mouth: player().mouth, settled: gameSettled, pointer }),
        probe: () => {
          const c = drav, hd = c.seg[0], wl = wallsFor(0), m = 3 * s;
          const n = c.normal(wl, [bal]);
          const at = (x: number, y: number) => ({ dDrawn: +c.faceDepth(x, y, Math.atan2(y - c.seg[1].y, x - c.seg[1].x), wl, m).toFixed(2), dHead: +c.faceDepth(x, y, c.heading, wl, m).toFixed(2), gap: +c.faceGap(x, y, Math.atan2(y - c.seg[1].y, x - c.seg[1].x), [bal]).toFixed(1) });
          return { hd: { x: hd.x, y: hd.y }, seg1: c.seg[1], heading: c.heading, dir0: c.dirAt(0), now: c.faceDepth(hd.x, hd.y, c.dirAt(0), wl, m), n, walls: wl.length, speed: c.speed,
            tan1: at(hd.x - n.y * 1.3, hd.y + n.x * 1.3), tan2: at(hd.x + n.y * 1.3, hd.y - n.x * 1.3), out: at(hd.x + n.x, hd.y + n.y), mode: modeRef.current, gw: gw.at };
        },
      };
    }

    resize();
    gw.pick(t, bounds(), [], s, badGreen);
    rw.set({ x: w * 0.4, y: h + 200 * s }, t, 2);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onCancel, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", resize);
    };
  }, [reduce]);

  if (reduce) return null;

  const inGame = phase !== "off";
  const dueling = duelHud !== null;
  const opp: Record<Side, Side> = { left: "right", right: "left", top: "bottom", bottom: "top" };

  return (
    <>
      <div className="world-breath" aria-hidden="true" />
      <canvas ref={townRef} className="dragon-town" aria-hidden="true" />
      <canvas ref={sceneRef} className="dragon-scene" aria-hidden="true" />
      {/* duel dims the page and lights each dragon's side in its colour */}
      <div className={`duel-veil${duelFx && !inGame ? " on" : ""}`} data-jade={duelFx ?? "left"} data-ember={opp[duelFx ?? "left"]} aria-hidden="true" />
      <div ref={flashRef} className="duel-flash" aria-hidden="true" />
      <div className={`duel-bars${duelFx && !inGame ? " on" : ""}`} aria-hidden="true"><i /><i /></div>
      {inGame && <div className="game-veil" aria-hidden="true" />}
      <canvas ref={ref} className={`dragon${inGame ? " playing" : ""}`} aria-hidden="true" />
      <canvas ref={lairRef} className="dragon dragon-lair" style={{ position: "absolute", display: "none" }} aria-hidden="true" />

      {!inGame && (
        <div ref={railRef} className="dragon-ui" role="toolbar" aria-label="Dragon controls" aria-orientation="vertical">
          {hint && mode !== "lair" && (
            <span className="dragon-hint" aria-hidden="true">
              <span className="hint-fine">Click anywhere to breathe fire</span>
              <span className="hint-coarse">Tap anywhere to breathe fire</span>
            </span>
          )}
          <button
            type="button"
            className="rail-btn"
            onClick={() => choose(mode === "follow" ? "roam" : "follow")}
            aria-pressed={mode === "follow"}
            aria-label={mode === "follow" ? "Release Dravoxus to roam on its own" : "Summon Dravoxus to follow you"}
            data-tip={mode === "follow" ? "Let Dravoxus roam on its own" : "Make Dravoxus follow you"}
          >
            <span className="rail-ico">{mode === "follow" ? <SkyIcon /> : <EyeIcon />}</span>
            <span className="rail-label">{mode === "follow" ? "Release" : "Summon"}</span>
          </button>
          <button
            type="button"
            className="rail-btn"
            onClick={() => choose(mode === "lair" ? "roam" : "lair")}
            aria-pressed={mode === "lair"}
            aria-label={mode === "lair" ? "Free Dravoxus to roam the whole page" : "Banish Dravoxus to the top section"}
            data-tip={mode === "lair" ? "Let Dravoxus roam free" : "Send Dravoxus to its lair"}
          >
            <span className="rail-ico">{mode === "lair" ? <SkyIcon /> : <LairIcon />}</span>
            <span className="rail-label">{mode === "lair" ? "Free" : "Banish"}</span>
          </button>
          <button type="button" className="rail-btn trial" onClick={() => openMenu()} aria-label="Play the dragon games" data-tip="Play the dragon games">
            <span className="rail-ico"><BladesIcon /></span>
            <span className="rail-label">Trials</span>
          </button>
          {(duelReady || dueling) && (
            <button
              type="button"
              className="rail-btn duel"
              disabled={dueling}
              onClick={() => { duelCmd.current = true; }}
              aria-label={dueling ? "Dravoxus and Balerian are dueling" : "Make Dravoxus and Balerian duel for 15 seconds"}
              data-tip="Dravoxus vs Balerian"
            >
              <span className="rail-ico"><DuelIcon /></span>
              <span className="rail-label">{dueling ? `${duelHud.left}s` : "Duel"}</span>
            </button>
          )}
        </div>
      )}

      {duelHud && !inGame && (
        <div className="duel-hud" role="status" aria-live="polite">
          <span className="duel-k">Duel</span>
          <b><i className="jade">Dravoxus</i> <span className="duel-vs">vs</span> <i className="crimson">Balerian</i></b>
          <span className="duel-t">{duelHud.left}</span>
        </div>
      )}

      {phase === "play" && !paused && (
        <button type="button" className="game-quit rune" onClick={() => pause(true)} aria-label="Pause the game">
          <span className="gq-icon" aria-hidden="true" />
          <span className="gq-text">Pause <kbd>Esc</kbd></span>
        </button>
      )}

      {phase === "play" && paused && (
        <div className="game-card" role="dialog" aria-modal="true" aria-labelledby="game-title">
          <p className="game-kicker">{game === "trial" ? `Trial ${roman(level)}` : "The Lantern Siege"}</p>
          <h2 id="game-title">Paused</h2>
          <p>{game === "trial" ? "The sand has stopped. Take your time." : "The lanterns hang still until you return."}</p>
          <div className="game-actions">
            <button type="button" className="go" autoFocus onClick={() => pause(false)}>Resume</button>
            <button type="button" onClick={() => (game === "trial" ? startTrial() : startSiege())}>{game === "trial" ? "Restart this trial" : "Start over"}</button>
            <button type="button" onClick={() => openMenu(game)}>Back to games</button>
            <button type="button" onClick={quit}>Leave</button>
          </div>
        </div>
      )}

      {phase === "menu" && (
        <div className="game-card wide" role="dialog" aria-modal="true" aria-labelledby="game-title">
          <p className="game-kicker">Dragon games</p>
          <h2 id="game-title">Choose your trial</h2>
          <div className="game-pick">
            <button type="button" className="pick jade" autoFocus onClick={() => pick("trial")}>
              <span className="pick-name">The Dragon&rsquo;s Trial</span>
              <span className="pick-who">Fly Dravoxus</span>
              <span className="pick-what">Burn every lantern before the sand runs out. Each trial is harder, with less sand.</span>
              <span className="pick-rec">{best > 0 ? `Best: Trial ${roman(best)} · ${bestScore} points` : "Not played yet"}</span>
            </button>
            <button type="button" className="pick ember" onClick={() => pick("siege")}>
              <span className="pick-name">The Lantern Siege</span>
              <span className="pick-who">Fly Balerian</span>
              <span className="pick-what">Lanterns rise from the streets below. Burn them before they escape, or Balerian is wounded.</span>
              <span className="pick-rec">{siegeBest.score > 0 || siegeBest.time > 0 ? `Best: ${siegeBest.score} points · ${clock(siegeBest.time)}` : "Not played yet"}</span>
            </button>
          </div>
          <div className="game-actions">
            <button type="button" onClick={quit}>Not now</button>
          </div>
        </div>
      )}

      {phase === "intro" && game === "trial" && (
        <div className="game-card" role="dialog" aria-modal="true" aria-labelledby="game-title">
          <p className="game-kicker">Dravoxus · trials</p>
          <h2 id="game-title">The Dragon&rsquo;s Trial</h2>
          <ul>
            <li>Burn every lantern before the sand runs out. Stone walls block your fire, so find the open side.</li>
            <li>The dragon follows your pointer. Click or hold to breathe fire. On a phone, drag to steer and hold to breathe.</li>
            <li>Your fire runs out if you breathe too long. Let it cool and it lights again.</li>
            <li>Clearing a trial scores 100 points (more on harder tiers), and {BONUS} more with half the sand still left.</li>
            <li>Each trial brings less sand: 45 seconds at first, 30 by Trial XX, 20 by Trial XXX, never under 18.</li>
          </ul>
          {best > 0 && <p className="game-best">Best: Trial {roman(best)} · best score {bestScore}</p>}
          <div className="game-actions">
            <button type="button" className="go" autoFocus onClick={() => brief(1, true)}>Begin Trial I</button>
            {best > 0 && <button type="button" onClick={() => brief(best + 1, true)}>Continue at Trial {roman(best + 1)}</button>}
            <button type="button" onClick={() => openMenu("trial")}>Back</button>
          </div>
        </div>
      )}

      {phase === "intro" && game === "siege" && (
        <div className="game-card" role="dialog" aria-modal="true" aria-labelledby="game-title">
          <p className="game-kicker">Balerian · survival</p>
          <h2 id="game-title">The Lantern Siege</h2>
          <ul>
            <li>Lanterns rise from the streets below. Burn them before they escape off the top of the screen.</li>
            <li>Each lantern that escapes wounds Balerian: 10 health, or 15 for a great lantern. At 0 the siege is lost.</li>
            <li>Lanterns score 10 points, great lanterns 20. Great lanterns are big and slow, and take more fire.</li>
            <li>Jade lanterns heal Balerian by 10. Burn them when you see them.</li>
            <li>It starts gently and grows harder: more lanterns, faster winds, great lanterns from 0:50.</li>
            <li>Medals for holding out: bronze at 1:00, silver at 2:00, gold at 3:00, jade at 5:00.</li>
            <li>Steer with your pointer, hold to breathe fire. Your fire runs out if you breathe too long.</li>
          </ul>
          {(siegeBest.score > 0 || siegeBest.time > 0) && <p className="game-best">Best: {siegeBest.score} points · survived {clock(siegeBest.time)}</p>}
          <div className="game-actions">
            <button type="button" className="go" autoFocus onClick={startSiege}>Begin the siege</button>
            <button type="button" onClick={() => openMenu("siege")}>Back</button>
          </div>
        </div>
      )}

      {phase === "brief" && (() => {
        const plan = trialPlan(level, fitCap(window.innerWidth, window.innerHeight)), rec = levelRecs[level];
        return (
          <div className="game-card" role="dialog" aria-modal="true" aria-labelledby="game-title">
            <p className="game-kicker">{plan.name} tier · trial stats</p>
            <h2 id="game-title">Trial {roman(level)}</h2>
            <dl className="game-stats">
              <div><dt>Sand</dt><dd>{plan.time} s</dd></div>
              <div><dt>Lanterns</dt><dd>{plan.lanterns}</dd></div>
              <div><dt>Drifting</dt><dd>{plan.moving}</dd></div>
              <div><dt>Iron-banded</dt><dd>{plan.iron}</dd></div>
              <div><dt>Stone walls</dt><dd>up to {plan.walls}</dd></div>
              <div><dt>Reward</dt><dd>{plan.base} <small>+{BONUS}</small></dd></div>
            </dl>
            <p className="game-note">The +{BONUS} bonus is yours if you finish with at least half the sand left (before the gold mark).</p>
            <p className="game-best">{rec ? `Your record here: cleared ${rec.clears} ${rec.clears === 1 ? "time" : "times"}, best ${rec.left} s to spare, fastest ${rec.fast.toFixed(1)} s.` : "You have not cleared this trial yet."}</p>
            {!newRunRef.current && (run.score > 0 || run.burned > 0) && <p className="game-note">This run so far: {run.score} points · {run.burned} lanterns burned.</p>}
            <div className="game-actions">
              <button type="button" className="go" autoFocus onClick={startTrial}>Begin Trial {roman(level)}</button>
              <button type="button" onClick={() => openMenu("trial")}>Back to games</button>
              <button type="button" onClick={quit}>Leave</button>
            </div>
          </div>
        );
      })()}

      {phase === "won" && (
        <div className="game-card" role="dialog" aria-modal="true" aria-labelledby="game-title">
          <p className="game-kicker">All {result.total} lanterns burned in {result.time.toFixed(1)} s</p>
          <h2 id="game-title">Trial {roman(level)} conquered</h2>
          <p className="game-points"><b>+{result.base + result.bonus}</b> <span>{result.base} for the trial{result.bonus ? `, +${result.bonus} bonus for finishing with half the sand left` : ""}</span></p>
          <dl className="game-stats">
            <div><dt>Score</dt><dd>{result.score}</dd></div>
            <div><dt>Burned this run</dt><dd>{result.burned}</dd></div>
            <div><dt>Sand to spare</dt><dd>{result.spare} s</dd></div>
          </dl>
          {result.best && <p className="game-best">A new best score.</p>}
          <div className="game-actions">
            <button type="button" className="go" autoFocus onClick={() => brief(level + 1)}>Onward to Trial {roman(level + 1)}</button>
            <button type="button" onClick={() => openMenu("trial")}>Back to games</button>
            <button type="button" onClick={quit}>Rest here</button>
          </div>
        </div>
      )}

      {phase === "lost" && result.kind === "trial" && (
        <div className="game-card" role="dialog" aria-modal="true" aria-labelledby="game-title">
          <p className="game-kicker">{result.done} of {result.total} lanterns burned</p>
          <h2 id="game-title">The sand ran out</h2>
          <p>Get close, face the open side, and hold to keep the flame on the iron-banded ones. Let your fire cool between lanterns.</p>
          <dl className="game-stats">
            <div><dt>Score</dt><dd>{result.score}</dd></div>
            <div><dt>Burned this run</dt><dd>{result.burned}</dd></div>
          </dl>
          <div className="game-actions">
            <button type="button" className="go" autoFocus onClick={startTrial}>Try Trial {roman(level)} again</button>
            <button type="button" onClick={() => brief(level)}>See its stats</button>
            <button type="button" onClick={() => openMenu("trial")}>Back to games</button>
            <button type="button" onClick={quit}>Leave</button>
          </div>
        </div>
      )}

      {phase === "lost" && result.kind === "siege" && (
        <div className="game-card" role="dialog" aria-modal="true" aria-labelledby="game-title">
          <p className="game-kicker">Survived {clock(result.time)}{medal(result.time) ? ` · ${medal(result.time)} medal` : ""}</p>
          <h2 id="game-title">Balerian has fallen</h2>
          {nextMedal(result.time) && <p className="game-note">{clock(nextMedal(result.time)![0] - result.time)} more and you would have earned the {nextMedal(result.time)![1]} medal.</p>}
          <dl className="game-stats">
            <div><dt>Score</dt><dd>{result.score}</dd></div>
            <div><dt>Lanterns</dt><dd>{result.plain}</dd></div>
            <div><dt>Great lanterns</dt><dd>{result.great}</dd></div>
            <div><dt>Jade lanterns</dt><dd>{result.jade}</dd></div>
            <div><dt>Escaped</dt><dd>{result.escaped}</dd></div>
            <div><dt>Survived</dt><dd>{clock(result.time)}</dd></div>
          </dl>
          <p className="game-best">{result.best ? "A new best score." : `Best: ${siegeBest.score} points · survived ${clock(siegeBest.time)}`}</p>
          <div className="game-actions">
            <button type="button" className="go" autoFocus onClick={startSiege}>Start over</button>
            <button type="button" onClick={() => openMenu("siege")}>Back to games</button>
            <button type="button" onClick={quit}>Leave</button>
          </div>
        </div>
      )}
    </>
  );
}
