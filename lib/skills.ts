// data for the skills astrolabe

export type Seal = { id: string; mono: string; name: string; line: string; href: string };
export type Skill = { name: string; short?: string; uses: string[]; note?: string };
export type Ring = { name: string; tag: string; label: string; hue: string; skills: Skill[] };

export const seals: Seal[] = [
  { id: "ucert", mono: "UC", name: "UCert", line: "ISO certification platform, in development", href: "#ucert" },
  { id: "certcanada", mono: "CC", name: "CertCanada", line: "29-page platform for an ISO consultancy", href: "#certcanada" },
  { id: "twish", mono: "TC", name: "Twish Care", line: "Therapy practice online in three cities", href: "#twish" },
  { id: "site", mono: "AR", name: "anshrajput.com", line: "This site, dragons and arcade included", href: "#top" },
  { id: "tanks", mono: "TT", name: "Toon Tanks", line: "Unreal tank arena, playable on this page", href: "#games" },
  { id: "shooter", mono: "SS", name: "Simple Shooter", line: "Robots driven by behaviour trees", href: "#games" },
  { id: "crypt", mono: "CR", name: "Crypt Raider", line: "Grabber and pressure-plate puzzles", href: "#games" },
  { id: "obstacle", mono: "OA", name: "Obstacle Assault", line: "Moving-platform obstacle course", href: "#games" },
  { id: "warehouse", mono: "WW", name: "Warehouse Wreckage", line: "Physics demolition sandbox", href: "#games" },
  { id: "carbon", mono: "CE", name: "Carbon Events", line: "Android lottery app, 6-person team", href: "#projects" },
  { id: "mistune", mono: "MS", name: "Mistune test study", line: "Human vs AI-written test suites", href: "#projects" },
  { id: "mapreduce", mono: "MR", name: "MapReduce library", line: "Parallel thread pool in C", href: "#projects" },
];

const GAMES = ["tanks", "shooter", "crypt", "obstacle", "warehouse"];
const CPP_GAMES = ["tanks", "shooter", "crypt", "obstacle"];

export const rings: Ring[] = [
  {
    name: "Languages",
    tag: "Languages",
    label: "LANGUAGES",
    hue: "#f0d79a",
    skills: [
      { name: "TypeScript", uses: ["ucert", "site"], note: "Types end to end on UCert and on this site, dragons and arcade included." },
      { name: "JavaScript", uses: ["certcanada", "twish"], note: "Both client platforms run on it, front and back." },
      { name: "C++", uses: CPP_GAMES, note: "Actors, components, AI services and tasks for four Unreal Engine games." },
      { name: "C", uses: ["mapreduce"], note: "A thread pool kept correct under concurrency with mutexes and condition variables." },
      { name: "Python", uses: ["mistune"], note: "Comparing black-box, white-box and LLM-written tests on a parser with 20M+ monthly downloads." },
      { name: "Kotlin", uses: ["carbon"], note: "The explore, search and details flow of the Android app." },
      { name: "SQL", uses: ["ucert", "certcanada"], note: "Postgres under both platforms." },
      { name: "HTML and CSS", short: "HTML/CSS", uses: ["certcanada", "twish", "site"], note: "Hand-written layouts, no UI kit, on this site." },
      { name: "Java", uses: [] },
    ],
  },
  {
    name: "Frameworks and engines",
    tag: "Frameworks",
    label: "FRAMEWORKS · ENGINES",
    hue: "#6fcf97",
    skills: [
      { name: "Next.js", uses: ["ucert", "certcanada", "site"], note: "This site runs on Next.js 16. CertCanada moved from React and Vite to Next.js so search engines get real HTML." },
      { name: "React", uses: ["ucert", "certcanada", "site"] },
      { name: "Node.js", uses: ["certcanada", "twish"] },
      { name: "Express", uses: ["certcanada", "twish"], note: "Rate limiting keyed to email, because the host gives every request a new IP." },
      { name: "Unreal Engine 5", short: "Unreal 5", uses: GAMES, note: "Five games: a tank arena, a robot shooter, a crypt puzzle, an obstacle course and a physics sandbox." },
      { name: "Blueprints", uses: ["warehouse"], note: "Visual scripting for the destructible warehouse." },
      { name: "Canvas 2D", short: "Canvas", uses: ["site"], note: "The dragons, their games and the five Unreal remakes are all drawn on a 2D canvas at a fixed 60 steps a second." },
      { name: "Jetpack Compose", short: "Compose", uses: ["carbon"], note: "The explore, search and details screens, built in Compose." },
      { name: "EJS", uses: ["twish"] },
      { name: "Tailwind CSS", short: "Tailwind", uses: [] },
    ],
  },
  {
    name: "Data and services",
    tag: "Data",
    label: "DATA · SERVICES",
    hue: "#ffb46b",
    skills: [
      { name: "PostgreSQL", uses: ["certcanada", "ucert"] },
      { name: "Supabase", uses: ["ucert"], note: "Multi-tenant data: every company's training, answers and audit records." },
      { name: "Stripe", uses: ["ucert"], note: "3 plans with checkout, cancel and resume, and webhook-driven subscription sync." },
      { name: "Resend", uses: ["ucert", "twish", "site"], note: "Two emails per message: one to the owner, a confirmation to the sender." },
      { name: "Google Calendar API", short: "Calendar API", uses: ["certcanada"], note: "Consultations book straight into the calendar, no back-and-forth email." },
      { name: "Vercel Blob", short: "Blob", uses: ["site"], note: "Stores where I am, so the clock in this site's header shows my local time." },
      { name: "Firebase", uses: ["carbon"], note: "Lottery and event data for the Android app." },
      { name: "Chaos Physics", short: "Chaos", uses: ["warehouse"], note: "Unreal's physics engine behind every crate and barrel in the warehouse." },
      { name: "SQLite", uses: [] },
    ],
  },
  {
    name: "Tools and cloud",
    tag: "Tools",
    label: "TOOLS · CLOUD",
    hue: "#9fd9c2",
    skills: [
      { name: "Git", uses: ["ucert", "certcanada", "twish", "site", ...GAMES, "carbon", "mistune", "mapreduce"], note: "The one thread that binds every seal." },
      { name: "Vercel", uses: ["certcanada", "twish", "site"], note: "Hosts this site and two client platforms, serverless functions included." },
      { name: "Playwright", uses: ["site"], note: "Bots that play this site's games to tune the difficulty, plus screenshot checks on desktop and phone." },
      { name: "Claude Code", uses: ["site"], note: "AI pair programming, with every change checked by tests and bots." },
      { name: "GitHub Actions", short: "Actions", uses: ["carbon"], note: "The Android team's CI checks on every change." },
      { name: "Linux", uses: ["mapreduce"], note: "POSIX threads, built and tested on Linux." },
      { name: "Railway", uses: ["certcanada"], note: "Runs the API behind CertCanada." },
      { name: "VS Code", uses: ["tanks", "obstacle"], note: "Where the Unreal C++ for these games was written." },
      { name: "Docker", uses: [] },
      { name: "Postman", uses: [] },
      { name: "Cursor", uses: [] },
    ],
  },
];
