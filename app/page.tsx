import Dragon from "../components/Dragon";
import StatusBoard from "../components/StatusBoard";
import GapDemo from "../components/GapDemo";
import BingToggle from "../components/BingToggle";
import InquiryFlow from "../components/InquiryFlow";
import ContactForm from "../components/ContactForm";
import { CommandPalette, Header, KeyHint, LocalTime, Toaster } from "../components/Chrome";
import Astrolabe from "../components/Astrolabe";
import Arcade from "../components/Arcade";
import { Channels, PlayButton, Reveal, Terminal, ToTop, Year } from "../components/Extras";
import RailToggle from "../components/RailToggle";
import { projects, site } from "../lib/site";
import "./portrait.css";

type Case = {
  id: string;
  name: string;
  role: string;
  dates: string;
  link?: { label: string; href: string };
  note?: string;
  stack: string[];
  title: string;
  intro: string;
  decisions: { what: string; why: string }[];
  demo: React.ReactNode;
  url: string;
};

const work: Case[] = [
  {
    id: "ucert",
    name: "UCert",
    role: "Founder and sole engineer",
    dates: "Aug 2026 to present",
    note: "Private while in development",
    stack: ["Next.js", "TypeScript", "Supabase", "Stripe", "Resend"],
    title: "Replacing in-person ISO consulting with software",
    intro:
      "Getting ISO certified usually means consultants, binders, and a one-day audit. UCert puts certification, team training, and every audit record for a company in one multi-tenant platform. I design and build all of it.",
    decisions: [
      { what: "A document engine that writes the paperwork", why: "Company details are filled into Word templates automatically. Previews use mammoth.js because serverless hosting cannot run LibreOffice." },
      { what: "Training and self-assessment built in", why: "10 ISO 9001 modules, a 30-question knowledge check, and a 73-question clause-level gap analysis that saves every answer as you go." },
      { what: "Billing that runs itself", why: "Stripe across 3 plans: checkout, cancel and resume, webhook-driven subscription sync, and plan limits in the app." },
      { what: "Auditors see the whole year, not one day", why: "In progress: role-based access so certification bodies review a company's full record instead of a snapshot." },
    ],
    demo: <GapDemo />,
    url: "ucert / gap-analysis",
  },
  {
    id: "certcanada",
    name: "CertCanada",
    role: "Full-stack developer",
    dates: "Mar 2026 to present",
    link: { label: "certcanada.ca", href: "https://certcanada.ca" },
    stack: ["Next.js", "Express", "PostgreSQL", "Google Calendar API", "Vercel", "Railway"],
    title: "Getting an ISO consultancy found across Canada",
    intro:
      "A 29-page platform for a consultancy serving clients in every province. It brings in client inquiries from across the country and lets people book a consultation without any back-and-forth email.",
    decisions: [
      { what: "Moved from React and Vite to Next.js", why: "Server-rendered pages give search engines real HTML, and a sitemap fix stopped a third of the site from hiding." },
      { what: "Static HTML for Bing", why: "Bing does not run JavaScript, so every page also ships as static HTML with its own title, canonical URL, and description." },
      { what: "Rate limiting keyed to email, not IP", why: "The host assigns a new IP to every request, so IP-based limits did nothing. Keying on email does." },
    ],
    demo: <BingToggle />,
    url: "certcanada.ca / view-source",
  },
  {
    id: "twish",
    name: "Twish Care",
    role: "Full-stack developer",
    dates: "Aug 2025",
    link: { label: "twishcare.ca", href: "https://twishcare.ca" },
    stack: ["Node.js", "Express", "EJS", "Vercel"],
    title: "Taking a therapy practice online in three cities",
    intro:
      "A site for a psychotherapist seeing clients in Mississauga, Markham, and Burlington, and virtually across Canada. Delivered end to end and running as built.",
    decisions: [
      { what: "Two emails for every inquiry", why: "The owner gets the client's details right away, and the client gets an instant confirmation." },
      { what: "A honeypot instead of rate limiting", why: "People reaching out to a therapist should never hit a wall. A hidden field stops bots without slowing anyone real." },
      { what: "Found locally", why: "Schema markup, a dynamic sitemap, and 3 Google Business Profiles, one for each city." },
    ],
    demo: <InquiryFlow />,
    url: "twishcare.ca / contact",
  },
];

export default function Home() {
  return (
    <>
      <a className="skip" href="#work">
        Skip to work
      </a>
      <Header />
      <CommandPalette />
      <Toaster />
      <RailToggle />

      <main id="top">
        <section className="hero">
          <img className="hero-crest" src="/crest.svg" alt="" aria-hidden="true" width={720} height={720} />
          <Dragon />
          <div className="hero-inner wrap">
            <h1>I build software <br className="br-wide" />that real businesses <br className="br-wide" />run on.</h1>
            <p className="lede">
              Computer Engineering co-op student at the University of Alberta, based in Edmonton. I take an idea from
              first sketch to a live product on my own, front end to database to deployment. After hours, I build games
              in Unreal Engine.
            </p>
            <div className="actions">
              <a className="btn btn-primary" href="#work">
                See the work
              </a>
              <a className="btn" href="#contact">
                Get in touch
              </a>
              <KeyHint />
            </div>
            <StatusBoard />
          </div>
        </section>

        <section id="work" className="wrap section" aria-labelledby="work-h">
          <div className="section-top">
            <h2 id="work-h">Selected work</h2>
            <p>Four builds, and every one of them runs right here. Try them.</p>
          </div>
          <ol className="work-index" aria-label="Jump to a project">
            {[...work.map((w) => ({ id: w.id, name: w.name, tag: w.role })), { id: "games", name: "Unreal games", tag: "5 playable remakes" }].map((w, k) => (
              <li key={w.id}>
                <a href={`#${w.id}`}>
                  <span className="wi-n">0{k + 1}</span>
                  <span className="wi-name">{w.name}</span>
                  <span className="wi-tag">{w.tag}</span>
                </a>
              </li>
            ))}
          </ol>
          {work.map((w, k) => (
            <article key={w.id} id={w.id} className="case">
              <header className="case-head">
                <span className="case-idx" aria-hidden="true">0{k + 1}</span>
                <div className="case-who">
                  <h3 className="case-name">{w.name}</h3>
                  <p className="muted">
                    {w.role} · {w.dates}
                  </p>
                </div>
                <div className="case-where">
                  {w.link ? (
                    <a className="case-link" href={w.link.href} target="_blank" rel="noreferrer">
                      {w.link.label} ↗
                    </a>
                  ) : (
                    <span className="case-note">{w.note}</span>
                  )}
                  <ul className="stack" aria-label="Built with">
                    {w.stack.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              </header>
              <div className="case-grid">
                <div className="case-body">
                  <h4 className="case-title">{w.title}</h4>
                  <p className="case-intro">{w.intro}</p>
                  <dl className="decisions">
                    {w.decisions.map((d, n) => (
                      <div key={d.what} className="decision">
                        <dt>
                          <span>{String(n + 1).padStart(2, "0")}</span>
                          {d.what}
                        </dt>
                        <dd>{d.why}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="case-demo">
                  <div className="window">
                    <div className="window-bar">
                      <i />
                      <i />
                      <i />
                      <span className="window-url">{w.url}</span>
                      <span className="window-live">Live demo</span>
                    </div>
                    {w.demo}
                  </div>
                </div>
              </div>
            </article>
          ))}
          <article id="games" className="case case-games">
            <header className="case-head">
              <span className="case-idx" aria-hidden="true">04</span>
              <div className="case-who">
                <h3 className="case-name">Unreal Engine games</h3>
                <p className="muted">Solo · 2025 · five games</p>
              </div>
              <div className="case-where">
                <a className="case-link" href={site.github} target="_blank" rel="noreferrer">
                  github.com/rajputansh09 ↗
                </a>
                <ul className="stack" aria-label="Built with">
                  {["Unreal Engine 5", "C++", "Behavior Trees", "Chaos Physics", "Blueprints"].map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            </header>
            <div className="case-games-top">
              <h4 className="case-title">Five Unreal games, playable right here</h4>
              <p className="case-intro">
                Unreal Engine cannot run in a web page, so each game was rebuilt for the browser from its original C++:
                the same tank and tower rules, the same platform logic, the same grabber and pressure plates, the same
                behaviour tree for the enemy robots. Pick one and play.
              </p>
            </div>
            <Arcade />
          </article>
        </section>

        <section id="projects" className="wrap section" aria-labelledby="projects-h">
          <div className="section-top">
            <h2 id="projects-h">More projects</h2>
            <p>This site, team and systems work from school, and the games.</p>
          </div>
          <ul className="projects">
            {projects.map((p) => (
              <li key={p.name} className={`project k-${p.kind}`}>
                <div className="project-top">
                  <span className="project-kind">{p.kind === "game" ? "Game" : p.kind === "web" ? "Web" : "School"}</span>
                  <span className="muted">{p.team}</span>
                </div>
                <h3>
                  {p.href ? (
                    <a href={p.href} target="_blank" rel="noreferrer">
                      {p.name} ↗
                    </a>
                  ) : (
                    p.name
                  )}
                </h3>
                <p>{p.what}</p>
                <div className="project-foot">
                  <ul className="stack" aria-label="Built with">
                    {p.stack.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                  {p.play && <PlayButton id={p.play} name={p.name} />}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section id="skills" className="wrap section" aria-labelledby="skills-h">
          <div className="section-top">
            <h2 id="skills-h">Skills</h2>
            <p>Read from the astrolabe. Every thread leads to something I built.</p>
          </div>
          <Astrolabe />
        </section>

        <section id="about" className="wrap section" aria-labelledby="about-h">
          <div className="section-top">
            <h2 id="about-h">About</h2>
            <p>The person behind the dragons.</p>
          </div>
          <div className="about-grid">
            <aside className="about-side">
              <div className="photo portrait">
                <img src="/ansh-rajput.webp" alt="Ansh Rajput" width={480} height={480} loading="lazy" decoding="async" />
              </div>
              <dl className="spec">
                <div><dt>Based in</dt><dd>Edmonton, Alberta</dd></div>
                <div><dt>Studying</dt><dd>Computer Engineering, Software co-op, University of Alberta, class of 2028</dd></div>
                <div><dt>Speaks</dt><dd>English, Hindi, Punjabi, some Spanish</dd></div>
                <div><dt>Engines</dt><dd>Next.js on the web, Unreal Engine 5 for games</dd></div>
                <div><dt>Open to</dt><dd>Co-op and internship roles, relocation included</dd></div>
              </dl>
            </aside>
            <div className="about-text">
              <p className="about-lead">
                I&rsquo;m Ansh Rajput. I write software for people who are counting on it.
              </p>
              <div className="about-story">
                <p>
                  My first real users weren&rsquo;t classmates. CertCanada is an ISO consulting business, and I built the
                  platform it runs on: 29 pages that bring in inquiries from across Canada and book consultations without a
                  single back-and-forth email. Working next to its consultants, I also helped put together the ISO
                  paperwork their clients get audited on. That is where UCert comes from. I saw how much of certification is
                  binders and hand-edited Word files, and I&rsquo;m building the platform that replaces them.
                </p>
                <p>
                  Before that I spent a co-op term in Calgary as a computer technician, bringing 100+ laptops and desktops
                  back into Alberta classrooms in four months. I&rsquo;m the person who gets old hardware running again: I
                  patched four Macs that Apple stopped supporting onto macOS Ventura, from Terminal and Recovery Mode.
                </p>
                <p>
                  Games are how I learn. I taught myself Unreal Engine C++ by building five of them, and the two dragons on
                  this page run on my own canvas engine, tuned by bots that play until the difficulty feels fair. At school
                  it&rsquo;s operating systems, databases and software testing, in C, SQL and Kotlin, mostly in teams.
                </p>
              </div>
              <ul className="principles">
                <li>
                  <b>Make it feel right</b>
                  <span>Fixed-step loops, input that answers within a frame, motion that eases instead of snapping.</span>
                </li>
                <li>
                  <b>Measure, don&rsquo;t guess</b>
                  <span>If I can&rsquo;t judge it by eye, I write a bot to play it, a test to break it, or a check to watch it.</span>
                </li>
                <li>
                  <b>Own it end to end</b>
                  <span>Schema, API, interface, deploy, and the email that lands after you press send.</span>
                </li>
                <li>
                  <b>Explain the why</b>
                  <span>Comments say why a line exists, so the next person can change it with confidence.</span>
                </li>
              </ul>
              <div>
                <Terminal />
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="wrap section contact" aria-labelledby="contact-h">
          <div className="contact-grid">
            <div className="contact-side">
              <h2 id="contact-h">
                Hiring for a <span className="nowrap">co-op</span> or building something? Let&rsquo;s talk.
              </h2>
              <p className="muted">
                <LocalTime />. I reply to every message.
              </p>
              <Channels />
              <ol className="next-steps" aria-label="What happens when you send a message">
                <li><b>You send it</b><span>It reaches my inbox the moment you press send.</span></li>
                <li><b>You get a confirmation</b><span>A short note lands in your inbox right away.</span></li>
                <li><b>I reply</b><span>Personally, from my own email.</span></li>
              </ol>
            </div>
            <div>
              <ContactForm />
            </div>
          </div>
        </section>
      </main>
      <Reveal />
      <ToTop />

      <footer className="foot wrap">
        <p>© <Year /> Ansh Rajput · Edmonton, Alberta</p>
        <nav className="foot-links" aria-label="Footer">
          <a href="/resume">Resume</a>
          <a href={site.github} target="_blank" rel="noreferrer">GitHub</a>
          <a href={site.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
          <a href="/privacy">Privacy</a>
        </nav>
      </footer>
    </>
  );
}
