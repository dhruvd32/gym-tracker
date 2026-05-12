# Exercise Library & UI Enhancements

## Goal

Expand the exercise library, tighten up the day-picker UX, and make the body heatmap more anatomically precise — showing individual sub-muscles (e.g. triceps long head vs lateral head) rather than grouping everything into coarse "All Heads" buckets.

---

## Changes Made

### 1. Core Day — Exercises Added
**File:** `src/data/exerciseLibrary.js`

Core day previously showed a placeholder message ("Core exercises aren't seeded yet"). Twelve exercises have been added across four sub-muscle categories:

| Sub-muscle | Exercises |
|---|---|
| Upper Abs (Rectus Abdominis) | Cable Crunch, Decline Sit-Up, Ab Wheel Rollout |
| Lower Abs (Rectus Abdominis) | Hanging Leg Raise, Lying Leg Raise, Captain's Chair Knee Raise |
| Obliques | Russian Twist, Cable Woodchopper, Bicycle Crunch, Pallof Press |
| Deep Core (Transverse Abdominis) | Plank, Dead Bug |

The placeholder branch in `LogScreen.jsx` was removed — Core day now flows through the same sub-muscle picker as Push/Pull/Legs.

---

### 2. Pull Day — Rear Delts Combined
**File:** `src/data/exerciseLibrary.js`

Face Pull and Rear Delt Dumbbell Fly were previously split across two different sub-muscle entries under `primaryGroup: 'Back'`:
- `Back → Rear Delts / Upper Traps`
- `Back → Rear Delts (Posterior)`

Both are now unified under a single entry:
- `Shoulders → Rear Delts`

This means the sub-muscle picker on Pull day shows one "Rear Delts" chip instead of two, and both exercises appear together when selected.

---

### 3. Legs Day — Simplified to 4 Groups
**Files:** `src/data/exerciseLibrary.js`, `src/components/LogScreen.jsx`

Previously, Legs day exposed very granular sub-muscle labels in the picker (e.g. "Bilateral — Rectus Femoris / Vastus", "Unilateral — Rectus Femoris / Vastus", "Long Head (Hip Hinge / Hip Flexion)"). This made the picker cluttered and hard to navigate.

**Decision:** For the picker UI, Legs day groups exercises by `primaryGroup` only, showing exactly four chips: **Calves, Glutes, Hamstrings, Quads**. All exercises for that group appear when one is selected.

The detailed `primarySub` values on each exercise are preserved — they're still used for tonnage distribution and the heatmap sub-muscle breakdown. Only the picker presentation is simplified.

Two helper functions were added to `exerciseLibrary.js`:
- `muscleGroupsForDay(day)` — returns unique primary groups for a day (used for the simplified legs picker)
- `exercisesForGroup(day, group)` — returns all exercises for a group regardless of sub-muscle (used when a group-level chip is tapped)

---

### 4. Triceps Sub-muscles Split
**File:** `src/data/exerciseLibrary.js`

All "All Heads" references for Triceps were replaced with anatomically specific head names:

| Movement type | Maps to |
|---|---|
| Overhead / stretch movements (OHP, skullcrushers, overhead extensions) | Long Head |
| Pressing / pushdown movements (bench press variants, pushdowns, machine press) | Lateral Head |
| Dips | Long Head (arm travels behind body, stretching the long head) |

This affects both `primarySub` values (e.g. Close-Grip Bench, Diamond Push-Ups) and secondary contributions on compound exercises (e.g. bench press variants now contribute to `Triceps — Lateral Head` instead of `Triceps — All Heads`).

The result: the heatmap sub-muscle breakdown and the LogScreen picker now show Long Head and Lateral Head as distinct entries.

---

### 5. Body Diagram in Sub-picker
**Files:** `src/components/LogScreen.jsx`, `src/components/BodyHeatmap.jsx`, `src/styles.css`

A `BodyHeatmap` is now rendered above the sub-muscle chips whenever the user taps "+ Add Exercise". It operates in **highlight mode** (new `highlightGroups` prop on `BodyHeatmap`):
- When no chip is focused: all muscle groups trained that day are highlighted in accent colour, the rest are dimmed.
- When a chip is pressed (`onPointerDown`): only that chip's muscle group highlights. The highlight resets on `onPointerUp` / `onPointerLeave`.
- After navigating into the exercise list for a specific sub-muscle, a smaller version of the diagram persists, highlighting just the relevant group.

**Decision on interaction:** `onPointerDown` + `onPointerUp` was used instead of hover (hover doesn't exist on mobile). This gives instant visual feedback on press before the tap resolves to navigation.

**`BodyHeatmap` changes:** Added a `highlightGroups: Set<string>` prop. When present, the component bypasses tonnage-based coloring and instead renders highlighted groups in `var(--accent)` and dimmed groups in `var(--grade-untrained)`. When absent, existing heatmap behavior is unchanged.

---

### 6. Sub-muscle Breakdown Always Visible in Heatmap
**Files:** `src/components/HeatmapScreen.jsx`, `src/styles.css`

Previously the sub-muscle breakdown in the heatmap screen was hidden behind a tap — you had to tap a muscle group row to expand it. Now sub-muscle bars render inline below each muscle group row automatically, whenever there is more than one distinct sub-muscle with volume.

Each sub-muscle row shows:
- Sub-muscle name
- A proportional fill bar (relative to the group total), colored by the group's heatmap grade
- Tonnage in kg

Muscle groups with zero volume this week are filtered out of the list entirely (previously they showed as "Untouched" rows, adding noise).

---

## Files Changed

| File | What changed |
|---|---|
| `src/data/exerciseLibrary.js` | Added 12 core exercises; combined rear delts; split triceps heads; simplified legs sub-muscle labels; added `muscleGroupsForDay` and `exercisesForGroup` helpers |
| `src/components/LogScreen.jsx` | Added body diagram to sub-picker; dynamic highlight on chip press; simplified legs to group-level picker; Core day now shows exercises |
| `src/components/BodyHeatmap.jsx` | Added `highlightGroups` prop for highlight mode |
| `src/components/HeatmapScreen.jsx` | Sub-muscle bars always visible inline; zero-volume groups filtered |
| `src/styles.css` | Added `.body-picker-wrap`, `.sub-muscle-breakdown`, `.sub-muscle-row`, `.sub-bar-track`, `.sub-bar-fill` styles |
