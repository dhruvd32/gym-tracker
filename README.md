# gym.ledger

A personal gym-tracking PWA for Push / Pull / Legs / Core workouts. Builds up a full session locally, commits the whole workout in one tap, and syncs every set to a Notion database for long-term history.

## What it does

- **Session builder** — open a day, add exercises and their sets, then tap **Log Day** once to commit the whole workout. An in-progress session is persisted to `localStorage`, so you won't lose it if the tab closes mid-workout.
- **PR detection** — automatically flags a set as a personal record when it beats your best `weight × reps` for that exercise.
- **Notion sync** — every logged set is queued and pushed to a Notion database in the background, giving you a permanent, queryable workout log.
- **History** — reverse-chronological list of every session. Expand a session to see its exercises and sets; edit set weights/reps or delete individual sets / whole sessions (changes propagate to Notion).
- **Muscle heatmap** — visualises weekly training volume per muscle group so you can spot imbalances at a glance.
- **Works offline** — writes happen locally first, so the app is fully usable at the gym with no signal. The queue drains to Notion when connectivity returns.
- **Installable** — ships as a PWA. Chrome offers "Add to Home screen" and the app launches standalone, like a native app.

## Why it is designed this way

### Local-first with Dexie (IndexedDB)

All workout data is written to the browser's built-in IndexedDB database via [Dexie.js](https://dexie.org) before anything else happens:

- Logging a set is instant — no waiting for a network round-trip. Notion's API runs at 300 ms–1.5 s per call with a ~3 req/sec rate limit; logging against it directly would be a bad time.
- The app is fully usable at the gym with no signal.
- Your data is never lost if the sync server is unreachable.

### Notion as the backend

Rather than running a database, Notion is the persistent store. This gives you a structured, filterable, shareable workout log with zero backend infrastructure to maintain.

### Sync queue with create / update / delete

A `syncQueue` table in IndexedDB is a reliable outbox. Each entry carries an `action` — `create`, `update`, or `delete` — so edits and deletions from the History screen propagate to Notion the same way new sets do. The worker drains the queue on mount, after each write, on the `online` and `visibilitychange` events, and every 60 seconds.

### Why a server is still needed (even though the app is local-first)

Notion's API blocks direct browser requests (CORS). A thin server-side layer holds the `NOTION_TOKEN` and proxies every call. In production this is a **Cloudflare Pages Function** that lives on the same domain as the static site — no CORS, no separate service.

## Architecture

```
┌──────────────────────────────────────────────┐
│ React PWA (phone / desktop)                  │
│  ├── Dexie / IndexedDB  ← source of truth    │
│  │   draft session      ← localStorage       │
│  └── syncQueue (create / update / delete)    │
└───────────────┬──────────────────────────────┘
                │  HTTPS, same domain, no CORS
                ▼
┌──────────────────────────────────────────────┐
│ Cloudflare Pages Functions (functions/api/)  │
│   sync-set.js   → POST   Notion /pages       │
│   update-set.js → PATCH  Notion /pages/:id   │
│   delete-set.js → PATCH  archived: true      │
│   NOTION_TOKEN from CF env secrets           │
└───────────────┬──────────────────────────────┘
                ▼
┌──────────────────────────────────────────────┐
│ Notion "Workout Log" database                │
│ (one row per logged set)                     │
└──────────────────────────────────────────────┘
```

The exercise library (~60 exercises with primary + secondary muscle contribution percentages) is seeded in [src/data/exerciseLibrary.js](src/data/exerciseLibrary.js) from the Notion `Gym Tracking > Push / Pull / Legs` pages. Update that file when you add/change exercises.

## Setup

### 1. Notion — give the integration access

The Workout Log database lives at:
`Personal Growth > Gym Tracking > Workout Log`

Database ID: `c2045ab8-72f1-4b10-a538-be33008af84b`

1. Go to <https://www.notion.so/profile/integrations>.
2. Create an **internal integration** (any name — e.g. "Gym Tracker Sync"). Copy the secret.
3. Open the **Workout Log** page in Notion.
4. Click `•••` (top right) → **Connections** → **Connect to** → select your integration.

### 2. Install dependencies (local dev)

```bash
# Frontend
npm install

# Dev sync server (mirrors the Cloudflare Pages Functions for local use)
cd server && npm install && cd ..

# Env (used by the dev server only — production uses Cloudflare secrets)
cp server/.env.example .env
# Edit .env — paste your NOTION_TOKEN and the database UUID
```

### 3. Run locally

Two processes:

```bash
# Terminal 1 — dev sync server on :3001
npm run server

# Terminal 2 — Vite dev server on :5173 (proxies /api → :3001)
npm run dev
```

Open `http://localhost:5173`, or `http://<your-laptop-ip>:5173` on your phone while on the same Wi-Fi.

## Deploy to Cloudflare (free, works anywhere)

Deploying the app to Cloudflare is what lets you use it on your phone outside your home Wi-Fi. The free tier covers this app indefinitely: unlimited static page requests, 100k Function invocations per day.

### One-time setup

1. **Push this repo to GitHub** (create a free account if needed).
2. **Create a free Cloudflare account** at <https://cloudflare.com>.
3. In the Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → select your repo.
4. Set the build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Under **Environment variables**, add:
   - `NOTION_TOKEN` — your Notion integration secret
   - `NOTION_WORKOUT_DB_ID` — `c2045ab8-72f1-4b10-a538-be33008af84b`
6. Click **Save and Deploy**.
7. Cloudflare gives you a URL like `https://gym-ledger.pages.dev`. Open it on your phone → Chrome ⋮ → **Add to Home screen**.

Every future `git push` to your main branch auto-redeploys.

**Important:** never put `NOTION_TOKEN` in frontend code or any `.env` file that ends up in the bundle. Secrets live only in the server-side layer (Cloudflare env vars or the local `.env` for dev).

## Usage flow

1. **Log tab** — tap **Push / Pull / Legs / Core**. You enter a Session Builder for that day.
2. Tap **+ Add Exercise** → pick a sub-muscle (e.g. *Chest · Upper Chest*) → pick an exercise from that sub-muscle's list.
3. Enter weight + reps, tap **+ Set**. Keep adding sets (inputs retain the last values, common case is same weight next set). Each set row can be edited or removed.
4. **← Back to session** returns you to the builder. Add another exercise, or tap an already-added one to keep adding sets to it.
5. When done, tap **Log Day · N sets** (floating button). All sets commit to local storage and queue for Notion sync. A toast confirms.
6. **Heatmap tab** — weekly front/back body SVG graded by total tonnage, plus a per-muscle breakdown.
7. **History tab** — every session you've ever logged, newest first. Tap one to expand. Per-set **Edit** changes weight/reps; **×** deletes a single set; **Delete entire session** removes the whole workout. All changes sync to Notion.

The sync chip in the header shows `Synced` / `Syncing…` / `N pending` / `Offline`.

## Customising weekly targets

Weekly tonnage targets (per muscle group, in kg) live in [src/data/volume.js](src/data/volume.js) under `WEEKLY_TARGETS`:

- `min`  — below this: under-trained (dim red)
- `peak` — hit the target (orange)
- `over` — above this: overloaded (bright yellow)

Tweak as you learn your own load tolerance.

## Known gaps / future

- **Core Day** isn't fully seeded — add Core exercises to [exerciseLibrary.js](src/data/exerciseLibrary.js).
- **RPE / set quality** isn't captured. Log in Notion Notes for now.
- **PR detection** is tonnage-based (single-set volume). For 1RM-style PRs, swap `isPR()` in [src/data/db.js](src/data/db.js).
- **Sync dedupe** — the queue is idempotent on the client but has no server-side dedupe. If the same `create` somehow succeeded twice, you'd get duplicate rows in Notion. Low risk in practice; for stronger guarantees, add a `Session ID + Set Number` uniqueness check before insert.
- **Bodyweight sets** log with `weight = 0` → zero tonnage. Enter your body mass to make bodyweight volume count.
- **Notion delete is an archive**, not a hard delete — Notion's API has no hard-delete endpoint. Archived pages leave the database view and live in Notion's trash; restore from there if needed.

## File map

```
src/
  main.jsx                  React root
  App.jsx                   Tab switcher (Log | Heatmap | History) + sync chip + toast
  styles.css                All CSS — dark charcoal / bone / crimson
  data/
    exerciseLibrary.js      ~60 seeded exercises from the Notion PPL pages
    db.js                   Dexie schema (v2) + set / sync-queue helpers
    sync.js                 Background queue flusher (create / update / delete)
    draft.js                localStorage-backed in-progress session
    volume.js               Tonnage math, week helpers, heatmap grading
  components/
    LogScreen.jsx           Day → sub-muscle → exercise → Session Builder → Log Day
    HeatmapScreen.jsx       Week nav + body SVG + muscle list
    BodyHeatmap.jsx         Front + back SVG silhouettes
    HistoryScreen.jsx       Session list, expand, edit sets, delete sets/sessions
functions/api/
  sync-set.js               Cloudflare Pages Function — create in Notion
  update-set.js             Cloudflare Pages Function — update Notion page
  delete-set.js             Cloudflare Pages Function — archive Notion page
  health.js                 Cloudflare Pages Function — health check
server/
  index.js                  Local-dev Express server mirroring the Pages Functions
  .env.example              Env template for local dev
```
