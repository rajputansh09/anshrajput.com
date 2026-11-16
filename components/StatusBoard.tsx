"use client";

import { useCallback, useEffect, useState } from "react";

type Result = { id: string; up: boolean; status: number; ms: number | null };

const rows = [
  { id: "certcanada", name: "certcanada.ca", href: "https://certcanada.ca", what: "ISO consultancy platform", stack: "Next.js, Express, PostgreSQL" },
  { id: "twish", name: "twishcare.ca", href: "https://twishcare.ca", what: "Psychotherapy practice site", stack: "Node.js, Express" },
  { id: "ucert", name: "ucert", what: "ISO certification SaaS", stack: "Next.js, TypeScript, Supabase" },
];

export default function StatusBoard() {
  const [results, setResults] = useState<Record<string, Result>>({});
  const [checking, setChecking] = useState(true);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const run = useCallback(async () => {
    setChecking(true);
    setFailed(false);
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      const data = await res.json();
      const map: Record<string, Result> = {};
      for (const r of data.results as Result[]) map[r.id] = r;
      setResults(map);
      setCheckedAt(new Date(data.checkedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }));
    } catch {
      setFailed(true);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  const liveCount = rows.filter((r) => results[r.id]?.up).length;

  return (
    <section className="board" aria-label="Live status of sites I built">
      <div className="board-head">
        <span>
          <span className={`pulse ${checking ? "is-checking" : ""}`} aria-hidden="true" />
          Running now
        </span>
        <span className="board-meta" aria-live="polite">
          {checking
            ? "Pinging servers…"
            : failed
              ? "Check failed"
              : `${liveCount} live, 1 in development · checked ${checkedAt}`}
        </span>
        <button type="button" className="board-btn" onClick={run} disabled={checking}>
          {checking ? "Checking" : "Run check again"}
        </button>
      </div>
      <ul>
        {rows.map((row) => {
          const r = results[row.id];
          const isDev = row.id === "ucert";
          const state = isDev ? "dev" : checking && !r ? "wait" : r?.up ? "up" : "down";
          return (
            <li key={row.id} className={`board-row s-${state}`}>
              <span className="dot" aria-hidden="true" />
              <span className="board-name">
                {row.href ? (
                  <a href={row.href} target="_blank" rel="noreferrer">
                    {row.name}
                  </a>
                ) : (
                  row.name
                )}
              </span>
              <span className="board-what">{row.what}</span>
              <span className="board-stack">{row.stack}</span>
              <span className="board-state">
                {isDev
                  ? "In development"
                  : state === "wait"
                    ? "…"
                    : state === "up"
                      ? (r?.ms != null ? `Live · ${r.ms} ms` : "Live")
                      : "Unreachable"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
