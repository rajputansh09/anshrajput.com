"use client";

// small home page bits: game play buttons, the About terminal, contact tiles and the footer year
import { useEffect, useRef, useState } from "react";
import { copyEmail } from "./Chrome";
import { site } from "../lib/site";

// current year so the copyright never goes stale
export function Year() {
  const [y, setY] = useState(2026);
  useEffect(() => setY(new Date().getFullYear()), []);
  return <span suppressHydrationWarning>{y}</span>;
}

// sections below the fold rise in the first time you scroll to them
export function Reveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") return;
    const targets = Array.from(new Set(document.querySelectorAll<HTMLElement>("main .section > *, main .case, .foot")))
      .filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.92);
    const io = new IntersectionObserver((entries) => {
      let k = 0;
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        const el = en.target as HTMLElement;
        io.unobserve(el);
        el.style.setProperty("--rv-d", `${Math.min(k++, 4) * 90}ms`);
        el.classList.add("in");
        // remove the classes after so no transform is left over (the arcade's full screen layer needs that)
        const done = () => { el.classList.remove("rv", "in"); el.style.removeProperty("--rv-d"); };
        el.addEventListener("transitionend", done, { once: true });
        setTimeout(done, 1600);
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    for (const el of targets) { el.classList.add("rv"); io.observe(el); }
    return () => { io.disconnect(); for (const el of targets) el.classList.remove("rv", "in"); };
  }, []);
  return null;
}

// back to top button, shows up once you're far enough down
export function ToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setShow(window.scrollY > window.innerHeight * 1.2)); };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => { window.removeEventListener("scroll", on); cancelAnimationFrame(raf); };
  }, []);
  const up = () => {
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
    document.querySelector<HTMLElement>(".mark")?.focus({ preventScroll: true });
  };
  return (
    <button type="button" className={`to-top${show ? " on" : ""}`} onClick={up} aria-label="Back to top" tabIndex={show ? 0 : -1}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" /></svg>
    </button>
  );
}

export const pickGame = (id: string) => window.dispatchEvent(new CustomEvent("arcade:pick", { detail: id }));

export function PlayButton({ id, name }: { id: string; name: string }) {
  return (
    <button type="button" className="play-chip" onClick={() => pickGame(id)} aria-label={`Play ${name} in the browser`}>
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9l7-4.5z" fill="currentColor" /></svg>
      Play
    </button>
  );
}

// about terminal
type Line = { kind: "in" | "out" | "err"; text: string };
const COMMANDS: Record<string, string | (() => string)> = {
  help: "whoami · now · stack · games · play <game> · dragons · languages · principles · resume · contact · clear",
  whoami: "Ansh Rajput. BSc Computer Engineering, Software Engineering co-op, University of Alberta, class of 2028. Edmonton, Alberta.",
  now: "This term: CMPUT 379 Operating Systems, CMPUT 291 Databases, ECE 322 Software Testing, ECE 449 Intelligent Systems (a fuzzy-logic agent that flies a ship through an asteroid field), CMPUT 301 Android. Nights: this site.",
  stack: "TypeScript, Next.js, React, Node.js, Express, PostgreSQL, Supabase, C, C++, Python, Kotlin, Unreal Engine 5. Shipped on Vercel.",
  games: "Five Unreal Engine 5 games, all playable on this page. Try: play tanks, play obstacle, play crypt, play shooter, play warehouse.",
  dragons: "Dravoxus (green) and Balerian (red). Written from scratch on a 2D canvas: steering, collision, fire, duels and two games. Press Trials on the right edge, or tap Dragons on a phone.",
  languages: "English, Hindi and Punjabi. Learning Spanish: hola.",
  principles: "Make it feel right. Measure, don't guess. Own it end to end. Explain the why.",
  resume: () => { window.location.href = "/resume"; return "Opening the resume..."; },
  contact: () => { document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }); return "Taking you to the contact form."; },
  "sudo hire-me": () => { document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }); return "Permission granted. Taking you to the contact form."; },
  ls: "about.txt  games/  dragons/  resume.pdf",
  pwd: "/home/ansh/edmonton",
};
const SUGGEST = ["whoami", "now", "stack", "games", "dragons", "sudo hire-me"];

export function Terminal() {
  const [lines, setLines] = useState<Line[]>([{ kind: "out", text: "Welcome. Type help, or tap a command below." }]);
  const [val, setVal] = useState("");
  const [hist, setHist] = useState<string[]>([]);
  const [hi, setHi] = useState(-1);
  const body = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { body.current?.scrollTo({ top: body.current.scrollHeight }); }, [lines]);

  const run = (raw: string) => {
    const cmd = raw.trim().toLowerCase().replace(/\s+/g, " ");
    if (!cmd) return;
    setHist((h) => [...h, cmd]);
    setHi(-1);
    if (cmd === "clear") { setLines([]); return; }
    let out: Line;
    const play = cmd.match(/^play (tanks|obstacle|crypt|shooter|warehouse)$/);
    if (play) {
      pickGame(play[1]);
      out = { kind: "out", text: `Loading ${play[1]} in the arcade...` };
    } else if (cmd in COMMANDS) {
      const c = COMMANDS[cmd];
      out = { kind: "out", text: typeof c === "function" ? c() : c };
    } else out = { kind: "err", text: `command not found: ${cmd}. Try help.` };
    setLines((l) => [...l.slice(-30), { kind: "in", text: cmd }, out]);
  };

  return (
    <div className="term" onPointerDown={(e) => e.stopPropagation()} onClick={() => input.current?.focus({ preventScroll: true })}>
      <div className="term-bar" aria-hidden="true">
        <i /><i /><i />
        <span>ansh@edmonton: ~</span>
      </div>
      <div className="term-body" ref={body} aria-live="polite">
        {lines.map((l, k) => (
          <p key={k} className={`term-${l.kind}`}>
            {l.kind === "in" && <span className="term-ps">~ %</span>} {l.text}
          </p>
        ))}
        <form
          className="term-line"
          onSubmit={(e) => { e.preventDefault(); run(val); setVal(""); }}
        >
          <label className="term-ps" htmlFor="term-in">~ %</label>
          <input
            id="term-in"
            ref={input}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" && hist.length) { e.preventDefault(); const n = hi < 0 ? hist.length - 1 : Math.max(0, hi - 1); setHi(n); setVal(hist[n]); }
              if (e.key === "ArrowDown" && hi >= 0) { e.preventDefault(); const n = hi + 1; if (n >= hist.length) { setHi(-1); setVal(""); } else { setHi(n); setVal(hist[n]); } }
            }}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="Type a command"
          />
        </form>
      </div>
      <div className="term-chips">
        {SUGGEST.map((s) => (
          <button key={s} type="button" onClick={(e) => { e.stopPropagation(); run(s); }}>{s}</button>
        ))}
      </div>
    </div>
  );
}

// contact channels
const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>
);
export function Channels() {
  return (
    <ul className="channels">
      <li>
        <button type="button" className="channel" onClick={copyEmail}>
          <Icon d="M3 6.5h18v11H3zM3.5 7l8.5 6.5L20.5 7" />
          <span><b>Email</b><small>{site.email}</small></span>
          <em>Copy</em>
        </button>
      </li>
      <li>
        <a className="channel" href={site.linkedin} target="_blank" rel="noreferrer">
          <Icon d="M5 9.5v9M5 5.5v.5M9.5 18.5v-9M9.5 13c0-2 1.3-3.5 3.3-3.5s3.2 1.4 3.2 3.6v5.4" />
          <span><b>LinkedIn</b><small>rajputansh09</small></span>
          <em>↗</em>
        </a>
      </li>
      <li>
        <a className="channel" href={site.github} target="_blank" rel="noreferrer">
          <Icon d="M9 19c-4 1.3-4-2-6-2.5M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6 0C6.8 2.8 5.8 3.1 5.8 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4.4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
          <span><b>GitHub</b><small>rajputansh09</small></span>
          <em>↗</em>
        </a>
      </li>
      <li>
        <a className="channel" href="/resume">
          <Icon d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 15.5h6M9 9h2" />
          <span><b>Resume</b><small>One page, printable</small></span>
          <em>→</em>
        </a>
      </li>
    </ul>
  );
}
