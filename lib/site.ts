// contact details and links, all in one place
export const site = {
  name: "Ansh Rajput",
  url: "https://www.anshrajput.com",
  email: "arajput3@ualberta.ca",
  linkedin: "https://linkedin.com/in/ansh-rajput-3a5b78332",
  github: "https://github.com/rajputansh09",
  location: "Edmonton, Alberta",
  timeZone: "America/Edmonton",
};

export const sections = [
  { id: "work", label: "Work" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
] as const;

export const skills: [string, string][] = [
  ["Languages", "TypeScript, JavaScript, Python, C, C++, Java, Kotlin, SQL"],
  ["Frameworks", "Next.js, React, Node.js, Express, Tailwind CSS, Jetpack Compose"],
  ["Data and services", "PostgreSQL, Supabase, Firebase, SQLite, Stripe, Resend, Google Calendar API"],
  ["Tools", "Git, GitHub Actions, Docker, Linux, Vercel, Railway, Postman, Claude Code, Cursor"],
];

export type Project = { name: string; what: string; team: string; stack: string[]; href?: string; play?: string; kind: "web" | "school" | "game" };

export const projects: Project[] = [
  {
    name: "anshrajput.com",
    kind: "web",
    what: "This site, built from scratch: two procedurally animated canvas dragons with steering, collision and fire, two dragon games balanced by Playwright bots, a hand-built SVG skill astrolabe, five Unreal games rebuilt to play in the browser, live uptime checks and a Resend contact pipeline.",
    team: "Solo",
    stack: ["Next.js 16", "React 19", "TypeScript", "Canvas 2D", "Web Audio", "Vercel", "Resend", "Playwright"],
    href: "https://www.anshrajput.com",
  },
  {
    name: "Carbon Events",
    kind: "school",
    what: "Android app where campers join a waitlist and a lottery draws who gets the campsite. I built the explore, search, and details flow in Jetpack Compose, backed by Firebase.",
    team: "6-person team",
    stack: ["Kotlin", "Jetpack Compose", "Firebase", "GitHub Actions"],
    href: "https://github.com/CMPUT301F26carbon/carbon-events",
  },
  {
    name: "Mistune test study",
    kind: "school",
    what: "Can AI-written tests match human ones? We compare black-box, white-box, and LLM-generated test suites on Mistune, a Markdown parser with 20M+ monthly downloads.",
    team: "5-person team",
    stack: ["Python", "Black-box", "White-box"],
  },
  {
    name: "MapReduce library",
    kind: "school",
    what: "A thread pool and MapReduce library in C that runs map and reduce jobs in parallel, kept correct under concurrency with mutexes and condition variables.",
    team: "Solo",
    stack: ["C", "POSIX threads", "Linux"],
  },
  {
    name: "Toon Tanks",
    kind: "game",
    what: "Tank arena shooter: hull and turret driven separately, towers that track only within range on a fire timer, a health component, projectiles and a game mode that ends the round.",
    team: "Solo",
    stack: ["Unreal Engine 5", "C++"],
    href: "https://github.com/rajputansh09/Toon_Tanks",
    play: "tanks",
  },
  {
    name: "Simple Shooter",
    kind: "game",
    what: "Robot shooter in a frozen lab. Line-trace gun, damage and death, and enemy AI on behaviour trees with custom C++ services and tasks for sight, search and fire.",
    team: "Solo",
    stack: ["Unreal Engine 5", "C++", "Behavior Trees"],
    href: "https://github.com/rajputansh09/Simple_Shooter",
    play: "shooter",
  },
  {
    name: "Crypt Raider",
    kind: "game",
    what: "Dungeon puzzle game. A physics-handle grabber, tag-checked pressure plates and movers that open the crypt, built as reusable C++ components.",
    team: "Solo",
    stack: ["Unreal Engine 5", "C++", "Physics"],
    href: "https://github.com/rajputansh09/Crypt_Raider",
    play: "crypt",
  },
  {
    name: "Obstacle Assault",
    kind: "game",
    what: "3D obstacle course to a castle. Moving and rotating platforms written as one configurable C++ actor that never drifts off its path.",
    team: "Solo",
    stack: ["Unreal Engine 5", "C++"],
    href: "https://github.com/rajputansh09/Obstacle_Assault",
    play: "obstacle",
  },
  {
    name: "Warehouse Wreckage",
    kind: "game",
    what: "Physics demolition sandbox: a warehouse of destructible props to smash, built on Unreal's Chaos physics with Blueprint scripting and level design.",
    team: "Solo",
    stack: ["Unreal Engine 5", "Blueprints", "Chaos Physics"],
    href: "https://github.com/rajputansh09/Warehouse_Wreckage",
    play: "warehouse",
  },
];
