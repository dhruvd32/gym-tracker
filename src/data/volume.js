import { findExercise, MUSCLE_GROUPS } from './exerciseLibrary.js';

// ——— Week helpers (Mon–Sun, per user preference) ———

export function startOfWeekMon(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();              // 0 = Sun, 1 = Mon, ...
  const diff = (day + 6) % 7;          // days since Monday
  d.setDate(d.getDate() - diff);
  return d;
}

export function endOfWeekSun(date = new Date()) {
  const start = startOfWeekMon(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function toIsoDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function weekLabel(start = startOfWeekMon(), end = endOfWeekSun()) {
  const fmt = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-GB', fmt)} — ${end.toLocaleDateString('en-GB', fmt)}`;
}

// ——— Effective tonnage per set ———

// Effective per-set tonnage, accounting for exercise type:
//   • bodyweight exercises  → (bodyweight × bwLoad + addedWeight) × reps
//   • unilateral exercises  → doubled (the user logs one side, both sides count)
//   • everything else       → weight × reps
//
// `ex` is the library entry (may be undefined). `bodyweightKg` is the lifter's
// body mass to use for bodyweight movements — stamped onto the set at log time so
// historical weeks stay stable even if bodyweight changes later.
export function setVolumeFor(ex, set, bodyweightKg) {
  const reps = set.reps || 0;
  if (reps <= 0) return 0;

  let perRep;
  if (ex?.bodyweight) {
    // For bodyweight moves, `set.weight` means *added* load (belt/plate/dumbbell).
    perRep = (bodyweightKg || 0) * (ex.bwLoad ?? 1) + (set.weight || 0);
  } else {
    perRep = set.weight || 0;
  }

  let v = perRep * reps;
  if (ex?.unilateral) v *= 2;
  return v > 0 ? v : 0;
}

// Effective tonnage for a stored set (looks the exercise up by name and uses the
// bodyweight stamped on the set).
export function setVolume(set) {
  return setVolumeFor(findExercise(set.exerciseName), set, set.bodyweightKg);
}

// ——— Volume distribution ———

// For a given set, return { [muscleGroup]: tonnage } using primary+secondary %.
// Tonnage is the effective tonnage from setVolume (handles bodyweight + unilateral).
export function distributeSetTonnage(set) {
  const volume = setVolume(set);
  if (volume <= 0) return {};

  const ex = findExercise(set.exerciseName);
  const out = {};

  if (!ex) {
    // Fallback: dump 100% to primaryGroup recorded on the set
    out[set.primaryGroup || 'Core'] = volume;
    return out;
  }

  // Primary
  const primaryShare = (ex.primaryPct || 100) / 100;
  out[ex.primaryGroup] = (out[ex.primaryGroup] || 0) + volume * primaryShare;

  // Secondary contributions
  for (const s of ex.secondary || []) {
    const share = (s.pct || 0) / 100;
    if (share <= 0) continue;
    out[s.group] = (out[s.group] || 0) + volume * share;
  }

  return out;
}

// Sub-muscle breakdown too — useful for tooltips on the heatmap.
export function distributeSetSubMuscleTonnage(set) {
  const volume = setVolume(set);
  if (volume <= 0) return {};

  const ex = findExercise(set.exerciseName);
  const out = {};

  if (!ex) return out;

  const pKey = `${ex.primaryGroup} — ${ex.primarySub}`;
  out[pKey] = (out[pKey] || 0) + volume * ((ex.primaryPct || 100) / 100);

  for (const s of ex.secondary || []) {
    const key = `${s.group} — ${s.sub}`;
    out[key] = (out[key] || 0) + volume * ((s.pct || 0) / 100);
  }
  return out;
}

// Aggregate many sets into { [muscleGroup]: tonnage }
export function aggregateWeekTonnage(sets) {
  const totals = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0]));
  for (const set of sets) {
    const dist = distributeSetTonnage(set);
    for (const [group, v] of Object.entries(dist)) {
      totals[group] = (totals[group] || 0) + v;
    }
  }
  return totals;
}

// Aggregate sub-muscle totals too
export function aggregateWeekSubMuscleTonnage(sets) {
  const totals = {};
  for (const set of sets) {
    const dist = distributeSetSubMuscleTonnage(set);
    for (const [key, v] of Object.entries(dist)) {
      totals[key] = (totals[key] || 0) + v;
    }
  }
  return totals;
}

// ——— Heatmap color grading ———

// Targets (kg of weekly tonnage) — tuned for Dhruv's intermediate load ranges.
// Under target -> dim/undertrained; near target -> hit; over -> overworked.
export const WEEKLY_TARGETS = {
  Chest:      { min: 2000, peak: 5000, over: 9000 },
  Shoulders:  { min: 1500, peak: 4000, over: 7500 },
  Triceps:    { min: 1200, peak: 3000, over: 6000 },
  Back:       { min: 2500, peak: 6000, over: 10000 },
  Biceps:     { min: 1000, peak: 2500, over: 5000 },
  Forearms:   { min: 400,  peak: 1200, over: 3000 },
  Quads:      { min: 3000, peak: 7000, over: 12000 },
  Hamstrings: { min: 1500, peak: 4000, over: 8000 },
  Glutes:     { min: 1500, peak: 4500, over: 9000 },
  Calves:     { min: 800,  peak: 2500, over: 5500 },
  Traps:      { min: 500,  peak: 1800, over: 4000 },
  Core:       { min: 400,  peak: 1800, over: 4500 },
};

// Returns { state, ratio, color } for a given muscle's weekly tonnage.
// state ∈ 'untrained' | 'under' | 'hit' | 'over'
export function gradeMuscle(group, tonnage) {
  const t = WEEKLY_TARGETS[group] || { min: 1000, peak: 3000, over: 6000 };
  if (tonnage <= 0) {
    return { state: 'untrained', ratio: 0, color: 'var(--grade-untrained)' };
  }
  if (tonnage < t.min) {
    const r = tonnage / t.min;
    return { state: 'under', ratio: r, color: interp('--grade-under-lo', '--grade-under-hi', r) };
  }
  if (tonnage <= t.peak) {
    const r = (tonnage - t.min) / (t.peak - t.min);
    return { state: 'hit', ratio: r, color: interp('--grade-hit-lo', '--grade-hit-hi', r) };
  }
  if (tonnage <= t.over) {
    const r = (tonnage - t.peak) / (t.over - t.peak);
    return { state: 'over', ratio: r, color: interp('--grade-over-lo', '--grade-over-hi', r) };
  }
  return { state: 'over', ratio: 1, color: 'var(--grade-over-hi)' };
}

function interp(varLoName, varHiName, t) {
  // The CSS will resolve these — we just return a mix() via custom property expression.
  // Using color-mix for a clean gradient without extra JS math.
  return `color-mix(in oklab, var(${varHiName}) ${Math.round(Math.min(Math.max(t, 0), 1) * 100)}%, var(${varLoName}))`;
}

export function formatKg(n) {
  if (!n) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}
