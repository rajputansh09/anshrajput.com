"use client";

// fallback if a page crashes while rendering
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // log to the console only, don't show details on the page
    console.error("page error", error.digest ?? error.message);
  }, [error]);
  return (
    <main className="wrap plain">
      <p className="plain-code">Error</p>
      <h1>Something on this page broke.</h1>
      <p className="plain-lede">It is on my side, not yours. Try again, or head back to the home page.</p>
      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={() => reset()}>Try again</button>
        <a className="btn" href="/">Home page</a>
      </div>
    </main>
  );
}
