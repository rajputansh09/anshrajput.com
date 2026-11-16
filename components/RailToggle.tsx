"use client";

// on phones the dragon controls collapse into one corner button so they don't cover the text or games
import { useEffect, useState } from "react";

export default function RailToggle() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("rail-open", open);
    if (!open) return;
    const close = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (t?.closest(".rail-toggle")) return;
      // let the button's own click run first
      setTimeout(() => setOpen(false), t?.closest(".dragon-ui") ? 120 : 0);
    };
    document.addEventListener("pointerdown", close, true);
    return () => document.removeEventListener("pointerdown", close, true);
  }, [open]);
  useEffect(() => () => document.documentElement.classList.remove("rail-open"), []);
  return (
    <button type="button" className="rail-toggle" aria-expanded={open} aria-label={open ? "Hide the dragon controls" : "Show the dragon controls"} onClick={() => setOpen((o) => !o)}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 15c3-1 4-5 8-6 2-.5 4 0 6 2l2-1-1 3c-1 2-3 3-5 3l-2 3-1-3c-2 0-4 0-7-1z" />
        <circle cx="16" cy="11" r="0.6" />
      </svg>
      Dragons
    </button>
  );
}
