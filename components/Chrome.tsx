"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sections, site } from "../lib/site";
import Logo from "./Logo";
import { checkIn, savedKey } from "./whereabouts";

// shared page bits: toast, copy email, header progress bar, command palette

export function toast(message: string) {
  window.dispatchEvent(new CustomEvent("toast", { detail: message }));
}

export async function copyEmail() {
  try {
    await navigator.clipboard.writeText(site.email);
    toast(`Copied ${site.email}`);
  } catch {
    window.location.href = `mailto:${site.email}`;
  }
}

export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: number;
    const on = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail);
      clearTimeout(t);
      t = window.setTimeout(() => setMsg(null), 2200);
    };
    window.addEventListener("toast", on);
    return () => window.removeEventListener("toast", on);
  }, []);
  return (
    <div className={`toast ${msg ? "on" : ""}`} role="status" aria-live="polite">
      {msg}
    </div>
  );
}

export function CopyEmailButton({ className = "btn" }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={copyEmail}>
      Copy email
    </button>
  );
}

export function Header() {
  const [active, setActive] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [mac, setMac] = useState(true);

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  return (
    <header className="top">
      <div className="progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
      <div className="top-inner wrap">
        <a className="mark" href="#top" aria-label="Ansh Rajput, back to top">
          <Logo />
          Ansh Rajput
        </a>
        <nav aria-label="Main">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className={active === s.id ? "on" : ""} aria-current={active === s.id ? "true" : undefined}>
              {s.label}
            </a>
          ))}
          <a href="/resume">Resume</a>
        </nav>
        <button type="button" className="kbd-btn" onClick={() => window.dispatchEvent(new Event("open-palette"))} aria-label="Open command menu">
          <kbd>{mac ? "⌘" : "Ctrl"}</kbd>
          <kbd>K</kbd>
        </button>
        <button type="button" className="menu-btn" onClick={() => window.dispatchEvent(new Event("open-palette"))}>
          Menu
        </button>
      </div>
    </header>
  );
}

type Action = { id: string; label: string; hint: string; run: () => void };

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<Element | null>(null);

  const go = (id: string) => () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const actions: Action[] = useMemo(
    () => [
      { id: "work", label: "Go to selected work", hint: "Section", run: go("work") },
      { id: "ucert", label: "UCert: try the gap analysis", hint: "Case study", run: go("ucert") },
      { id: "certcanada", label: "CertCanada: see what Bing sees", hint: "Case study", run: go("certcanada") },
      { id: "twish", label: "Twish Care: send a test inquiry", hint: "Case study", run: go("twish") },
      { id: "projects", label: "Go to more projects", hint: "Section", run: go("projects") },
      { id: "about", label: "About me", hint: "Section", run: go("about") },
      { id: "contact", label: "Send me a message", hint: "Section", run: go("contact") },
      { id: "copy", label: "Copy my email address", hint: "Action", run: copyEmail },
      { id: "resume", label: "Open resume", hint: "Page", run: () => (window.location.href = "/resume") },
      { id: "gh", label: "Open GitHub", hint: "Link", run: () => window.open(site.github, "_blank") },
      { id: "li", label: "Open LinkedIn", hint: "Link", run: () => window.open(site.linkedin, "_blank") },
    ],
    [],
  );
  // matches at the start of a word rank first, so "res" finds resume before address
  const term = q.toLowerCase().trim();
  const score = (label: string) => {
    const l = label.toLowerCase();
    if (!term) return 1;
    if (l.split(/[^a-z0-9]+/).some((w) => w.startsWith(term))) return 2;
    return l.includes(term) ? 1 : 0;
  };
  const list = actions
    .map((a, idx) => ({ a, s: score(a.label), idx }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s || x.idx - y.idx)
    .map((x) => x.a);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        opener.current = document.activeElement;
        setOpen((o) => !o);
      }
    };
    const onOpen = () => {
      opener.current = document.activeElement;
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setI(0);
      setTimeout(() => input.current?.focus(), 10);
    } else if (opener.current instanceof HTMLElement) {
      opener.current.focus();
    }
  }, [open]);

  if (!open) return null;

  const choose = (a?: Action) => {
    if (!a) return;
    setOpen(false);
    setTimeout(a.run, 30);
  };

  return (
    <div className="palette-wrap" onMouseDown={() => setOpen(false)}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command menu" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={input}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setI(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setI((x) => Math.min(x + 1, list.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setI((x) => Math.max(x - 1, 0)); }
            if (e.key === "Enter") choose(list[i]);
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Where to? Try “resume” or “email”"
          aria-label="Search commands"
          aria-controls="palette-list"
          aria-activedescendant={list[i] ? `cmd-${list[i].id}` : undefined}
        />
        <ul id="palette-list" role="listbox">
          {list.length === 0 && <li className="empty">No match. Try “contact”.</li>}
          {list.map((a, idx) => (
            <li
              key={a.id}
              id={`cmd-${a.id}`}
              role="option"
              aria-selected={idx === i}
              className={idx === i ? "on" : ""}
              onMouseEnter={() => setI(idx)}
              onClick={() => choose(a)}
            >
              <span>{a.label}</span>
              <span className="hint">{a.hint}</span>
            </li>
          ))}
        </ul>
        <p className="palette-foot">↑↓ to move · Enter to open · Esc to close</p>
      </div>
    </div>
  );
}

export function KeyHint() {
  const [mac, setMac] = useState(true);
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform)), []);
  return (
    <span className="hint-k">
      or press <kbd>{mac ? "⌘" : "Ctrl"}</kbd> <kbd>K</kbd>
    </span>
  );
}

export function LocalTime() {
  // shows Edmonton until my laptop has checked in (see app/api/whereabouts)
  const [place, setPlace] = useState({ city: site.location.split(",")[0], timeZone: site.timeZone });
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    let alive = true;
    fetch("/api/whereabouts")
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (alive && p?.city && p?.timeZone) setPlace({ city: p.city, timeZone: p.timeZone });
      })
      .catch(() => {});
    // on my own browser (key saved at /checkin) send my location, at most every 30 min
    const key = savedKey();
    if (key) {
      checkIn(key).then((r) => {
        if (alive && r.ok) setPlace({ city: r.city, timeZone: r.timeZone });
      });
    }
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    const fmt = () => {
      try {
        return new Date().toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit", timeZone: place.timeZone });
      } catch {
        return "";
      }
    };
    setNow(fmt());
    const id = setInterval(() => setNow(fmt()), 30000);
    return () => clearInterval(id);
  }, [place.timeZone]);
  return <span suppressHydrationWarning>{now ? `It's ${now} in ${place.city}` : site.location}</span>;
}
