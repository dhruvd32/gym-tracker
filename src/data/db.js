import Dexie from 'dexie';
import { setVolume } from './volume.js';

export const db = new Dexie('gym-tracker');

// v1 — sets, sessions, syncQueue
db.version(1).stores({
  sets:      '++id, sessionId, date, exerciseName, dayType, primaryGroup, primarySub, synced',
  sessions:  '++id, &sessionId, date, dayType',
  syncQueue: '++id, setId, attempts, lastError',
});

// v2 — syncQueue gains `action`; sets store `notionPageId`
db.version(2).stores({
  sets:      '++id, sessionId, date, exerciseName, dayType, primaryGroup, primarySub, synced',
  sessions:  '++id, &sessionId, date, dayType',
  syncQueue: '++id, setId, action, attempts, lastError',
}).upgrade(async (tx) => {
  await tx.table('syncQueue').toCollection().modify((q) => {
    if (!q.action) q.action = 'create';
  });
});

// v3 — switch backend from Notion to Supabase.
db.version(3).stores({
  sets:      '++id, sessionId, date, exerciseName, dayType, primaryGroup, primarySub, synced, supabaseId',
  sessions:  '++id, &sessionId, date, dayType',
  syncQueue: '++id, setId, action, attempts, lastError',
  meta:      'key',
}).upgrade(async (tx) => {
  await tx.table('sets').clear();
  await tx.table('sessions').clear();
  await tx.table('syncQueue').clear();
});

// v4 — switch backend from Supabase to Firebase.
// `remoteId` replaces `supabaseId` (backend-agnostic name).
// All local data is cleared; it will be re-pulled from Firestore on first login.
db.version(4).stores({
  sets:      '++id, sessionId, date, exerciseName, dayType, primaryGroup, primarySub, synced, remoteId',
  sessions:  '++id, &sessionId, date, dayType',
  syncQueue: '++id, setId, action, attempts, lastError',
  meta:      'key',
}).upgrade(async (tx) => {
  await tx.table('sets').clear();
  await tx.table('sessions').clear();
  await tx.table('syncQueue').clear();
  await tx.table('meta').clear();
});

// ——— Creation ———

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

export async function markSetSynced(setId, remoteId) {
  await db.sets.update(setId, {
    synced: 1,
    remoteId: remoteId || undefined,
    syncedAt: new Date().toISOString(),
  });
  await db.syncQueue.where({ setId }).delete();
}

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

export async function updateSetFields(setId, fields) {
  return db.transaction('rw', db.sets, db.syncQueue, async () => {
    const set = await db.sets.get(setId);
    if (!set) return;
    await db.sets.update(setId, fields);

    if (set.synced && set.remoteId) {
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

export async function deleteSet(setId) {
  return db.transaction('rw', db.sets, db.syncQueue, async () => {
    const set = await db.sets.get(setId);
    if (!set) return;

    await db.syncQueue.where({ setId }).delete();

    if (set.synced && set.remoteId) {
      await db.syncQueue.add({
        setId,
        remoteId: set.remoteId,
        action: 'delete',
        attempts: 0,
        lastError: null,
        queuedAt: new Date().toISOString(),
      });
    }

    await db.sets.delete(setId);
  });
}

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

export async function getLastSetsFor(exerciseName, limit = 6) {
  return db.sets
    .where('exerciseName').equals(exerciseName)
    .reverse()
    .sortBy('id')
    .then((rows) => rows.slice(0, limit));
}

// `volume` is the effective tonnage for the candidate set (computed by the caller
// via setVolumeFor so bodyweight/unilateral are accounted for consistently).
export async function isPR(exerciseName, volume) {
  if (volume <= 0) return false;
  const prior = await db.sets.where('exerciseName').equals(exerciseName).toArray();
  const bestPriorVolume = prior.reduce((max, s) => Math.max(max, setVolume(s)), 0);
  return volume > bestPriorVolume;
}

export async function clearAll() {
  await db.sets.clear();
  await db.sessions.clear();
  await db.syncQueue.clear();
  await db.meta.clear();
}
