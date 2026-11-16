"use client";

// the arcade: browser remakes of my 5 Unreal Engine games
import { useCallback, useEffect, useRef, useState } from "react";
import { W, H, type Game, type Input } from "./arcade/core";
import { Tanks, LEVELS as TANK_LEVELS } from "./arcade/tanks";
import { Obstacle, LEVELS as OBSTACLE_LEVELS } from "./arcade/obstacle";
import { Crypt, LEVELS as CRYPT_LEVELS } from "./arcade/crypt";
import { Shooter, LEVELS as SHOOTER_LEVELS } from "./arcade/shooter";
import { Warehouse, LEVELS as WAREHOUSE_LEVELS } from "./arcade/warehouse";
import { sfx } from "./arcade/sfx";
import TouchPad, { type Kind } from "./arcade/TouchPad";
import "./arcade.css";

type Pad = Kind;
type Meta = {
  id: string; name: string; kind: string; make: (level: number) => Game; levels: string[]; repo: string; from: string;
  pitch: string; keys: string[]; touch: string[]; pad: Pad; axis?: "x"; a: string; toggleA?: boolean; ported: string;
};
const GAMES: Meta[] = [
  {
    id: "tanks", name: "Toon Tanks", kind: "Arcade shooter", make: (l) => new Tanks(l), levels: TANK_LEVELS.map((x) => x.name), repo: "https://github.com/rajputansh09/Toon_Tanks",
    from: "ATank · ATower · UHealthComponent · AProjectile", pitch: "Drive a cartoon tank through an arena of turret towers and knock out every one.",
    keys: ["W S drive, A D turn", "The mouse aims the turret", "Click to fire"], touch: ["Left thumb: point where to drive", "Hold Fire: the turret locks on for you", "Drag from Fire to aim yourself"], pad: "twin", a: "Fire",
    ported: "Same numbers as the C++: 100 health, 20 damage a shell, towers track you only inside 300 range and fire every 2 s, and a 3 s start delay.",
  },
  {
    id: "obstacle", name: "Obstacle Assault", kind: "Platformer", make: (l) => new Obstacle(l), levels: OBSTACLE_LEVELS.map((x) => x.name), repo: "https://github.com/rajputansh09/Obstacle_Assault",
    from: "AMoving_Platform", pitch: "Run, jump and time every move past moving platforms and spinning hammers to reach the castle.",
    keys: ["A D or arrows to run", "Space, W or click to jump", "Hold jump for a higher one"], touch: ["Left thumb slides to run", "Hold Jump for a higher one"], pad: "button", axis: "x", a: "Jump",
    ported: "Platforms use the original MovePlatform logic: move until MoveDistance, step the start point forward and reverse, so they never drift.",
  },
  {
    id: "crypt", name: "Crypt Raider", kind: "Dungeon puzzle", make: (l) => new Crypt(l), levels: CRYPT_LEVELS.map((x) => x.name), repo: "https://github.com/rajputansh09/Crypt_Raider",
    from: "UGrabber · UMover · UTrigger_Component", pitch: "Solve the pressure-plate gates, cross the spikes and escape the crypt with the golden statue.",
    keys: ["WASD to walk", "The mouse turns you", "Hold click or Space to grab, let go to drop"], touch: ["Left thumb walks", "Tap Grab to pick up, tap again to drop"], pad: "button", a: "Grab", toggleA: true,
    ported: "Grabbing is a sphere sweep out to MaxGrabDistance; plates only accept their tagged object when it is not being held, and gates slide at constant speed.",
  },
  {
    id: "shooter", name: "Simple Shooter", kind: "Robo Rampage", make: (l) => new Shooter(l), levels: SHOOTER_LEVELS.map((x) => x.name), repo: "https://github.com/rajputansh09/Simple_Shooter",
    from: "AGun · AShooterAIController · BTService · KillEmAllGameMode", pitch: "A combat robot in a frozen lab overrun by hostile bots. Clear them all.",
    keys: ["WASD to move", "The mouse aims", "Click or hold to fire"], touch: ["Left thumb moves", "Hold Fire: your gun locks on for you", "Drag from Fire to aim yourself"], pad: "twin", a: "Fire",
    ported: "Line-trace gun, 10 damage, 100 health. Bots chase while they see you, search where they last saw you, then walk back to their start, pathing around walls.",
  },
  {
    id: "warehouse", name: "Warehouse Wreckage", kind: "Physics sandbox", make: (l) => new Warehouse(l), levels: WAREHOUSE_LEVELS.map((x) => x.name), repo: "https://github.com/rajputansh09/Warehouse_Wreckage",
    from: "UE5 Chaos physics · Blueprints", pitch: "Heavy balls, a warehouse of crates, barrels and red explosives. Wreck as much as you can.",
    keys: ["The mouse aims", "Hold click or Space to power up", "Let go to throw"], touch: ["Drag up or down on the left to aim", "Hold Throw to power up, let go to throw"], pad: "aim", a: "Throw",
    ported: "The original runs on Unreal's Chaos physics. Here a small 2D physics engine stands in: stacking, friction, impact damage and explosions.",
  },
];

type Mode = "ready" | "play" | "paused" | "over";
type Progress = Record<string, { stars: number[]; best: number[] }>;
const SAVE = "arcade-progress";
const OLD_BEST = "arcade-best";
const blankInput = (): Input => ({ ax: 0, ay: 0, aimX: 0, aimY: 0, aimed: false, fire: false, firePressed: false, alt: false, altPressed: false, touch: false, bx: 0, by: 0 });

function loadProgress(): Progress {
  try {
    const p = JSON.parse(localStorage.getItem(SAVE) || "{}") as Progress;
    // carry an old best score from the single level version over as a level 1 clear
    const old = JSON.parse(localStorage.getItem(OLD_BEST) || "{}") as Record<string, number>;
    for (const [id, sc] of Object.entries(old)) if (sc > 0 && !p[id]) p[id] = { stars: [1, 0, 0], best: [sc, 0, 0] };
    return p && typeof p === "object" ? p : {};
  } catch {
    return {};
  }
}

const Star = ({ on, delay = 0 }: { on: boolean; delay?: number }) => (
  <svg className={`arc-star${on ? " on" : ""}`} viewBox="0 0 24 24" aria-hidden="true" style={{ animationDelay: `${delay}ms` }}>
    <path d="M12 2.8l2.7 5.9 6.4.7-4.8 4.3 1.4 6.3L12 16.8 6.3 20l1.4-6.3L2.9 9.4l6.4-.7z" />
  </svg>
);

export default function Arcade() {
  const [idx, setIdx] = useState(0);
  const [level, setLevel] = useState(0);
  const [mode, setMode] = useState<Mode>("ready");
  const [hud, setHud] = useState<{ label: string; value: string }[]>([]);
  const [result, setResult] = useState({ won: false, text: "", best: false, stars: [false, false, false], goals: ["", "", ""] as string[] });
  const [progress, setProgress] = useState<Progress>({});
  const [coarse, setCoarse] = useState(false);
  const [full, setFull] = useState(false);
  const [muted, setMuted] = useState(false);
  const [grabOn, setGrabOn] = useState(false);
  const cab = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const game = useRef<Game | null>(null);
  const modeRef = useRef<Mode>("ready");
  const keys = useRef(new Set<string>());
  const ptr = useRef({ x: W / 2, y: H / 2, down: false, aimed: false });
  const stick = useRef({ x: 0, y: 0, id: -1, cx: 0, cy: 0 });
  const stick2 = useRef({ x: 0, y: 0, id: -1, cx: 0, cy: 0 });
  const drag = useRef(0);
  const btn = useRef({ a: false, b: false });
  const meta = GAMES[idx];
  const prog = progress[meta.id] ?? { stars: [0, 0, 0], best: [0, 0, 0] };
  const unlocked = (k: number) => k === 0 || (prog.stars[k - 1] ?? 0) > 0;

  const go = (m: Mode) => { modeRef.current = m; setMode(m); };

  useEffect(() => {
    setProgress(loadProgress());
    setMuted(sfx.isMuted());
    sfx.listen();
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
    // play links elsewhere on the page pick a game and scroll the arcade into view
    const pick = (e: Event) => {
      const k = GAMES.findIndex((g) => g.id === (e as CustomEvent<string>).detail);
      if (k < 0) return;
      setIdx(k);
      cab.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    window.addEventListener("arcade:pick", pick);
    // test hook for the Playwright bots, only with ?dragon-debug in the URL
    if (location.search.includes("dragon-debug")) (window as unknown as { __arcade: unknown }).__arcade = { game: () => game.current };
    return () => window.removeEventListener("arcade:pick", pick);
  }, []);

  const paint = useCallback(() => {
    const c = cv.current, g = game.current;
    if (!c || !g) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    // cap at about 3 million pixels so full screen on a Retina laptop stays sharp and smooth
    const cw = c.clientWidth || W, dpr = Math.min(2, window.devicePixelRatio || 1, Math.max(1, Math.sqrt(3e6 / (cw * cw * H / W))));
    const pw = Math.round(cw * dpr), ph = Math.round((cw * H / W) * dpr);
    if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
    ctx.setTransform(pw / W, 0, 0, ph / H, 0, 0);
    try {
      g.draw(ctx, performance.now() / 1000);
    } catch (err) {
      // don't let a drawing bug take the whole page down
      console.error("arcade: draw failed", err);
    }
  }, []);

  // new game or level picked: build it and draw its first frame behind the title card
  useEffect(() => {
    if (!unlocked(level)) { setLevel(0); return; }
    game.current = GAMES[idx].make(level);
    go("ready");
    setHud(game.current.hud());
    paint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, level, paint]);
  // switching games starts at the first level you haven't cleared
  const pickGame = (i: number) => {
    sfx.play("click");
    const p = progress[GAMES[i].id];
    const next = p ? Math.min(2, p.stars.findIndex((s) => !s) < 0 ? 2 : p.stars.findIndex((s) => !s)) : 0;
    setIdx(i); setLevel(next);
  };

  // full screen: fixed layer over the page, plus real full screen where the browser supports it
  const enterFull = useCallback(() => {
    setFull(true);
    const el = screen.current as (HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> }) | null;
    try {
      const req = el?.requestFullscreen?.bind(el) ?? el?.webkitRequestFullscreen?.bind(el);
      const p = req?.();
      if (p && typeof p.then === "function") {
        p.then(() => {
          const o = (window.screen as Screen & { orientation?: { lock?: (o: string) => Promise<void> } }).orientation;
          if (coarse && o?.lock) o.lock("landscape").catch(() => {});
        }).catch(() => {});
      }
    } catch {
      // the fixed layer is enough (iPhone Safari has no element full screen)
    }
  }, [coarse]);
  const exitFull = useCallback(() => {
    setFull(false);
    if (modeRef.current === "play") go("paused");
    try { if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); } catch { /* already out */ }
  }, []);
  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement && full && !coarse) exitFull(); };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [full, coarse, exitFull]);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("arcade-open", full);
    return () => root.classList.remove("arcade-open");
  }, [full]);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("arcade-playing", mode === "play");
    return () => root.classList.remove("arcade-playing");
  }, [mode]);

  // in full screen, fit the 16:9 canvas into whatever space is left
  useEffect(() => {
    const s = stage.current, c = cv.current;
    if (!s || !c) return;
    const fit = () => {
      if (!full) { c.style.width = ""; c.style.height = ""; paint(); return; }
      const r = s.getBoundingClientRect();
      const w = Math.min(r.width, (r.height * W) / H);
      c.style.width = `${Math.floor(w)}px`; c.style.height = `${Math.floor((w * H) / W)}px`;
      // bottom of the game, so the portrait touch controls can sit below it
      s.style.setProperty("--cv-b", `${c.offsetTop + c.offsetHeight}px`);
      paint();
    };
    fit();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(fit);
    ro.observe(s);
    return () => ro.disconnect();
  }, [full, paint]);

  const start = (lv = level) => {
    sfx.start();
    sfx.play("click");
    if (lv !== level) setLevel(lv);
    game.current = GAMES[idx].make(lv);
    keys.current.clear();
    ptr.current.down = false;
    btn.current = { a: false, b: false };
    setGrabOn(false);
    stick.current = { x: 0, y: 0, id: -1, cx: 0, cy: 0 };
    stick2.current = { x: 0, y: 0, id: -1, cx: 0, cy: 0 };
    drag.current = 0;
    if (coarse && !full) enterFull();
    go("play");
    cv.current?.focus({ preventScroll: true });
  };

  // loop only runs while playing
  useEffect(() => {
    if (mode !== "play") return;
    let raf = 0, last = 0, acc = 0, prevFire = false, prevAlt = false, hudAt = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const g = game.current;
      if (!g) return;
      acc += Math.min(0.1, last ? (now - last) / 1000 : 1 / 60);
      last = now;
      const k = keys.current, s = stick.current, s2 = stick2.current;
      const up = k.has("KeyW") || k.has("ArrowUp");
      let ax = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);
      let ay = (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0) - (up && !g.upFires ? 1 : 0);
      const touch = s.id !== -1 || s2.id !== -1 || btn.current.a || btn.current.b;
      if (s.id !== -1) { ax = s.x; ay = s.y; }
      const fire = ptr.current.down || k.has("Space") || k.has("KeyJ") || (!!g.upFires && up) || btn.current.a;
      const alt = k.has("KeyE") || k.has("KeyK") || btn.current.b;
      let first = true;
      try {
        while (acc >= 1 / 60) {
          acc -= 1 / 60;
          const inp: Input = {
            ax, ay, aimX: ptr.current.x, aimY: ptr.current.y, aimed: ptr.current.aimed && !touch,
            fire, firePressed: first && fire && !prevFire, alt, altPressed: first && alt && !prevAlt, touch,
            bx: s2.id !== -1 ? s2.x : 0, by: s2.id !== -1 ? s2.y : 0,
            drag: first ? drag.current : 0, assist: coarse,
          };
          g.step(1 / 60, inp);
          first = false;
        }
      } catch (err) {
        console.error("arcade: step failed", err);
        cancelAnimationFrame(raf);
        go("paused");
        return;
      }
      // clear presses only after a step used them
      if (!first) { prevFire = fire; prevAlt = alt; drag.current = 0; }
      paint();
      if (now - hudAt > 120) { hudAt = now; setHud(g.hud()); }
      if (g.state !== "play") {
        // let the last explosion play out before showing the result
        cancelAnimationFrame(raf);
        const end = performance.now();
        const tail = (n: number) => {
          if (modeRef.current !== "play") return;
          try { g.step(1 / 60, blankInput()); } catch { /* still show the result */ }
          paint();
          if (n - end < 1100) raf = requestAnimationFrame(tail);
          else finish(g);
        };
        raf = requestAnimationFrame(tail);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, paint]);

  const finish = (g: Game) => {
    const won = g.state === "won", sc = g.score(), id = GAMES[idx].id, stars = g.stars();
    const got = stars.filter(Boolean).length;
    const cur = progress[id] ?? { stars: [0, 0, 0], best: [0, 0, 0] };
    const isBest = won && sc > (cur.best[level] ?? 0);
    const next: Progress = {
      ...progress,
      [id]: {
        stars: cur.stars.map((s, k) => (k === level ? Math.max(s, got) : s)),
        best: cur.best.map((b, k) => (k === level && isBest ? sc : b)),
      },
    };
    setProgress(next);
    try { localStorage.setItem(SAVE, JSON.stringify(next)); } catch { /* progress just won't save */ }
    setHud(g.hud());
    setResult({ won, text: g.result(), best: isBest, stars, goals: g.goals() });
    go("over");
    // one chime per star
    stars.forEach((s, k) => { if (s) setTimeout(() => sfx.play("star"), 350 + k * 280); });
  };

  // only grab keys while a game is running so the page still scrolls normally
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (modeRef.current === "play") {
        if (e.code === "Escape" || e.code === "KeyP") { e.preventDefault(); go("paused"); return; }
        if (e.code === "KeyM") { const m = !sfx.isMuted(); sfx.setMuted(m); setMuted(m); return; }
        if (/^(Arrow|Space|Key[WASDJEK])/.test(e.code)) e.preventDefault();
        keys.current.add(e.code);
      } else if (modeRef.current === "paused" && (e.code === "Escape" || e.code === "KeyP")) { e.preventDefault(); go("play"); }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const hide = () => { if (document.hidden && modeRef.current === "play") go("paused"); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    document.addEventListener("visibilitychange", hide);
    // pause if you scroll away mid game
    const io = new IntersectionObserver(([en]) => { if (!en.isIntersecting && modeRef.current === "play") go("paused"); }, { threshold: 0.25 });
    if (screen.current) io.observe(screen.current);
    const rs = () => paint();
    window.addEventListener("resize", rs);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("resize", rs);
      io.disconnect();
    };
  }, [paint]);

  const toGame = (e: React.PointerEvent) => {
    const c = cv.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    ptr.current.x = ((e.clientX - r.left) / r.width) * W;
    ptr.current.y = ((e.clientY - r.top) / r.height) * H;
    if (e.pointerType === "mouse" || e.pointerType === "pen") ptr.current.aimed = true;
  };

  const toggleMute = () => { sfx.start(); const m = !muted; sfx.setMuted(m); setMuted(m); if (!m) sfx.play("on"); };
  const nextLevel = level + 1 < meta.levels.length ? level + 1 : -1;
  const totalStars = prog.stars.reduce((a, b) => a + b, 0);

  return (
    <div className="arcade" ref={cab} onPointerDown={(e) => e.stopPropagation()}>
      <div className="arc-tabs" role="tablist" aria-label="Choose a game">
        {GAMES.map((g, i) => {
          const st = (progress[g.id]?.stars ?? [0, 0, 0]).reduce((a, b) => a + b, 0);
          return (
            <button key={g.id} type="button" role="tab" aria-selected={i === idx} className={`arc-tab${i === idx ? " on" : ""}`} onClick={() => pickGame(i)}>
              <span className="arc-tab-n">0{i + 1}{st > 0 && <span className="arc-tab-stars" aria-label={`${st} of 9 stars`}><Star on />{st}/9</span>}</span>
              <span className="arc-tab-name">{g.name}</span>
              <span className="arc-tab-kind">{g.kind}</span>
            </button>
          );
        })}
      </div>

      <div className={`arc-screen${full ? " arc-full" : ""}`} ref={screen}>
        <div className="arc-hud" aria-live="off">
          <b>{meta.name}<span className="arc-hud-lv">{meta.levels[level]}</span></b>
          {hud.filter((h) => h.label !== "Level").map((h) => (
            <span key={h.label}><i>{h.label}</i> {h.value}</span>
          ))}
          <span className="arc-tools">
            {mode === "play" && <button type="button" className="arc-mini" onClick={() => go("paused")}>Pause</button>}
            <button type="button" className="arc-mini" onClick={toggleMute} aria-pressed={!muted} aria-label={muted ? "Turn sound on" : "Turn sound off"}>
              {muted ? "Sound off" : "Sound on"}
            </button>
            {full ? (
              <button type="button" className="arc-mini arc-close" onClick={exitFull} aria-label="Leave full screen">Exit</button>
            ) : (
              <button type="button" className="arc-mini" onClick={enterFull} aria-label="Play in full screen">Full screen</button>
            )}
          </span>
        </div>
        <div className="arc-stage" ref={stage}>
          <canvas
            ref={cv}
            className="arc-canvas"
            tabIndex={0}
            aria-label={`${meta.name}, playable in the browser`}
            onPointerMove={toGame}
            onPointerDown={(e) => { if (modeRef.current !== "play") return; toGame(e); if (e.pointerType !== "touch") ptr.current.down = true; }}
            onPointerUp={() => { ptr.current.down = false; }}
            onPointerLeave={() => { ptr.current.down = false; }}
            onContextMenu={(e) => e.preventDefault()}
          />
          {mode === "ready" && (
            <div className="arc-card">
              <p className="arc-kicker">Unreal Engine 5 · C++ · rebuilt for the web</p>
              <h3>{meta.name}</h3>
              <p>{meta.pitch}</p>
              <ul className="arc-keys">
                {(coarse ? meta.touch : meta.keys).map((k) => <li key={k}>{k}</li>)}
              </ul>
              <div className="arc-levels" role="radiogroup" aria-label="Choose a level">
                {meta.levels.map((name, k) => {
                  const open = unlocked(k);
                  return (
                    <button
                      key={name}
                      type="button"
                      role="radio"
                      aria-checked={k === level}
                      className={`arc-level${k === level ? " on" : ""}`}
                      disabled={!open}
                      onClick={() => { sfx.play("click"); setLevel(k); }}
                    >
                      <span className="arc-level-n">Level {k + 1}</span>
                      <span className="arc-level-name">{open ? name : "Locked"}</span>
                      <span className="arc-level-stars" aria-label={`${prog.stars[k] ?? 0} of 3 stars`}>
                        {[0, 1, 2].map((s) => <Star key={s} on={s < (prog.stars[k] ?? 0)} />)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="arc-actions">
                <button type="button" className="btn btn-primary" onClick={() => start()}>Play level {level + 1}</button>
                {prog.best[level] ? <span className="arc-best">Best {prog.best[level]}</span> : null}
                {totalStars > 0 && <span className="arc-best">{totalStars} of 9 stars</span>}
              </div>
            </div>
          )}
          {mode === "paused" && (
            <div className="arc-card small">
              <h3>Paused</h3>
              <div className="arc-actions">
                <button type="button" className="btn btn-primary" onClick={() => { sfx.start(); if (coarse && !full) enterFull(); go("play"); cv.current?.focus({ preventScroll: true }); }}>Resume</button>
                <button type="button" className="btn" onClick={() => start()}>Restart</button>
                <button type="button" className="btn" onClick={() => { exitFull(); go("ready"); }}>Levels</button>
              </div>
            </div>
          )}
          {mode === "over" && (
            <div className="arc-card small">
              <p className={`arc-kicker ${result.won ? "win" : "lose"}`}>{result.won ? `Level ${level + 1} cleared` : "Game over"}</p>
              <div className="arc-stars-big" aria-label={`${result.stars.filter(Boolean).length} of 3 stars`}>
                {result.stars.map((s, k) => <Star key={k} on={s} delay={350 + k * 280} />)}
              </div>
              <ul className="arc-goals">
                {result.goals.map((g, k) => <li key={g} className={result.stars[k] ? "done" : ""}>{g}</li>)}
              </ul>
              <p>{result.text}</p>
              {result.best && <p className="arc-best">New best score in this browser.</p>}
              <div className="arc-actions">
                {result.won && nextLevel >= 0 ? (
                  <button type="button" className="btn btn-primary" onClick={() => start(nextLevel)}>Level {nextLevel + 1}: {meta.levels[nextLevel]}</button>
                ) : (
                  <button type="button" className="btn btn-primary" onClick={() => start()}>{result.won ? "Play again" : "Try again"}</button>
                )}
                {result.won && nextLevel >= 0 && <button type="button" className="btn" onClick={() => start()}>Replay</button>}
                {result.won && nextLevel < 0 && (
                  <button type="button" className="btn" onClick={() => { exitFull(); pickGame((idx + 1) % GAMES.length); }}>Next game: {GAMES[(idx + 1) % GAMES.length].name}</button>
                )}
                <button type="button" className="btn" onClick={() => { exitFull(); go("ready"); }}>Levels</button>
              </div>
            </div>
          )}
          {coarse && mode === "play" && (
            <TouchPad
              kind={meta.pad}
              axis={meta.axis}
              label={meta.a}
              toggle={meta.toggleA}
              toggled={grabOn}
              onToggle={setGrabOn}
              move={stick}
              aim={stick2}
              btn={btn}
              drag={drag}
              hint="Turn your phone sideways for a bigger screen."
            />
          )}
        </div>
      </div>

      <div className="arc-foot">
        <p><span className="arc-from">Ported from</span> <code>{meta.from}</code></p>
        <p className="muted">{meta.ported}</p>
        <a className="case-link" href={meta.repo} target="_blank" rel="noreferrer">Unreal source on GitHub ↗</a>
      </div>
    </div>
  );
}
