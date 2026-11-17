"use client";

import { useRef, useState } from "react";
import { copyEmail } from "./Chrome";
import { site } from "../lib/site";

const reasons = [
  { id: "coop", label: "Co-op or internship", prompt: "Tell me about the role, team, and term dates." },
  { id: "freelance", label: "Freelance project", prompt: "What are you building, and when do you need it?" },
  { id: "collab", label: "Collaboration", prompt: "What do you have in mind?" },
  { id: "hello", label: "Just saying hi", prompt: "Say hello. I read everything." },
];

type Errors = Partial<Record<"name" | "email" | "message", string>>;
const MAX = 2000;

function validate(v: { name: string; email: string; message: string }): Errors {
  const e: Errors = {};
  if (v.name.trim().length < 2) e.name = "Add your name so I know who to reply to.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) e.email = "That email doesn't look complete.";
  if (v.message.trim().length < 10) e.message = "A sentence or two helps me reply properly.";
  if (v.message.length > MAX) e.message = `Keep it under ${MAX} characters.`;
  return e;
}

export default function ContactForm() {
  const [reason, setReason] = useState(reasons[0]);
  const [v, setV] = useState({ name: "", email: "", company: "", message: "", website: "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error" | "offline" | "limited" | "invalid" | "badEmail" | "network">("idle");
  // when the form first showed up
  const shownAt = useRef(Date.now());
  const [ref, setRef] = useState("");

  const errors = validate(v);
  const show = (k: keyof Errors) => (touched[k] ? errors[k] : undefined);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV((s) => ({ ...s, [k]: e.target.value }));
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setTouched({ name: true, email: true, message: true });
    if (Object.keys(errors).length) return;
    setState("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...v, reason: reason.label, t: Date.now() - shownAt.current }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setRef(data.ref ?? "");
        setState("sent");
      } else if (res.status === 429) setState("limited");
      else if (res.status === 503) setState("offline");
      else if (res.status === 422) setState("badEmail");
      else if (res.status === 400) setState("invalid");
      else setState("error");
    } catch {
      setState("network");
    }
  };

  if (state === "sent") {
    return (
      <div className="form sent" role="status">
        <div className="check" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28">
            <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3>Message sent. Thanks, {v.name.split(" ")[0]}.</h3>
        <p>
          A confirmation is on its way to <b>{v.email}</b>, and I'll reply there.
          {ref && <> Reference: <code>{ref}</code></>}
        </p>
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            setV({ name: "", email: "", company: "", message: "", website: "" });
            setTouched({});
            setState("idle");
          }}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form
      className="form"
      onSubmit={submit}
      noValidate
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
      }}
    >
      <fieldset className="reasons">
        <legend>What's this about?</legend>
        <div className="chips">
          {reasons.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`chip ${reason.id === r.id ? "on" : ""}`}
              aria-pressed={reason.id === r.id}
              onClick={() => setReason(r)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="row2">
        <label className={`field ${show("name") ? "bad" : ""}`}>
          <span>Name</span>
          <input value={v.name} onChange={set("name")} onBlur={blur("name")} autoComplete="name" maxLength={80} aria-invalid={!!show("name")} />
          {show("name") && <em>{show("name")}</em>}
        </label>
        <label className={`field ${show("email") ? "bad" : ""}`}>
          <span>Email</span>
          <input type="email" value={v.email} onChange={set("email")} onBlur={blur("email")} autoComplete="email" maxLength={200} aria-invalid={!!show("email")} />
          {show("email") && <em>{show("email")}</em>}
        </label>
      </div>
      <label className="field">
        <span>
          Company or school <i>optional</i>
        </span>
        <input value={v.company} onChange={set("company")} autoComplete="organization" maxLength={120} />
      </label>
      <label className={`field ${show("message") ? "bad" : ""}`}>
        <span>Message</span>
        <textarea rows={5} value={v.message} onChange={set("message")} onBlur={blur("message")} placeholder={reason.prompt} aria-invalid={!!show("message")} />
        <span className={`count ${v.message.length > MAX ? "over" : ""}`}>
          {v.message.length} / {MAX}
        </span>
        {show("message") && <em>{show("message")}</em>}
      </label>

      {/* honeypot: hidden from people, bots fill it in */}
      <label className="hp" aria-hidden="true">
        Leave this empty
        <input tabIndex={-1} autoComplete="off" value={v.website} onChange={set("website")} />
      </label>

      <div className="form-foot">
        <button type="submit" className="btn btn-primary" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Send message"}
        </button>
        <span className="kbd-hint">
          or press <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Enter</kbd>
        </span>
      </div>

      <p className="form-status" aria-live="polite">
        {state === "error" && "Something went wrong on my side. Please try again, or email me directly."}
        {state === "invalid" && "Something in the form didn't pass the check. Make sure your email is complete and the message is 10 to 2,000 characters."}
        {state === "network" && "Couldn't reach the server. Check your connection and try again."}
        {state === "badEmail" && "That email address can't receive mail. Please check it, or use another one."}
        {state === "limited" && "You've sent a few messages already. Give it an hour, or email me directly."}
        {state === "offline" && (
          <>
            The form isn't connected yet. Email me at{" "}
            <button type="button" className="link-btn" onClick={copyEmail}>
              {site.email}
            </button>
            .
          </>
        )}
      </p>
      <p className="form-note">
        You'll get a short confirmation by email. Your details are used only to reply to you; see the{" "}
        <a href="/privacy">privacy page</a>.
      </p>
    </form>
  );
}
