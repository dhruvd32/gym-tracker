import Dexie from 'dexie';

export const db = new Dexie('gym-tracker');

// v1 — sets, sessions, syncQueue (initial schema; upgraded below)
db.version(1).stores({
  sets:      '++id, sessionId, date, exerciseName, dayType, primaryGroup, primarySub, synced',
  sessions:  '++id, &sessionId, date, dayType',
  syncQueue: '++id, setId, attempts, lastError',
});

// v2 — syncQueue gains `action` so we can queue create / update / delete operations,
// and set records store `notionPageId` once written so we can later edit or delete them.
// (Dexie only needs the schema line for indexed fields; non-indexed fields are free-form,
// so `notionPageId` on `sets` doesn't require a schema change.)
db.version(2).stores({
  sets:      '++id, sessionId, date, exerciseName, dayType, primaryGroup, primarySub, synced',
  sessions:  '++id, &sessionId, date, dayType',
  syncQueue: '++id, setId, action, attempts, lastError',
}).upgrade(async (tx) => {
  // Back-fill existing queue items as "create" so they're valid under the new schema.
  await tx.table('syncQueue').toCollection().modify((q) => {
    if (!q.action) q.action = 'create';
  });
});

// ——— Creation ———

// Writes a set to the local `sets` table AND queues a create-in-Notion job.
export async function addSet(payload) {
  return db.transaction('rw', db.sets, db.syncQueue, db.sessions, async () => {
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
    await db.syncQueue.add({
      setId,
      action: 'create',
      attempts: 0,
      lastError: null,
      queuedAt: new Date().toISOString(),
    });
    return setId;
  });
}

// ——— Sync bookkeeping ———

export async function markSetSynced(setId, notionPageId) {
  await db.sets.update(setId, {
    synced: 1,
    notionPageId: notionPageId || undefined,
    syncedAt: new Date().toISOString(),
  });
  await db.syncQueue.where({ setId }).delete();
}

// Called after a non-create queue item (update/delete) succeeds —
// removes that single queue row without touching the set record (set is
// either already updated, or already locally deleted).
export async function clearSyncQueueItem(queueId) {
  await db.syncQueue.delete(queueId);
}

export async function bumpSyncAttempt(queueId, errorMsg) {
  const row = await db.syncQueue.get(queueId);
  if (!row) return;
  await db.syncQueue.update(queueId, {
    attempts: (row.attempts || 0) + 1,
    lastError: errorMsg?.slice(0, 500) || 'unknown',
    lastAttemptAt: new Date().toISOString(),
  });
}

export async function getPendingQueue() {
  return db.syncQueue.orderBy('id').toArray();
}

// ——— Edit ———

// Updates weight/reps (and optional other fields) on an existing set.
// If the set was already synced to Notion, queues an update-in-Notion job.
// If the set is still pending create, the existing queue item picks up the new values
// naturally (it re-reads the set at sync time), so no extra queue entry is needed.
export async function updateSetFields(setId, fields) {
  return db.transaction('rw', db.sets, db.syncQueue, async () => {
    const set = await db.sets.get(setId);
    if (!set) return;
    await db.sets.update(setId, fields);

    // If already synced, queue an update
    if (set.synced && set.notionPageId) {
      // Collapse duplicate pending updates — keep one open update job per set.
      const existingUpdate = await db.syncQueue
        .where({ setId })
        .filter((q) => q.action === 'update')
        .first();
      if (!existingUpdate) {
        await db.syncQueue.add({
          setId,
          action: 'update',
          attempts: 0,
          lastError: null,
          queuedAt: new Date().toISOString(),
        });
      }
    }
  });
}

// ——— Delete ———

// Deletes a single set locally and, if it was synced, queues a delete-in-Notion job.
export async function deleteSet(setId) {
  return db.transaction('rw', db.sets, db.syncQueue, async () => {
    const set = await db.sets.get(setId);
    if (!set) return;

    // Drop any pending create/update jobs for this set — no point creating something
    // we're about to delete, and no point updating a soon-to-be-gone row.
    await db.syncQueue.where({ setId }).delete();

    // If the set was already pushed to Notion, enqueue a delete referencing the page id.
    if (set.synced && set.notionPageId) {
      await db.syncQueue.add({
        setId, // kept for reference; ignored by the delete handler
        notionPageId: set.notionPageId,
        action: 'delete',
        attempts: 0,
        lastError: null,
        queuedAt: new Date().toISOString(),
      });
    }

    await db.sets.delete(setId);
  });
}

// Deletes every set in a session AND the session metadata row.
// Queues individual Notion deletes for sets that were already synced.
export async function deleteSession(sessionId) {
  const sets = await db.sets.where('sessionId').equals(sessionId).toArray();
  for (const s of sets) {
    await deleteSet(s.id);
  }
  await db.sessions.where('sessionId').equals(sessionId).delete();
}

// ——— Queries ———

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
