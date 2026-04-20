# gym.ledger

A local-first PWA for logging PPL workouts. Writes instantly to IndexedDB, syncs to Notion in the background, renders a weekly front/back body heatmap graded by tonnage (Weight × Reps).

## Why local-first

Notion's API runs at 300 ms–1.5 s per call with a ~3 req/sec rate limit. Logging sets every 60–90 seconds against that API is a bad time. This app writes to IndexedDB (instant), queues a sync job, and flushes to Notion in the background — including when the phone has been offline in a gym basement.

## Architecture

```
┌─────────────────────────────────────────────┐
│  React PWA (Pixel 9 home-screen app)        │
│  ├── Dexie / IndexedDB  ← source of truth   │
│  │   while logging      ← instant UI        │
│  └── syncQueue  ────────┐                    │
└──────────────────────────┼───────────────────┘
                           ▼
                ┌──────────────────────┐
                │ Sync server          │
                │ /api/sync-set        │
                │ (Express + Notion SDK)│
                │ Holds NOTION_TOKEN   │
                └──────────┬───────────┘
                           ▼
                ┌──────────────────────┐
                │ Notion Workout Log DB │
                │ (flat table, one row  │
                │  per logged set)      │
                └──────────────────────┘
```

Exercise library is seeded in `src/data/exerciseLibrary.js` from your Notion
`Gym Tracking > Push / Pull / Legs` pages (60 exercises, with primary +
secondary muscle contribution percentages). Update the source file when you
add/change exercises in Notion — or extract the same table dynamically in a
future iteration.

## Setup

### 1. Notion — give the integration access

The Workout Log database was created at:
`Personal Growth > Gym Tracking > Workout Log`

Database ID: `c2045ab8-72f1-4b10-a538-be33008af84b`

1. Go to https://www.notion.so/profile/integrations
2. Create an **internal integration** (Any name — e.g. "Gym Tracker Sync"). Copy the secret.
3. Open the **Workout Log** page in Notion.
4. Click `•••` (top right) → **Connections** → **Connect to** → select your integration.

### 2. Install

```bash
# Frontend
npm install

# Sync server
cd server && npm install && cd ..

# Env
cp server/.env.example server/.env
# Edit server/.env — paste your NOTION_TOKEN
```

### 3. Run locally

Two processes:

```bash
# Terminal 1 — sync server
npm run server

# Terminal 2 — web app (opens on http://localhost:5173, /api is proxied to :3001)
npm run dev
```

Open `http://<your-laptop-ip>:5173` on your Pixel 9 while on the same Wi-Fi, then:

- Chrome → ⋮ → **Install app** (or "Add to Home screen"). PWA opens standalone, looks native.

### 4. Deploy (so it works anywhere, not just on home Wi-Fi)

Recommended split:

- **Web app** → Vercel or Cloudflare Pages. `npm run build` produces a `dist/` folder.
- **Sync server** → Render / Fly.io / Railway. Expose `/api/sync-set` and `/api/health`.
- Set env on your server host: `NOTION_TOKEN`, `NOTION_WORKOUT_DB_ID`.
- In the web app, update the fetch URL in `src/data/sync.js` from `/api/sync-set` to your server's absolute URL (or configure a proxy/rewrite at the hosting layer).

**Important:** never put `NOTION_TOKEN` in the web app code or a `.env` file that gets shipped to the browser. Anyone can inspect the bundle.

## Usage flow

1. Open the app on your phone. Tap **Push** / **Pull** / **Legs**.
2. Tap a target sub-muscle (e.g. "Upper Chest (Clavicular Head)").
3. Tap an exercise. The "Last time" chip shows your top set from the most recent session.
4. Punch in weight + reps. Tap **Log**. Set appears instantly, PR flags fire if it's a tonnage PR.
5. Switch to **Heatmap** tab to see weekly front/back body SVG graded by total tonnage, plus a per-muscle breakdown.
6. Sync chip in the header shows `Synced` / `Syncing…` / `N pending` / `Offline`. Data syncs to Notion automatically when online.

## Customising targets

Weekly tonnage targets (per muscle group, in kg) live in
`src/data/volume.js` under `WEEKLY_TARGETS`. Defaults are roughly:

- `min`  — below this: under-trained (dim red)
- `peak` — hit the target (orange)
- `over` — above this: overloaded (bright yellow)

Tweak as you learn your own load tolerance. Example — if your bench volume is
consistently cruising past the "over" threshold, it probably is, and you should
either deload or raise the threshold.

## Known gaps / future

- **Core Day** isn't fully seeded yet — add Core exercises under Notion's Core page and seed them into `exerciseLibrary.js`.
- **RPE / set quality** isn't captured. Log in `Notes` for now.
- **PR detection** is tonnage-based (single-set volume). If you want 1RM-style PRs, swap `isPR()` in `src/data/db.js`.
- **Sync is idempotent but not dedupe-safe** — if the same set is somehow retried and both succeed, you'll get duplicate rows in Notion. For v1 the risk is low; for v2, add a `Session ID + Set Number` unique lookup before insert.
- **Bodyweight sets** log with `weight = 0` → zero tonnage. Enter your body mass (e.g. 75) to make bodyweight volume count.

## File map

```
src/
  main.jsx               React root
  App.jsx                Tab switcher + sync status + toast
  styles.css             All CSS — dark charcoal / bone / crimson
  data/
    exerciseLibrary.js   60 seeded exercises from your Notion PPL pages
    db.js                Dexie schema + set / sync-queue helpers
    sync.js              Background queue flusher
    volume.js            Tonnage math, week helpers, heatmap grading
  components/
    LogScreen.jsx        Day → Sub-muscle → Exercise → Log sets
    HeatmapScreen.jsx    Week nav + body SVG + muscle list
    BodyHeatmap.jsx      Front + back SVG silhouettes
server/
  index.js               Express → Notion SDK
  .env.example           Env template
```
