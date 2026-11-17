# anshrajput.com

My portfolio site. I'm Ansh, a computer engineering co-op student at the University of Alberta. I didn't want a page that just lists projects, so most of the site is stuff you can actually click on and play with.

Live at [anshrajput.com](https://www.anshrajput.com).

## What's in it

- two dragons drawn on a canvas that fly around, breathe fire at lanterns and can duel each other
- browser versions of the 5 games I made in Unreal Engine (Toon Tanks, Simple Shooter, Crypt Raider, Obstacle Assault, Warehouse Wreckage), 3 levels each
- a small sample of the gap analysis from UCert, the ISO certification platform I'm building
- a demo of the Twish Care contact pipeline catching a spam bot
- a skills section drawn as an astrolabe, where each skill links to the projects I used it in
- a status board that checks if certcanada.ca and twishcare.ca are up
- my resume, which prints to one page, plus a PDF
- a contact form that emails me and sends you a confirmation

Next.js 16, React 19 and TypeScript, hosted on Vercel. Email goes through Resend. No UI library, the dragons and games are plain Canvas 2D.

## Running it

Needs Node 20 or newer.

```bash
git clone https://github.com/rajputansh09/anshrajput.com.git
cd anshrajput.com
npm install
npm run dev
```

Then open http://localhost:3000. Everything works locally except the contact form and the location clock, those need the env vars below.

## Tests

```bash
npm run build
npm test
```

There's a bot for each game in `tests/bots/`. Each one plays all 3 levels through the actual game code and the test fails if it can't win, so I know every level can be beaten. There are also a few browser checks: the home page loads with no errors, every arcade level starts, and the gap sample gives the right result.

## Env vars

Put these in `.env.local` or in the Vercel project settings.

```bash
RESEND_API_KEY=        # for the contact form
CONTACT_TO=            # where messages go
CONTACT_FROM=          # who they come from, like: Ansh Rajput <hello@anshrajput.com>
WHEREABOUTS_TOKEN=     # lets my laptop update the city in the header
BLOB_READ_WRITE_TOKEN= # Vercel adds this when you link a Blob store
```

## Layout

```
app/          pages, the resume and the api routes (contact, status, whereabouts)
components/   dragon/ for the dragons, arcade/ for the games, plus everything else on the page
lib/          site info, skills list and email helpers
tests/        the game bots and browser checks
```

Feel free to read through the code. Just don't republish the site, the dragons or the games as your own.

If you want to reach me, use the form on [anshrajput.com](https://www.anshrajput.com/#contact) or [LinkedIn](https://linkedin.com/in/rajputansh09).
