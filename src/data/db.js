import Dexie from 'dexie';

export const db = new Dexie('gym-tracker');

// v1 — sets (every logged set), sessions (workout metadata), syncQueue (pending Notion writes)
db.version(1).stores({
  sets:      '++id, sessionId, date, exerciseName, dayType, primaryGroup, primarySub, synced',
  sessions:  '++id, &sessionId, date, dayType',
  syncQueue: '++id, setId, attempts, lastError',
});

// Add a completed set: writes both to local `sets` table AND to `syncQueue`.
export async function addSet(payload) {
  return db.transaction('rw', db.sets, db.syncQueue, db.sessions, async () => {
    // Ensure a session row exists for this sessionId
    const existingSession = await db.sessions.where({ sessionId: payload.sessionId }).first();
    if (!existingSession) {
      await db.sessions.add({
        sessionId: payload.sessionId,
        date: payload.date,
        dayType: payload.dayType,
        startedAt: new Date().toISOString(),
      });
    }

    const setId = await db.sets.add({ ...payload, synced: 0, createdAt: new Date().toISOString() });
    await db.syncQueue.add({ setId, attempts: 0, lastError: null, queuedAt: new Date().toISOString() });
    return setId;
  });
}

export async function markSetSynced(setId) {
  await db.sets.update(setId, { synced: 1, syncedAt: new Date().toISOString() });
  await db.syncQueue.where({ setId }).delete();
}

export async function bumpSyncAttempt(setId, errorMsg) {
  const queued = await db.syncQueue.where({ setId }).first();
  if (queued) {
    await db.syncQueue.update(queued.id, {
      attempts: (queued.attempts || 0) + 1,
      lastError: errorMsg?.slice(0, 500) || 'unknown',
      lastAttemptAt: new Date().toISOString(),
    });
  }
}

export async function getPendingQueue() {
  return db.syncQueue.orderBy('id').toArray();
}

export async function getSetsForWeek(weekStartIso, weekEndIso) {
  return db.sets
    .where('date')
    .between(weekStartIso, weekEndIso, true, true)
    .toArray();
}

// All sets for a given exercise, newest first — used by "last time" chip.
export async function getLastSetsFor(exerciseName, limit = 6) {
  return db.sets
    .where('exerciseName').equals(exerciseName)
    .reverse()
    .sortBy('id')
    .then((rows) => rows.slice(0, limit));
}

// Check whether a proposed set beats all prior top-set volumes for that exercise.
// Returns true if it's a PR (top single-set volume).
export async function isPR(exerciseName, weight, reps) {
  const volume = weight * reps;
  if (volume <= 0) return false;
  const prior = await db.sets.where('exerciseName').equals(exerciseName).toArray();
  const bestPriorVolume = prior.reduce((max, s) => Math.max(max, (s.weight || 0) * (s.reps || 0)), 0);
  return volume > bestPriorVolume;
}

export async function clearAll() {
  await db.sets.clear();
  await db.sessions.clear();
  await db.syncQueue.clear();
}
