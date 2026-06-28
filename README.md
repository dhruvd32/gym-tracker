# gym.ledger

A personal gym-tracking PWA for Push / Pull / Legs / Core workouts. Builds a full session locally, commits the whole workout in one tap, and syncs every set to Firebase Firestore — accessible from any device, any browser, without losing history.

> For an end-user walkthrough (install to home screen, day-to-day usage, screenshots), see [`USER_GUIDE.md`](USER_GUIDE.md).

---

## What it does

- **Session builder** — pick a day type, add exercises and sets, tap **Log Day** once to commit. An in-progress session persists to `localStorage` so you won't lose it if the tab closes mid-workout.
- **Visual muscle picker** — the exercise picker renders the body SVG; tap a muscle group / sub-muscle to highlight it on the diagram, then **SELECT** to see the exercises that train it.
- **Reps or time** — exercises tagged `measureType: 'time'` (planks, dead hangs) log a duration in seconds instead of reps; everything else logs reps.
- **Single-arm / unilateral exercises** — exercises tagged `unilateral` (single-arm rows, Bulgarian split squats, single-leg RDLs, …) are logged **one side at a time**; the effective tonnage is automatically doubled to count both sides. The set editor labels the field "Weight (kg/side)".
- **Bodyweight exercises** — exercises tagged `bodyweight` (pull-ups, dips, sit-ups, planks, …) use your stored bodyweight as the load. Each carries a `bwLoad` factor — the fraction of bodyweight the target muscle actually resists (pull-up ≈ 1.0, sit-up ≈ 0.12) — so effective load = `bodyweight × bwLoad + addedWeight`. You enter only the **added** weight (belt/plate/dumbbell, 0 for pure bodyweight), and set your bodyweight once in the editor.
- **PR detection** — automatically flags a set as a personal record when its **effective tonnage** (weight × reps, with bodyweight and unilateral handling applied) beats every prior set for that exercise.
- **Firestore sync** — every logged set is queued and pushed to Firestore in the background. Edits and deletions propagate the same way. Bodyweight sets carry the body mass used so historical tonnage stays stable.
- **History** — reverse-chronological list of every session. Expand to see sets; edit weight/reps or delete individual sets / whole sessions. Bodyweight and per-side sets are shown and totalled with their effective tonnage.
- **Muscle heatmap** — weekly front/back body SVG graded by total tonnage per muscle group. Every region of a trained muscle is shaded by that muscle's group-level tonnage, so secondary work (e.g. glutes from squats) reliably lights up; the sub-muscle breakdown lives in the list below the diagram.
- **Works offline** — writes happen to IndexedDB first; the sync queue drains when connectivity returns.
- **Multi-device** — log on your phone, check history on your laptop. Source of truth lives in Firestore, not the browser.
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
                   │  Firebase JS SDK
                   │  (HTTPS, direct — no proxy)
                   ▼
┌─────────────────────────────────────────┐
│  Firebase (Google Cloud)                │
│                                         │
│  Auth      — Google OAuth via Firebase  │
│  Firestore — users/{uid}/workout_sets/  │
│  Rules     — users see only their docs  │
└─────────────────────────────────────────┘
```

**Hosting:** Cloudflare Pages (static, free, stable `*.pages.dev` domain)
**Database:** Firebase Firestore (Spark / free tier — 50k reads, 20k writes per day)
**Auth:** Firebase Authentication with Google sign-in — no passwords stored anywhere

---

## Why each technology was chosen

### React + Vite
Standard, fast SPA toolchain. Vite's build times are near-instant. No framework lock-in — plain React, no router, no state library.

### Dexie (IndexedDB) — local cache
All writes go to IndexedDB first via [Dexie.js](https://dexie.org):
- Logging a set is **instant** — no waiting for a network round-trip.
- The app is **fully usable offline** at the gym with no signal.
- Data is **never lost** if Firestore is unreachable.

IndexedDB is a **read-through cache**, not the source of truth. On login, the app pulls from Firestore and populates IndexedDB. Subsequent visits use IndexedDB instantly, then delta-sync from Firestore in the background.

### Firebase — auth + database
[Firebase](https://firebase.google.com) was chosen after an extended battle with Supabase's OAuth flow that we couldn't resolve. Firebase's tradeoffs for this app:
- **Bulletproof Google OAuth** — Firebase IS Google's identity stack. The OAuth dance is invisible: `signInWithPopup(auth, googleProvider)`.
- **Auth + database in one project** — no separate services to wire up.
- **Security rules enforce isolation** — Firestore rules pin every read/write to `request.auth.uid`, so users can only see their own documents.
- **Free tier is generous for personal use** — 50k Firestore reads, 20k writes, 1 GiB storage per day. A single user logs ~50 writes/week.
- **Web config is safe to ship in the frontend** — the API key is a public identifier, not a secret. Security rules do the actual access control.

**Tradeoff:** Firebase is not open-source. If you want strictly open-source, swap to [Pocketbase](https://pocketbase.io) (self-hostable, SQLite-backed, has built-in Google OAuth).

### Firebase Auth — Google sign-in via popup
The app uses `signInWithPopup` because Chrome's third-party storage partitioning breaks `signInWithRedirect` (the auth state is lost during the cross-origin redirect chain through `firebaseapp.com`). Popup-based auth keeps everything in the same origin context and works reliably.

### Cloudflare Pages — hosting
- **Free, unlimited** static hosting.
- **Stable domain** — `gym-tracker-jc4.pages.dev` never changes. Each commit gets its own preview URL but the production domain is permanent.
- **Auto-deploy** — every push to `master` triggers a build.
- **No server-side code needed** — Firebase JS SDK talks directly to Firebase from the browser. Cloudflare just serves static assets.

### PWA (vite-plugin-pwa + Workbox)
- Precaches all static assets so the app loads instantly on repeat visits.
- Enables "Add to Home screen" — the app launches fullscreen, no browser chrome.
- The service worker handles asset caching only; it does not intercept calls to Firebase.

---

## Data model

### Firestore — source of truth

Documents live under a per-user subcollection so security rules are trivial:

```
users/{uid}/workout_sets/{setId}
  session_id     string   — groups sets into a workout session
  date           string   — ISO date (YYYY-MM-DD)
  day_type       string   — "Push (Chest)" | "Push (Shoulders)" | "Pull" | "Legs" | "Core"
  exercise_name  string
  primary_group  string   — major muscle group
  primary_sub    string   — sub-muscle
  primary_pct    number   — % of tonnage credited to primary muscle
  compound       boolean
  set_number     number
  weight_kg      number   — added load for bodyweight exercises; per-side load for unilateral
  reps           number   — for time-based exercises this holds the duration in seconds
  bodyweight_kg  number   — body mass used (only set for bodyweight exercises); null otherwise
  is_pr          boolean
  created_at     timestamp  — serverTimestamp() on create
  updated_at     timestamp  — serverTimestamp() on every write
```

Security rule (paste into Firestore → Rules tab):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/workout_sets/{setId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### IndexedDB / Dexie — local cache

| Table | Purpose |
|---|---|
| `sets` | Mirror of `workout_sets`. `remoteId` stores the Firestore document ID. `synced` flag tracks push status. |
| `sessions` | Derived from sets — used to group the History view. |
| `syncQueue` | Write outbox. Each row has an `action` (`create` / `update` / `delete`) and retries with backoff. |
| `meta` | Key/value store. Holds `lastSyncAt` ISO timestamp for delta syncs. |

### Schema versions
- **v1** — initial (sets, sessions, syncQueue)
- **v2** — syncQueue gains `action` field; sets gain `notionPageId` (Notion era)
- **v3** — switched to Supabase: `notionPageId` → `supabaseId`, added `meta` table
- **v4** — switched to Firebase: `supabaseId` → `remoteId` (backend-agnostic name), local data cleared on upgrade (re-pulled from Firestore on login)

---

## Sync engine

### Write path (local → Firestore)

```
User logs set
  → write to IndexedDB (instant, optimistic)
  → add 'create' job to syncQueue
  → flushSyncQueue() fires
      → addDoc(users/{uid}/workout_sets, {...})
      → on success: mark set synced, store remoteId
      → on failure: bump attempt counter, retry next flush
```

The flusher is **single-flight** (concurrent calls are no-ops), and is triggered:
- On app mount (after auth)
- After every write
- On `online` event (device reconnects)
- On `visibilitychange` (user returns to tab)
- Every 60 seconds

### Read path (Firestore → local)

```
User signs in
  → pullFromFirestore()
      → read lastSyncAt from meta table
      → if first login: fetch ALL sets in users/{uid}/workout_sets
      → if returning: fetch where updated_at > lastSyncAt (delta)
      → upsert into IndexedDB (match by remoteId)
      → derive session records from sets
      → update lastSyncAt = now()
  → flushSyncQueue() (push any pending local writes)
```

**Conflict resolution:** last write wins on `updated_at`. Since this is a single-user app, conflicts only arise from simultaneous edits on two devices — a rare edge case.

---

## Auth flow

```
1. User opens app
2. Firebase checks for existing session (IndexedDB-backed by Firebase SDK)
3a. Session found → onAuthStateChanged fires with user → skip to step 7
3b. No session → show AuthScreen
4. User clicks "Continue with Google"
5. signInWithPopup(auth, googleProvider)
   → Popup opens to Google sign-in
   → User authenticates on Google
   → Popup closes, promise resolves with signed-in user
7. onAuthStateChanged fires → setUser(user) → App renders LogScreen
8. pullFromFirestore() loads user's data into IndexedDB
```

Session persistence is handled by the Firebase SDK (IndexedDB-backed by default on web).

---

## Setup (new machine / new developer)

### Prerequisites
- Node.js 18+
- A free Firebase project ([console.firebase.google.com](https://console.firebase.google.com))

### 1. Create the Firebase project

1. Firebase Console → **Add project** → name it (e.g. "gym-ledger"). Skip Analytics.
2. After it's created, click the **`</>`** icon to add a **web app**. Register with any nickname.
3. On the next screen, copy the `firebaseConfig` object — the 6 values go into Cloudflare Pages env vars (step 4).

### 2. Enable Google sign-in

1. Sidebar → **Authentication** → **Get started**
2. Sign-in providers → **Google** → toggle **Enable**
3. Set a support email → **Save**
4. Settings tab → **Authorized domains** → **Add domain** → `gym-tracker-jc4.pages.dev` (and any preview/custom domains)

### 3. Create the Firestore database

1. Sidebar → **Firestore Database** → **Create database**
2. **Production mode** (rules added next)
3. Pick a region close to you (e.g. `asia-south1` for India). **This is permanent.**
4. Rules tab → replace with:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/workout_sets/{setId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
5. **Publish**.

### 4. Local development

```bash
npm install

cp .env.example .env.local
# Paste the 6 Firebase values from step 1

npm run dev
# → http://localhost:5173
```

For local dev, also add `localhost` to Firebase Authentication → Authorized domains.

### 5. Deploy to Cloudflare Pages

1. Push repo to GitHub.
2. Cloudflare Pages → Connect to Git → select repo.
3. Build command: `npm run build` / Output: `dist`
4. Environment Variables (all on **Production**):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
5. Save and Deploy → `https://gym-tracker-jc4.pages.dev`.

Every push to `master` auto-redeploys. The domain never changes.

---

## Usage

1. **Log tab** — tap **Push · Chest / Push · Shoulders / Pull / Legs / Core** → Session Builder opens.
2. Tap **+ Add Exercise** → the body diagram highlights as you tap a muscle group / sub-muscle → **SELECT** → pick an exercise. (Legs day picks by muscle group; the others pick by sub-muscle.)
3. Enter weight + reps — or **Time (s)** for time-based holds — then **+ Set**. Inputs retain the last values (same weight next set is common).
4. **← Back to session** → add another exercise or keep adding sets.
5. **Log Day · N sets** — commits to IndexedDB and queues sync to Firestore. Toast confirms.
6. **Heatmap tab** — weekly volume visualised as a body SVG. Navigate weeks with ← →.
7. **History tab** — all sessions, newest first. Expand → edit/delete sets → changes sync to Firestore.

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
    firebase.js              Firebase app init + auth + Firestore singleton
    db.js                    Dexie schema (v4) + CRUD helpers
    sync.js                  Sync engine: flushSyncQueue + pullFromFirestore
    draft.js                 localStorage-backed in-progress session
    settings.js              localStorage-backed user settings (bodyweight)
    volume.js                Tonnage math (setVolume + bodyweight/unilateral handling), week helpers, heatmap grading
    exerciseLibrary.js       ~75 Push/Pull/Legs/Core exercises with primary/secondary muscle %, measureType, and unilateral / bodyweight + bwLoad flags
  components/
    AuthScreen.jsx           Google sign-in screen
    LogScreen.jsx            Day → sub-muscle → exercise → Session Builder → Log Day
    HeatmapScreen.jsx        Week nav + body SVG + muscle breakdown list
    BodyHeatmap.jsx          Front + back SVG silhouettes with muscle colouring
    HistoryScreen.jsx        Session list, expand, edit/delete sets and sessions
.env.example                 Firebase env template (6 VITE_FIREBASE_* vars)
```

---

## Known gaps / future work

- **RPE / set quality** isn't captured. Add an `rpe` field and a number input to the set row.
- **PR detection** is tonnage-based (effective `weight × reps`). For 1RM-style PRs, swap `isPR()` in [`db.js`](src/data/db.js).
- **Bodyweight tonnage is applied going forward.** Each bodyweight exercise has a hand-tuned `bwLoad` factor and the body mass is stamped on every new set. Sets logged *before* this feature (which stored body mass in `weight_kg` directly) are not retroactively recalculated — a one-time migration would be needed to back-fill `bodyweight_kg` and reset `weight_kg` to the added load.
- **`bwLoad` factors are approximations.** They're reasonable defaults, not biomechanically measured; tune them in [`exerciseLibrary.js`](src/data/exerciseLibrary.js) to taste.
- **Sync deduplication** — the queue is idempotent client-side, but a network timeout after a successful Firestore write could cause a duplicate `create`. Mitigation: include a deterministic ID derived from `(session_id, set_number, exercise_name)` and use `setDoc` instead of `addDoc`.
- **Multi-user** — the per-user subcollection layout already supports multiple users. Anyone with a Google account can use the deployed app; each user sees only their own documents.
