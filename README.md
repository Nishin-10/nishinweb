# Companion — Career & Lifestyle AI

One web app that covers the job hunt and the downtime after it:

- **Jobs & CV** — a short intake questionnaire, live job search (RemoteOK + Arbeitnow free feeds, Adzuna with a key, deep links into LinkedIn/Indeed/Glassdoor/ZipRecruiter, paste-a-posting fallback), CV upload (PDF/DOCX/TXT), Claude-powered CV tailoring in a strict human tone, an ATS scanner with score and fixes, a before/after diff, DOCX + PDF export, and cover letters.
- **Discover** — book, movie and game recommendations (Open Library, TMDB, RAWG/FreeToGame) with mood/era/length/platform/language filters, multi-language movie mixing, and a thumbs up/down loop that re-ranks future picks.
- **Brain & Fun** — Sudoku (unique-solution generator, 3 difficulties), chess against a minimax engine (3 strengths), 2048, Memory Match, live trivia (Open Trivia DB), a reflex tester, and a personal stats view.
- **News** — daily AI/open-model, Hugging Face (trending models + Spaces), cloud and top-tech feed with topic filters, favorites, and human-tone AI summaries.
- **Assistant** — a persistent multilingual agent dock on every page. It answers, triggers app actions (job search, recommendations, news brief, navigation), holds session context, and supports voice in/out via the browser's Web Speech API.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Framer Motion · Claude API (`@anthropic-ai/sdk`) · localStorage for single-user persistence. Dark/light themes via next-themes. No database needed.

## Setup

```bash
npm install
copy .env.example .env.local   # then fill in keys
npm run dev
```

Required for AI features (CV tailoring, cover letters, assistant, news summaries):

- `ANTHROPIC_API_KEY`

Optional (features degrade gracefully without them):

- `TMDB_API_KEY` — movie recommendations (free at themoviedb.org)
- `RAWG_API_KEY` — full game catalog (free at rawg.io; falls back to FreeToGame)
- `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` — extra job feed (free at developer.adzuna.com)

## Machine-specific notes (this checkout)

- Node.js is a portable install at `%LOCALAPPDATA%\nodejs-portable\node-v24.18.0-win-x64`. Add it to PATH or invoke `node`/`npm` from there.
- npm scripts run Node with `--use-system-ca` (via cross-env) so HTTPS works behind the corporate TLS-inspecting proxy.
- `.next` is a directory junction to `%LOCALAPPDATA%\companion\next-cache` because OneDrive sync locks build output. `%LOCALAPPDATA%\companion\node_modules` is a junction back to the project's `node_modules` so module resolution keeps working from the relocated build dir. If you clone fresh outside OneDrive, delete the junction and let Next recreate `.next` normally.

## Writing style guard

Every LLM feature shares one system-prompt fragment, `HUMAN_TONE` in `src/lib/prompts.ts`, which bans AI-tell phrasing (em-dash tics, "Furthermore", buzzword stuffing, vague claims) and demands concrete, plainly worded output. Edit it there to tune the voice app-wide.
