import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { auth, firestore } from './firebase.js';
import {
  db,
  markSetSynced,
  clearSyncQueueItem,
  bumpSyncAttempt,
  getPendingQueue,
} from './db.js';

let running = false;
let listeners = new Set();

export function onSyncStateChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function emit(state) {
  for (const cb of listeners) cb(state);
}

function userSetsCollection(userId) {
  return collection(firestore, 'users', userId, 'workout_sets');
}

// Pull sets from Firestore and merge into IndexedDB.
// First call is a full sync (no lastSyncAt). Subsequent calls are delta syncs.
export async function pullFromFirestore() {
  const user = auth.currentUser;
  if (!user) return;

  const lastSyncMeta = await db.meta.get('lastSyncAt');
  const lastSyncAt = lastSyncMeta?.value;

  const col = userSetsCollection(user.uid);
  const q = lastSyncAt
    ? query(col, where('updated_at', '>', Timestamp.fromDate(new Date(lastSyncAt))), orderBy('updated_at', 'asc'))
    : query(col, orderBy('created_at', 'asc'));

  const snap = await getDocs(q);
  if (snap.empty) {
    await db.meta.put({ key: 'lastSyncAt', value: new Date().toISOString() });
    return;
  }

  await db.transaction('rw', db.sets, db.sessions, async () => {
    for (const docSnap of snap.docs) {
      const row = docSnap.data();
      const mapped = fromFirestore(docSnap.id, row);
      const local = await db.sets.where('remoteId').equals(docSnap.id).first();
      if (local) {
        await db.sets.update(local.id, mapped);
      } else {
        await db.sets.add(mapped);
      }

      const sessionExists = await db.sessions.where('sessionId').equals(row.session_id).first();
      if (!sessionExists) {
        await db.sessions.add({
          sessionId: row.session_id,
          date: row.date,
          dayType: row.day_type,
          startedAt: tsToIso(row.created_at),
        });
      }
    }
  });

  await db.meta.put({ key: 'lastSyncAt', value: new Date().toISOString() });
}

// Single-flight flusher. Safe to call on mount, after writes, on visibility, on 'online'.
export async function flushSyncQueue() {
  if (running) return;
  if (!navigator.onLine) {
    emit({ status: 'offline' });
    return;
  }

  const user = auth.currentUser;
  if (!user) return;

  running = true;
  emit({ status: 'syncing' });

  try {
    const queue = await getPendingQueue();
    if (queue.length === 0) {
      emit({ status: 'idle', pending: 0 });
      return;
    }

    for (const job of queue) {
      try {
        if (job.action === 'delete') {
          await handleDelete(job, user.uid);
        } else if (job.action === 'update') {
          await handleUpdate(job, user.uid);
        } else {
          await handleCreate(job, user.uid);
        }
      } catch (err) {
        await bumpSyncAttempt(job.id, err?.message || String(err));
      }
    }
  } finally {
    running = false;
    const remaining = await getPendingQueue();
    emit({ status: remaining.length ? 'pending' : 'idle', pending: remaining.length });
  }
}

async function handleCreate(job, userId) {
  const set = await db.sets.get(job.setId);
  if (!set) {
    await clearSyncQueueItem(job.id);
    return;
  }

  const ref = await addDoc(userSetsCollection(userId), {
    ...toFirestore(set),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  await markSetSynced(set.id, ref.id);
}

async function handleUpdate(job, userId) {
  const set = await db.sets.get(job.setId);
  if (!set || !set.remoteId) {
    await clearSyncQueueItem(job.id);
    return;
  }

  const ref = doc(firestore, 'users', userId, 'workout_sets', set.remoteId);
  await updateDoc(ref, {
    weight_kg: set.weight,
    reps:      set.reps,
    is_pr:     !!set.isPR,
    updated_at: serverTimestamp(),
  });
  await clearSyncQueueItem(job.id);
}

async function handleDelete(job, userId) {
  if (!job.remoteId) {
    await clearSyncQueueItem(job.id);
    return;
  }

  const ref = doc(firestore, 'users', userId, 'workout_sets', job.remoteId);
  await deleteDoc(ref);
  await clearSyncQueueItem(job.id);
}

export function installSyncTriggers() {
  window.addEventListener('online', () => flushSyncQueue());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') flushSyncQueue();
  });
  setInterval(() => flushSyncQueue(), 60_000);
}

// ─── Transform helpers ────────────────────────────────────────────────────────

function toFirestore(set) {
  return {
    session_id:    set.sessionId,
    date:          set.date,
    day_type:      set.dayType,
    exercise_name: set.exerciseName,
    primary_group: set.primaryGroup  ?? null,
    primary_sub:   set.primarySub    ?? null,
    primary_pct:   set.primaryPct    ?? null,
    compound:      !!set.compound,
    set_number:    set.setNumber,
    weight_kg:     set.weight,
    reps:          set.reps,
    is_pr:         !!set.isPR,
  };
}

function fromFirestore(id, row) {
  return {
    remoteId:      id,
    sessionId:     row.session_id,
    date:          row.date,
    dayType:       row.day_type,
    exerciseName:  row.exercise_name,
    primaryGroup:  row.primary_group,
    primarySub:    row.primary_sub,
    primaryPct:    row.primary_pct,
    compound:      row.compound,
    setNumber:     row.set_number,
    weight:        row.weight_kg,
    reps:          row.reps,
    isPR:          row.is_pr,
    synced:        1,
    createdAt:     tsToIso(row.created_at),
    syncedAt:      tsToIso(row.updated_at),
  };
}

function tsToIso(ts) {
  if (!ts) return undefined;
  if (typeof ts.toDate === 'function') return ts.toDate().toISOString();
  return new Date(ts).toISOString();
}
