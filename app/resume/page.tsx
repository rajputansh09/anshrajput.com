import type { Metadata } from "next";
import PrintButton from "./PrintButton";
import "./resume.css";
import "./resume-bullets.css";
import { site } from "../../lib/site";

export const metadata: Metadata = {
  title: "Resume",
  description: "Resume of Ansh Rajput: full-stack developer and Computer Engineering co-op student at the University of Alberta. Next.js, TypeScript, React, Node.js, PostgreSQL, C++, Unreal Engine 5.",
  alternates: { canonical: "/resume" },
  // its own preview, so a resume link shared on LinkedIn doesn't show the home page card
  openGraph: {
    title: "Ansh Rajput | Resume",
    description: "My one-page resume: founder of UCert, full-stack developer for CertCanada and Twish Care, my co-op term, projects and skills, with a PDF download.",
    url: "/resume",
    siteName: "Ansh Rajput",
    type: "website",
    locale: "en_CA",
  },
  twitter: { card: "summary_large_image", title: "Ansh Rajput | Resume" },
};

type Entry = { org: string; right: string; sub?: string; subRight?: string; bullets: string[]; link?: string; label?: string };

const experience: Entry[] = [
  {
    org: "UCert",
    right: "Aug 2026 - Present",
    sub: "Founder and Software Engineer",
    subRight: "Edmonton, AB",
    bullets: [
      "Architected a **multi-tenant ISO certification SaaS** on **Next.js and Supabase** that generates **preloaded Word documents**, with **10 ISO 9001 modules**, a **30-question** quiz, and an **auto-saving 73-question** gap analysis",
      "Integrated **Stripe** billing across **3 plans** with checkout, cancel and resume, **webhooks**, and per-plan usage limits",
    ],
  },
  {
    org: "CertCanada",
    right: "Mar 2026 - Present",
    sub: "Full-Stack Developer | certcanada.ca",
    bullets: [
      "Delivered a **29-page** lead-generating platform on **Next.js, Express, and PostgreSQL** scoring **100/100 on PageSpeed Insights**, with **self-serve booking** on the **Google Calendar API** secured by **JWT** and **rate limiting**",
      "Grew search-indexed pages from **19 to 29 (+53%)** by migrating React/Vite to **Next.js SSR**, fixing a sitemap bug, and serving static HTML per page for Bing, which does not run JavaScript",
    ],
  },
  {
    org: "Calgary Board of Education, Alberta Computers for Schools",
    right: "Feb 2026 - May 2026",
    sub: "Computer Technician (Co-op)",
    subRight: "Calgary, AB",
    bullets: [
      "Returned **100+ desktops and laptops** to Alberta classrooms in **4 months** by diagnosing and fixing software and OS faults",
      "Imaged, configured, and **QA-tested 100%** of devices so schools and community groups received ready-to-use computers",
    ],
  },
  {
    org: "Twish Care",
    right: "Aug 2025",
    sub: "Full-Stack Developer | twishcare.ca",
    bullets: [
      "Redesigned a psychotherapy practice's outdated site into a **modern, mobile-responsive Node.js/Express** site, expanding its reach to **3 Ontario cities** with **3 Google Business Profiles**",
      "Launched an inquiry pipeline with **2 automated emails** per request (owner alert, client confirmation) and a **honeypot** for bots",
    ],
  },
];

const projects: Entry[] = [
  {
    org: "anshrajput.com: Interactive Portfolio",
    link: "https://www.anshrajput.com",
    label: "Live Site",
    right: "Next.js | TypeScript | Canvas 2D",
    bullets: [
      "Shipped a **Next.js 16, React 19, TypeScript** site on **Vercel** with a **Canvas 2D** engine I wrote from scratch, running **2 AI-steered dragons** and **5 Unreal games** at **60 Hz**",
      "Verified all **15 game levels** are winnable with **Playwright** bots, behind a strict **CSP** with **0 npm vulnerabilities**",
    ],
  },
  {
    org: "Carbon Events: Lottery Campsite Booking App",
    link: "https://github.com/CMPUT301F26carbon/carbon-events",
    label: "Source Code",
    right: "Kotlin | Jetpack Compose | Firebase",
    bullets: [
      "Created the **explore, search, and campsite details** screens in a **6-person** team, where campers join or leave lottery waitlists",
      "Wrote **7 Compose UI intent tests** covering **11 entrant user stories**, from first launch to opening a campsite by **QR code**",
    ],
  },
  {
    org: "Mistune Testing: Test Strategy Evaluation",
    right: "Python | pytest | Black-box | White-box",
    bullets: [
      "Compared **black-box, white-box, AI, and mutation** testing on Mistune (**20M+ monthly downloads**) in a **5-person** team, measuring coverage with **pytest** and **coverage.py**",
      "Led **AI-driven black-box testing** with basic and structured **ChatGPT** prompts, validating every test against **CommonMark**",
    ],
  },
  {
    org: "Unreal Engine Games: 5 Titles",
    link: "https://github.com/rajputansh09",
    label: "Source Code",
    right: "C++ | Unreal Engine 5",
    bullets: [
      "Programmed **5 games** in **Unreal Engine 5 and C++**, including Toon Tanks, Simple Shooter, and Crypt Raider",
      "Built enemy AI with **behavior trees** that chases the player on sight and searches when it loses them, plus **physics grabbing** and win and loss **game modes**",
    ],
  },
];

const skills: [string, string][] = [
  ["Languages", "C, C++, Python, Java, Kotlin, JavaScript, TypeScript, SQL, HTML/CSS"],
  ["Frameworks", "React, Next.js, Node.js, Express, Tailwind CSS, Jetpack Compose, Unreal Engine 5, scikit-learn"],
  ["Data/Services", "PostgreSQL, SQLite, Supabase, Firebase, Stripe, Resend, Vercel Blob, Google Calendar API, JWT, Webhooks"],
  ["Tools/Cloud", "Git, GitHub Actions, Linux, Docker, Postman, Vercel, Railway, Playwright, Visual Studio, Cursor, Claude Code"],
  ["Concepts", "Data Structures & Algorithms, OOP, REST APIs, Serverless, Multithreading, CI/CD, Software Testing, SEO, Game AI"],
];

// inline icons so they print sharp
const Ico = ({ d, fill }: { d: string; fill?: boolean }) => (
  <svg className={`r-ico${fill ? " fill" : ""}`} viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>
);
const ICONS = {
  phone: "M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z",
  mail: "M2 5.5A1.5 1.5 0 0 1 3.5 4h17A1.5 1.5 0 0 1 22 5.5v.3l-10 6.3L2 5.8zM2 8.2l10 6.3 10-6.3v10.3a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 18.5z",
  linkedin: "M4.5 3A1.5 1.5 0 0 0 3 4.5v15A1.5 1.5 0 0 0 4.5 21h15a1.5 1.5 0 0 0 1.5-1.5v-15A1.5 1.5 0 0 0 19.5 3zM8 18H5.5v-8H8zM6.75 8.9a1.45 1.45 0 1 1 0-2.9 1.45 1.45 0 0 1 0 2.9zM18.5 18H16v-3.9c0-.95-.02-2.15-1.3-2.15-1.32 0-1.52 1.03-1.52 2.08V18h-2.5v-8h2.4v1.1h.03c.33-.63 1.15-1.3 2.37-1.3 2.53 0 3 1.67 3 3.84z",
  github: "M12 2a10 10 0 0 0-3.16 19.5c.5.08.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.1-1.47-1.1-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.1.39-1.99 1.03-2.69a3.6 3.6 0 0 1 .1-2.64s.84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.37.2 2.4.1 2.64.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z",
  globe: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-2.9a15.6 15.6 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8zM12 4.04c.83 1.2 1.48 2.53 1.9 3.96h-3.8c.42-1.43 1.070-2.76 1.9-3.96zM4.26 14a8.2 8.2 0 0 1 0-4h3.38a16.5 16.5 0 0 0 0 4zm.82 2h2.95c.32 1.250.78 2.45 1.38 3.56A8 8 0 0 1 5.08 16zm2.95-8H5.08a8 8 0 0 1 4.33-3.56A15.6 15.6 0 0 0 8.03 8zM12 19.96A14.1 14.1 0 0 1 10.1 16h3.8A14.1 14.1 0 0 1 12 19.96zM14.34 14H9.66a14.7 14.7 0 0 1 0-4h4.68a14.7 14.7 0 0 1 0 4zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8 8 0 0 1-4.33 3.56zM16.36 14a16.5 16.5 0 0 0 0-4h3.38a8.2 8.2 0 0 1 0 4z",
};

function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/).map((p, i) => (p.startsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>))}
    </>
  );
}

function Block({ e }: { e: Entry }) {
  return (
    <div className="r-entry">
      <div className="r-row">
        <b>
          {e.org}
          {e.link && (
            <>
              {" | "}
              <a href={e.link}>
                <i>{e.label ?? e.link}</i>
              </a>
            </>
          )}
        </b>
        <b>{e.right}</b>
      </div>
      {e.sub && (
        <div className="r-row r-sub">
          <i>{e.sub}</i>
          <i>{e.subRight}</i>
        </div>
      )}
      <ul>
        {e.bullets.map((b) => (
          <li key={b}>
            <Rich text={b} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Resume() {
  return (
    <div className="r-page-wrap">
      <div className="r-bar no-print">
        <a href="/">← Back to anshrajput.com</a>
        <PrintButton />
      </div>
      <article className="r-page">
        <header className="r-head">
          <h1>Ansh Rajput</h1>
          <p className="r-contact">
            <a href="tel:+18253338999"><Ico d={ICONS.phone} fill />825-333-8999</a>
            <a href="mailto:arajput3@ualberta.ca"><Ico d={ICONS.mail} fill />arajput3@ualberta.ca</a>
            <a href={site.linkedin}><Ico d={ICONS.linkedin} fill />linkedin.com/in/ansh-rajput-3a5b78332</a>
            <a href={site.github}><Ico d={ICONS.github} fill />github.com/rajputansh09</a>
            <a href={site.url}><Ico d={ICONS.globe} fill />anshrajput.com</a>
          </p>
        </header>

        <h2>Education</h2>
        <div className="r-entry">
          <div className="r-row">
            <b>University of Alberta</b>
            <b>Expected Graduation: Apr 2028</b>
          </div>
          <div className="r-row r-sub">
            <i>BSc Computer Engineering | Software Engineering Co-op</i>
            <i>Edmonton, AB</i>
          </div>
          <ul>
            <li>
              <i>Courses: Data Structures, Algorithms, Operating Systems, Databases, Software Testing | International Admission Scholarship</i>
            </li>
          </ul>
        </div>

        <h2>Experience</h2>
        {experience.map((e) => (
          <Block key={e.org} e={e} />
        ))}

        <h2>Projects</h2>
        {projects.map((e) => (
          <Block key={e.org} e={e} />
        ))}

        <h2>Technical Skills</h2>
        <dl className="r-skills">
          {skills.map(([k, v]) => (
            <div key={k}>
              <dt>{k}:</dt> <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </article>
    </div>
  );
}
