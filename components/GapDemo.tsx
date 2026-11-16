"use client";

import { useEffect, useState } from "react";

// a 3-question sample of UCert's gap analysis, so visitors can feel how it works
const questions = [
  { clause: "4.3", topic: "Scope", q: "Is the scope of your quality management system written down?" },
  { clause: "5.2", topic: "Quality policy", q: "Is your quality policy communicated and understood by staff?" },
  { clause: "9.2", topic: "Internal audit", q: "Do you run internal audits on a planned schedule?" },
];
const options = [
  { label: "Yes", score: 1 },
  { label: "Partly", score: 0.5 },
  { label: "No", score: 0 },
];

export default function GapDemo() {
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1400);
    return () => clearTimeout(t);
  }, [saved]);

  const answered = answers.filter((a) => a !== null).length;
  const done = answered === questions.length;
  const score = Math.round((answers.reduce<number>((s, a) => s + (a ?? 0), 0) / questions.length) * 100);
  const progress = answered / questions.length;
  const C = 2 * Math.PI * 26;

  const pick = (qi: number, score: number) => {
    setAnswers((prev) => prev.map((a, i) => (i === qi ? score : a)));
    setSaved(true);
  };

  return (
    <div className="demo gap">
      <div className="demo-head">
        <p>Try it: a 3-question sample of the 73-question gap analysis</p>
        <span className={`saved ${saved ? "on" : ""}`} aria-live="polite">
          {saved ? "Saved" : ""}
        </span>
      </div>
      <div className="gap-body">
        <ol className="gap-qs">
          {questions.map((q, qi) => (
            <li key={q.clause}>
              <p className="gap-q">
                <span className="clause">Clause {q.clause}</span> {q.q}
              </p>
              <div className="seg" role="radiogroup" aria-label={`Clause ${q.clause}: ${q.topic}`}>
                {options.map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    role="radio"
                    aria-checked={answers[qi] === o.score}
                    className={answers[qi] === o.score ? "on" : ""}
                    onClick={() => pick(qi, o.score)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ol>
        <div className="gap-result">
          <svg viewBox="0 0 64 64" width="96" height="96" aria-hidden="true">
            <circle cx="32" cy="32" r="26" className="ring-bg" />
            <circle
              cx="32"
              cy="32"
              r="26"
              className="ring"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - (done ? score / 100 : progress))}
            />
          </svg>
          <p className="gap-num">{done ? `${score}%` : `${answered}/3`}</p>
          <p className="gap-label">{done ? "audit-ready on this sample" : "answered"}</p>
          {done && (
            <button type="button" className="link-btn" onClick={() => setAnswers([null, null, null])}>
              Start over
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
