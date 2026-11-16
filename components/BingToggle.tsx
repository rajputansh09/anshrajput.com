"use client";

import { useEffect, useRef, useState } from "react";

const before = `<!-- What a crawler without JavaScript got -->
<html>
  <head>
    <title></title>
  </head>
  <body>
    <div id="root"></div>
    <script src="/assets/index.js"></script>
  </body>
</html>`;

const after = `<!-- Generated static HTML, one per page -->
<html>
  <head>
    <title>ISO 9001 Consulting in Canada | CertCanada</title>
    <link rel="canonical" href="https://certcanada.ca/iso-9001" />
    <meta name="description" content="ISO 9001 certification support for Canadian businesses." />
  </head>
  <body>
    <h1>ISO 9001 Certification Consulting</h1>
    ...
  </body>
</html>`;

export default function BingToggle() {
  const [view, setView] = useState<"before" | "after">("after");
  const [count, setCount] = useState(19);
  const chartRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  // animate the chart the first time it scrolls into view
  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(29);
      return;
    }
    let n = 19;
    const id = setInterval(() => {
      n += 1;
      setCount(n);
      if (n >= 29) clearInterval(id);
    }, 70);
    return () => clearInterval(id);
  }, [inView]);

  return (
    <div className="demo bing">
      <div className="demo-head">
        <p>What Bing sees (simplified)</p>
        <div className="seg small" role="tablist" aria-label="Before or after">
          <button type="button" role="tab" aria-selected={view === "before"} className={view === "before" ? "on" : ""} onClick={() => setView("before")}>
            Before
          </button>
          <button type="button" role="tab" aria-selected={view === "after"} className={view === "after" ? "on" : ""} onClick={() => setView("after")}>
            After
          </button>
        </div>
      </div>
      <pre className={`code ${view}`} role="tabpanel">
        <code>{view === "before" ? before : after}</code>
      </pre>
      <div className="indexed" ref={chartRef}>
        <p className="indexed-label">Pages indexed by search engines</p>
        <div className="indexed-bars" role="img" aria-label="Indexed pages went from 19 to 29, a 53 percent increase">
          <div className="ib-row">
            <span>Before</span>
            <span className="ib-bar" style={{ width: `${(19 / 29) * 100}%` }} />
            <b>19</b>
          </div>
          <div className="ib-row after">
            <span>After</span>
            <span className="ib-bar" style={{ width: `${(count / 29) * 100}%` }} />
            <b>{count}</b>
          </div>
        </div>
        <p className="indexed-note">+53% after the Next.js migration and sitemap fix</p>
      </div>
    </div>
  );
}
