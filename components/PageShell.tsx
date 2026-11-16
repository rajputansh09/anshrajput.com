// the frame for the plain pages (privacy, not found, errors): the mark linking home, the page
import Logo from "./Logo";
import { Year } from "./Extras";

export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="plain-top">
        <div className="wrap plain-top-inner">
          <a className="mark" href="/" aria-label="Ansh Rajput, home">
            <Logo />
            Ansh Rajput
          </a>
          <a className="plain-back" href="/">Back to the site</a>
        </div>
      </header>
      <main className="wrap plain">{children}</main>
      <footer className="foot wrap">
        <p>© <Year /> Ansh Rajput · Edmonton, Alberta</p>
        <nav className="foot-links" aria-label="Footer">
          <a href="/">Home</a>
          <a href="/resume">Resume</a>
          <a href="/privacy">Privacy</a>
        </nav>
      </footer>
    </>
  );
}
