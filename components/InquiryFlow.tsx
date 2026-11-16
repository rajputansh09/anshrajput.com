"use client";

import { useEffect, useRef, useState } from "react";

// shows the Twish contact pipeline: a person gets two emails sent; a bot is dropped by the honeypot
type Stage = "idle" | "sending" | "server" | "delivered" | "bot-sending" | "blocked";

export default function InquiryFlow() {
  const [stage, setStage] = useState<Stage>("idle");
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const play = (bot: boolean) => {
    timers.current.forEach(clearTimeout);
    const fast = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const step = fast ? 0 : 650;
    setStage(bot ? "bot-sending" : "sending");
    timers.current = [
      window.setTimeout(() => setStage(bot ? "blocked" : "server"), step),
      ...(bot ? [] : [window.setTimeout(() => setStage("delivered"), step * 2)]),
    ];
  };

  const lit = (s: Stage[]) => (s.includes(stage) ? "lit" : "");

  return (
    <div className="demo flow">
      <div className="demo-head">
        <p>Try it: send a test inquiry through the pipeline</p>
        <div className="flow-btns">
          <button type="button" className="chip" onClick={() => play(false)}>
            Send as a person
          </button>
          <button type="button" className="chip" onClick={() => play(true)}>
            Send as a bot
          </button>
        </div>
      </div>
      <div className="flow-track" aria-live="polite">
        <div className={`node ${lit(["sending", "server", "delivered", "bot-sending", "blocked"])}`}>
          <b>Contact form</b>
          <span>{stage.startsWith("bot") || stage === "blocked" ? "Hidden field: filled" : "Hidden field: empty"}</span>
        </div>
        <span className={`wire ${lit(["sending", "server", "delivered", "bot-sending", "blocked"])}`} />
        <div className={`node ${lit(["server", "delivered", "blocked"])} ${stage === "blocked" ? "stop" : ""}`}>
          <b>Express server</b>
          <span>{stage === "blocked" ? "Bot detected, dropped silently" : "Validates, then sends"}</span>
        </div>
        <span className={`wire ${lit(["delivered"])}`} />
        <div className="node-pair">
          <div className={`node mail ${lit(["delivered"])}`}>
            <b>To the therapist</b>
            <span>New inquiry from Sam, with their details</span>
          </div>
          <div className={`node mail ${lit(["delivered"])}`}>
            <b>To Sam</b>
            <span>“We got your message and will be in touch”</span>
          </div>
        </div>
      </div>
      <p className="flow-caption">
        {stage === "idle" && "Pick one to watch the request move through."}
        {(stage === "sending" || stage === "server") && "Sending…"}
        {stage === "delivered" && "Two emails delivered: the owner can reply right away, and the client knows it arrived."}
        {stage === "bot-sending" && "A bot fills every field, including the hidden one…"}
        {stage === "blocked" && "Blocked. Real people never see the hidden field, so they never hit a wall."}
      </p>
    </div>
  );
}
