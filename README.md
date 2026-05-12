# gym.ledger

A personal gym-tracking PWA for Push / Pull / Legs / Core workouts. Builds a full session locally, commits the whole workout in one tap, and syncs every set to a Supabase (Postgres) database — accessible from any device, any browser, without ever losing history.

---

## What it does

- **Session builder** — pick a day type, add exercises and sets, tap **Log Day** once to commit. An in-progress session persists to `localStorage` so you won't lose it if the tab closes mid-workout.
- **PR detection** — automatically flags a set as a personal record when its `weight × reps` beats every prior set for that exercise.
- **Supabase sync** — every logged set is queued and pushed to Postgres in the background. Edits and deletions propagate the same way.
- **History** — reverse-chronological list of every session. Expand to see sets; edit weight/reps or delete individual sets / whole sessions.
- **Muscle heatmap** — weekly front/back body SVG graded by total tonnage per muscle group.
- **Works offline** — writes happen to IndexedDB first; the sync queue drains when connectivity returns.
- **Multi-device** — log on your phone, check history on your laptop. Data lives in Supabase, not the browser.
- **Installable** — ships as a PWA. Chrome/Safari offer "Add to Home screen"; the app launches standalone.

---

## Architecture

```
┌─────────────────────────────────────────┐
│  React PWA  (gym-tracker-jc4.pages.dev) │
│                                         │
│  IndexedDB / Dexie  ← read cache        │
│  localStorage       ← draft session     │
│  syncQueue          ← write outbox      │
└──────────────────┬──────────────────────┘
                   │  Supabase JS client
                   │  (HTTPS, direct — no proxy)
                   ▼
┌─────────────────────────────────────────┐
│  Supabase (hosted Postgres)             │
│                                         │
│  Auth     — Google OAuth 2.0            │
│  Database — workout_sets table          │
│  RLS      — users see only their rows   │
└─────────────────────────────────────────┘
```

**Hosting:** Cloudflare Pages (static site, free tier, stable `*.pages.dev` domain)  
**Database:** Supabase free tier (500 MB Postgres, unlimited auth)  
**Auth:** Supabase Auth with Google OAuth 2.0 — no passwords stored anywhere

---

## Why each technology was chosen

### React + Vite
Standard, fast SPA toolchain. Vite's build times are near-instant. No framework lock-in — the app is plain React with no router, no state library.

### Dexie (IndexedDB) — local cache
All writes go to IndexedDB first via [Dexie.js](https://dexie.org):
- Logging a set is **instant** — no waiting for a network round-trip.
- The app is **fully usable offline** at the gym with no signal.
- Data is **never lost** if Supabase is unreachable.

IndexedDB is now a **read-through cache**, not the source of truth. On login, the app pulls from Supabase and populates IndexedDB. Subsequent visits use IndexedDB instantly, then delta-sync from Supabase in the background.

### Supabase — database + auth
[Supabase](https://supabase.com) is an open-source Firebase alternative built on Postgres. Chosen because:
- **One service, two problems solved** — auth (Google OAuth) and database (Postgres) in a single free-tier project.
- **Row Level Security (RLS)** — a Postgres policy enforces that every query is automatically filtered to `WHERE user_id = auth.uid()`. Users can never see each other's data, even if they tried.
- **Anon key is safe to ship in the frontend** — the key has no power beyond what RLS allows. There is no server-side proxy needed.
- **Free tier scales** — 500 MB Postgres, unlimited auth users, 2 GB bandwidth. Plenty for a personal tracker growing to dozens of users.
- **Open source** — can be self-hosted on any VPS if the hosted free tier is ever discontinued.

### Supabase Auth — Google OAuth
Google OAuth was chosen over email/password because:
- No password management (no reset flows, no hashing, no breaches).
- Users already have a Google account.
- Supabase wraps the entire OAuth dance — the app only calls `signInWithOAuth({ provider: 'google' })`.

### Cloudflare Pages — hosting
- **Free, unlimited** static hosting.
- **Stable domain** — `gym-tracker-jc4.pages.dev` never changes between deployments. Each commit gets its own preview URL (e.g. `abc123.gym-tracker-jc4.pages.dev`) but the production domain is permanent.
- **Auto-deploy** — every push to `master` triggers a build and deploy.
- **No Cloudflare Functions needed anymore** — previously the app used Pages Functions as a proxy to Notion (to hide the Notion token). With Supabase, the anon key is designed to be public and RLS replaces server-side access control. The proxy layer was removed entirely.

### PWA (vite-plugin-pwa + Workbox)
- Precaches all static assets so the app loads instantly on repeat visits.
- Enables "Add to Home screen" on iOS and Android — the app launches fullscreen, no browser chrome.
- The service worker handles asset caching only; it does not intercept API calls to Supabase.

---

## Data model

### Supabase (Postgres) — source of truth

```sql
workout_sets (
  id            UUID        PRIMARY KEY  -- Supabase-generated
  user_id       UUID        → auth.users -- RLS key
  session_id    TEXT        -- groups sets into a workout session
  date          DATE
  day_type      TEXT        -- Push | Pull | Legs | Core
  exercise_name TEXT
  primary_group TEXT        -- major muscle group
  primary_sub   TEXT        -- sub-muscle
  primary_pct   NUMERIC     -- % of tonnage credited to primary muscle
  compound      BOOLEAN
  set_number    INTEGER
  weight_kg     NUMERIC
  reps          INTEGER
  is_pr         BOOLEAN
  created_at    TIMESTAMPTZ
  updated_at    TIMESTAMPTZ -- auto-bumped by trigger on UPDATE
)
```

RLS policy: `FOR ALL USING (auth.uid() = user_id)` — one policy covers SELECT, INSERT, UPDATE, DELETE.

### IndexedDB / Dexie — local cache

| Table | Purpose |
|---|---|
| `sets` | Mirror of `workout_sets`. `supabaseId` stores the remote UUID. `synced` flag tracks push status. |
| `sessions` | Derived from sets — used to group the History view. |
| `syncQueue` | Write outbox. Each row has an `action` (`create` / `update` / `delete`) and retries with backoff. |
| `meta` | Key/value store. Holds `lastSyncAt` ISO timestamp for delta syncs. |

### Schema versions
- **v1** — initial (sets, sessions, syncQueue)
- **v2** — syncQueue gains `action` field; sets gain `notionPageId` (Notion era)
- **v3** — switched to Supabase: `notionPageId` → `supabaseId`, added `meta` table, local data cleared on upgrade (re-pulled from Supabase on login)

---

## Sync engine

### Write path (local → Supabase)

```
User logs set
  → write to IndexedDB (instant, optimistic)
  → add 'create' job to syncQueue
  → flushSyncQueue() fires
      → supabase.from('workout_sets').insert(...)
      → on success: mark set synced, store supabaseId
      → on failure: bump attempt counter, retry next flush
```

The flusher is **single-flight** (concurrent calls are no-ops), and is triggered:
- On app mount
- After every write
- On `online` event (device reconnects)
- On `visibilitychange` (user returns to tab)
- Every 60 seconds

### Read path (Supabase → local)

```
User logs in
  → pullFromSupabase()
      → read lastSyncAt from meta table
      → if first login: fetch ALL sets for user
      → if returning: fetch sets WHERE updated_at > lastSyncAt (delta)
      → upsert into IndexedDB (match by supabaseId)
      → derive session records from sets
      → update lastSyncAt = now()
  → flushSyncQueue() (push any pending local writes)
```

**Conflict resolution:** last write wins on `updated_at`. Since this is a single-user app, conflicts only arise from simultaneous edits on two devices — a very rare edge case.

---

## Auth flow

```
1. User opens app
2. Supabase checks for existing session (localStorage token)
3a. Session found → skip to step 7
3b. No session → show AuthScreen
4. User clicks "Continue with Google"
5. supabase.auth.signInWithOAuth({ provider: 'google' })
   → Supabase redirects to Google
   → Google authenticates user
   → Google redirects to: https://<ref>.supabase.co/auth/v1/callback
   → Supabase exchanges code for tokens, redirects to app
6. App receives session via onAuthStateChange listener
7. pullFromSupabase() loads user's data into IndexedDB
8. App renders — IndexedDB powers all UI
```

Session tokens are stored in `localStorage` by the Supabase JS client and refreshed automatically.

---

## Setup (new machine / new developer)

### Prerequisites
- Node.js 18+
- A Supabase project (free at [supabase.com](https://supabase.com))
- A Google Cloud OAuth 2.0 client (free at [console.cloud.google.com](https://console.cloud.google.com))

### 1. Supabase — create the table

In Supabase → SQL Editor, run the contents of [`supabase/schema.sql`](supabase/schema.sql). This creates the `workout_sets` table, indexes, RLS policy, and the `updated_at` trigger.

### 2. Supabase — enable Google OAuth

In Supabase → Authentication → Providers → Google:
- Paste your Google **Client ID** and **Client Secret**
- Enable the toggle → Save

In Supabase → Authentication → URL Configuration:
- **Site URL:** `https://gym-tracker-jc4.pages.dev`
- **Redirect URLs:** `https://gym-tracker-jc4.pages.dev/**`

### 3. Google Cloud Console — OAuth client

In [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID:
- Application type: **Web application**
- Authorized redirect URIs: `https://<supabase-ref>.supabase.co/auth/v1/callback`
- Authorized JavaScript origins: `https://gym-tracker-jc4.pages.dev`

In OAuth consent screen → add your Google email as a **Test user** (required while app is in Testing mode).

> Note: Google credential changes can take up to a few hours to propagate.

### 4. Local development

```bash
npm install

# Copy env template and fill in your Supabase credentials
cp .env.example .env.local
# VITE_SUPABASE_URL=https://<ref>.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJ...

npm run dev
# → http://localhost:5173
```

### 5. Deploy to Cloudflare Pages

1. Push repo to GitHub
2. Cloudflare Pages → Connect to Git → select repo
3. Build command: `npm run build` / Output: `dist`
4. Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Save and Deploy → `https://gym-tracker-jc4.pages.dev`

Every push to `master` auto-redeploys. The domain never changes.

---

## Migrating from the old Notion-based version

The v3 IndexedDB upgrade clears local data automatically (it will be re-pulled from Supabase). To migrate your Notion workout history into Supabase:

### 1. Log in to the new app first

Open `https://gym-tracker-jc4.pages.dev`, sign in with Google. Your user UUID appears in Supabase → Authentication → Users.

### 2. Set up migration credentials

```bash
cp scripts/.env.example scripts/.env
# Fill in:
#   NOTION_TOKEN           — your old Notion integration secret
#   NOTION_WORKOUT_DB_ID   — c2045ab8-72f1-4b10-a538-be33008af84b
#   SUPABASE_URL           — https://<ref>.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY — from Supabase → Settings → API
#   USER_ID                — your UUID from step 1
```

### 3. Run the migration

```bash
npm install @notionhq/client @supabase/supabase-js dotenv --prefix scripts
node scripts/migrate-from-notion.mjs
```

The script paginates through all Notion pages (100 at a time), transforms each row to the Supabase schema, and batch-inserts them. It prints progress and a summary when done.

### 4. Refresh the app

Pull-to-refresh or close and reopen — all history loads from Supabase.

---

## Usage

1. **Log tab** — tap **Push / Pull / Legs / Core** → Session Builder opens.
2. Tap **+ Add Exercise** → pick sub-muscle → pick exercise.
3. Enter weight + reps → **+ Set**. Inputs retain the last values (same weight next set is common).
4. **← Back to session** → add another exercise or keep adding sets.
5. **Log Day · N sets** — commits to IndexedDB and queues sync to Supabase. Toast confirms.
6. **Heatmap tab** — weekly volume visualised as a body SVG. Navigate weeks with ← →.
7. **History tab** — all sessions, newest first. Expand → edit/delete sets → changes sync to Supabase.

The sync chip in the header shows `Synced` / `Syncing…` / `N pending` / `Offline`.

---

## Customising weekly targets

Tonnage targets per muscle group (in kg) live in [`src/data/volume.js`](src/data/volume.js) under `WEEKLY_TARGETS`:

| Key | Meaning | Heatmap colour |
|---|---|---|
| `min` | Below this — under-trained | Dim red |
| `peak` | On target | Orange |
| `over` | Above this — overloaded | Bright yellow |

---

## File map

```
src/
  main.jsx                   React root
  App.jsx                    Auth gate + tab switcher + sync chip + toast
  styles.css                 All CSS — dark charcoal / bone / crimson
  data/
    supabase.js              Supabase client singleton + signInWithGoogle / signOut
    db.js                    Dexie schema (v3) + CRUD helpers
    sync.js                  Sync engine: flushSyncQueue + pullFromSupabase
    draft.js                 localStorage-backed in-progress session
    volume.js                Tonnage math, week helpers, heatmap grading
    exerciseLibrary.js       ~60 exercises with primary/secondary muscle %
  components/
    AuthScreen.jsx           Google sign-in screen (shown when not logged in)
    LogScreen.jsx            Day → sub-muscle → exercise → Session Builder → Log Day
    HeatmapScreen.jsx        Week nav + body SVG + muscle breakdown list
    BodyHeatmap.jsx          Front + back SVG silhouettes with muscle colouring
    HistoryScreen.jsx        Session list, expand, edit/delete sets and sessions
supabase/
  schema.sql                 Run once in Supabase SQL Editor to create table + RLS
scripts/
  migrate-from-notion.mjs   One-time Notion → Supabase data migration
  .env.example              Credentials template for the migration script
.env.example                Vite env template (VITE_SUPABASE_URL / ANON_KEY)
```

---

## Known gaps / future work

- **Core Day** is under-seeded — add Core exercises to [`exerciseLibrary.js`](src/data/exerciseLibrary.js).
- **RPE / set quality** isn't captured. Add a `rpe` column to `workout_sets` and a number input to the set row.
- **PR detection** is tonnage-based (`weight × reps`). For 1RM-style PRs, swap `isPR()` in [`db.js`](src/data/db.js).
- **Bodyweight sets** log with `weight = 0` → zero tonnage. Enter your body mass to make bodyweight volume count.
- **Sync deduplication** — the queue is idempotent client-side, but a network timeout after a successful Supabase insert could cause a duplicate `create` attempt. Mitigation: add a `(user_id, session_id, set_number, exercise_name)` unique constraint to `workout_sets`.
- **Multi-user** — the schema and RLS already support multiple users. Adding new users just requires sharing the app URL; each person logs in with their own Google account and sees only their data.
