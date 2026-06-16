// In-progress workout session, persisted to localStorage so an accidental
// refresh or browser close mid-workout doesn't destroy the user's work.
// The draft is converted into permanent `sets` rows only when "Log Day" runs.

const KEY = 'gym-tracker:draft';

// Draft shape:
// {
//   dayType: 'Push (Chest)' | 'Push (Shoulders)' | 'Pull' | 'Legs' | 'Core',
//   sessionId: string,
//   startedAt: ISO string,
//   exercises: [
//     {
//       name, primaryGroup, primarySub, primaryPct, compound,
//       sets: [ { weight: number, reps: number }, ... ]
//     }
//   ]
// }

export function loadDraft() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft) {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Storage quota / private mode — draft won't survive refresh but app still works.
  }
}

export function clearDraft() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}

export function newDraft(dayType) {
  return {
    dayType,
    sessionId: makeSessionId(dayType),
    startedAt: new Date().toISOString(),
    exercises: [],
  };
}

export function draftExerciseFrom(ex) {
  return {
    name: ex.name,
    primaryGroup: ex.primaryGroup,
    primarySub: ex.primarySub,
    primaryPct: ex.primaryPct,
    compound: !!ex.compound,
    prWeightKg: ex.prWeightKg ?? null,
    prReps: ex.prReps ?? null,
    measureType: ex.measureType || 'reps',
    sets: [],
  };
}

function makeSessionId(dayType) {
  const today = new Date().toISOString().slice(0, 10);
  const rand = (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))
    .split('-')[0];
  // Slugify the day label so spaces/parens (e.g. "Push (Shoulders)") stay out of the id.
  const slug = dayType.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${today}::${slug}::${rand}`.slice(0, 120);
}
