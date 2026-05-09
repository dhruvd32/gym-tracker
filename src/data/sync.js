import { supabase } from './supabase.js';
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

// Pull sets from Supabase and merge into IndexedDB.
// First call is a full sync (no lastSyncAt). Subsequent calls are delta syncs.
export async function pullFromSupabase() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const lastSyncMeta = await db.meta.get('lastSyncAt');
  const lastSyncAt = lastSyncMeta?.value;

  let query = supabase
    .from('workout_sets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (lastSyncAt) {
    query = query.gt('updated_at', lastSyncAt);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (!data?.length) return;

  await db.transaction('rw', db.sets, db.sessions, async () => {
    for (const row of data) {
      const mapped = fromSupabase(row);
      const local = await db.sets.where('supabaseId').equals(row.id).first();
      if (local) {
        await db.sets.update(local.id, mapped);
      } else {
        await db.sets.add(mapped);
      }

      // Derive session record from set if not already present.
      const sessionExists = await db.sessions.where('sessionId').equals(row.session_id).first();
      if (!sessionExists) {
        await db.sessions.add({
          sessionId: row.session_id,
          date: row.date,
          dayType: row.day_type,
          startedAt: row.created_at,
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

  const { data: { user } } = await supabase.auth.getUser();
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
          await handleDelete(job);
        } else if (job.action === 'update') {
          await handleUpdate(job, user.id);
        } else {
          await handleCreate(job, user.id);
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

  const { data, error } = await supabase
    .from('workout_sets')
    .insert(toSupabase(set, userId))
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  await markSetSynced(set.id, data.id);
}

async function handleUpdate(job, userId) {
  const set = await db.sets.get(job.setId);
  if (!set || !set.supabaseId) {
    await clearSyncQueueItem(job.id);
    return;
  }

  const { error } = await supabase
    .from('workout_sets')
    .update({ weight_kg: set.weight, reps: set.reps, is_pr: !!set.isPR })
    .eq('id', set.supabaseId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  await clearSyncQueueItem(job.id);
}

async function handleDelete(job) {
  if (!job.supabaseId) {
    await clearSyncQueueItem(job.id);
    return;
  }

  const { error } = await supabase
    .from('workout_sets')
    .delete()
    .eq('id', job.supabaseId);

  if (error) throw new Error(error.message);
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

function toSupabase(set, userId) {
  return {
    user_id:       userId,
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

function fromSupabase(row) {
  return {
    supabaseId:    row.id,
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
    createdAt:     row.created_at,
    syncedAt:      row.updated_at,
  };
}
