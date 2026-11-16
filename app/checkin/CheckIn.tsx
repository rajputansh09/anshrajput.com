"use client";

import { useEffect, useState } from "react";
import { checkIn, KEY } from "../../components/whereabouts";

export default function CheckIn() {
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    try {
      setSaved(!!localStorage.getItem(KEY));
    } catch {}
  }, []);

  const run = async (k: string) => {
    setMsg("Checking in…");
    const r = await checkIn(k, true);
    if (r.ok) {
      try {
        localStorage.setItem(KEY, k);
      } catch {}
      setSaved(true);
      setMsg(`Done. The site now shows ${r.city} time.`);
    } else {
      setMsg(r.error === "unauthorized" ? "That key didn't match. Check it and try again." : "Couldn't check in. Try again in a minute.");
    }
  };

  const forget = () => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setSaved(false);
    setMsg("This browser will no longer update your location.");
  };

  return (
    <main className="wrap" style={{ maxWidth: 520, padding: "96px 16px" }}>
      <h1 style={{ fontSize: 32, letterSpacing: "-0.02em" }}>Location check-in</h1>
      {saved ? (
        <>
          <p className="muted" style={{ marginTop: 12 }}>
            This browser is set up. Whenever you open anshrajput.com here, the site updates the city and time to where
            you are.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary" onClick={() => run(localStorage.getItem(KEY) || "")}>
              Check in now
            </button>
            <button type="button" className="btn" onClick={forget}>
              Forget this browser
            </button>
          </div>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(key.trim());
          }}
          style={{ display: "grid", gap: 12, marginTop: 20 }}
        >
          <label className="field">
            <span>Location key</span>
            <input value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" spellCheck={false} />
          </label>
          <button type="submit" className="btn btn-primary" style={{ justifySelf: "start" }}>
            Save and check in
          </button>
        </form>
      )}
      <p role="status" style={{ marginTop: 16, color: "var(--brass)" }}>{msg}</p>
    </main>
  );
}
