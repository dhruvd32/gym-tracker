# gym.ledger

A personal gym tracking PWA for Push / Pull / Legs / Core workouts.

## What it does

- **Log sets** — pick your day type, select an exercise, enter weight and reps, tap Log. Each set is saved instantly.
- **PR detection** — automatically flags a set as a personal record if it beats your best weight × reps for that exercise.
- **Notion sync** — every logged set is queued and pushed to a Notion database in the background, giving you a permanent, queryable workout log.
- **Muscle heatmap** — visualises weekly training volume per muscle group so you can spot imbalances at a glance.
- **Works offline** — because data is written to the device first, the app functions without any internet connection. Syncs when connectivity returns.
- **Installable** — ships as a PWA, so Chrome will offer to add it to your home screen and it launches like a native app.

## Why it is designed this way

### Local-first with Dexie (IndexedDB)

All workout data is written to the browser's built-in IndexedDB database via [Dexie.js](https://dexie.org) before anything else happens. This means:

- Logging a set is instant — no waiting for a network round-trip.
- The app is fully usable at the gym with no signal.
- Your data is never lost if the sync server is unreachable.

### Notion as the backend

Rather than building and maintaining a custom database, Notion acts as the persistent store. This gives you a structured, filterable, shareable workout log with zero backend infrastructure to maintain. Notion's API is called from the server side only — the token never reaches the browser.

### Sync queue

A `syncQueue` table in IndexedDB acts as a reliable outbox. When a set is logged it is added to the queue; the sync worker drains the queue whenever the device is online. Failed attempts are retried on the next flush (page focus, connectivity restored, or every 60 seconds).

## Deployment: Cloudflare Pages + Functions

**Why a server is still needed:** Notion's API does not allow direct browser requests (CORS is blocked). A thin server-side layer is required to hold the API token and proxy writes to Notion.

**Why Cloudflare:** Free tier covers this app indefinitely (unlimited static requests, 100k Worker invocations per day). One deployment URL works on every device without needing your laptop to be on.

### Architecture after deployment

```
Phone / browser
    │
    │  HTTPS
    ▼
Cloudflare Pages  (serves the built React app)
    │
    │  /api/sync-set  (same domain — no CORS)
    ▼
Cloudflare Pages Function  (functions/api/sync-set.js)
    │
    │  NOTION_TOKEN from CF environment secrets
    ▼
Notion API  →  Workout Log database
```

### How to deploy (one-time setup)

1. **Push this repo to GitHub** (create a free account if needed).
2. **Create a free Cloudflare account** at cloudflare.com.
3. In the Cloudflare dashboard → **Pages** → **Create a project** → **Connect to Git** → select your repo.
4. Set the build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Under **Environment variables**, add:
   - `NOTION_TOKEN` — your Notion integration secret
   - `NOTION_WORKOUT_DB_ID` — `c2045ab8-72f1-4b10-a538-be33008af84b`
6. Click **Save and Deploy**.
7. Cloudflare gives you a URL like `https://gym-ledger.pages.dev` — open it on your phone, add to home screen, done.

Every future `git push` to your main branch will automatically redeploy.
