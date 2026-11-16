import type { Metadata } from "next";
import PageShell from "../components/PageShell";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: true } };

export default function NotFound() {
  return (
    <PageShell>
      <p className="plain-code">404</p>
      <h1>This page does not exist.</h1>
      <p className="plain-lede">The link may be old, or the address may have a typo. Everything on the site is one of these:</p>
      <ul className="plain-links">
        <li><a href="/#work"><b>Selected work</b><span>UCert, CertCanada, Twish Care and five playable Unreal games</span></a></li>
        <li><a href="/resume"><b>Resume</b><span>One page, printable</span></a></li>
        <li><a href="/#contact"><b>Contact</b><span>Send a message, I reply to every one</span></a></li>
      </ul>
    </PageShell>
  );
}
