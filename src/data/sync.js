import { db, markSetSynced, bumpSyncAttempt, getPendingQueue } from './db.js';

// Keep this single-flight. The flusher is idempotent — safe to call on mount,
// after each logged set, on visibility change, and on 'online' event.
let running = false;
let listeners = new Set();

export function onSyncStateChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function emit(state) {
  for (const cb of listeners) cb(state);
}

export async function flushSyncQueue() {
  if (running) return;
  if (!navigator.onLine) {
    emit({ status: 'offline' });
    return;
  }
  running = true;
  emit({ status: 'syncing' });

  try {
    const queue = await getPendingQueue();
    if (queue.length === 0) {
      emit({ status: 'idle', pending: 0 });
      return;
    }

    for (const job of queue) {
      const set = await db.sets.get(job.setId);
      if (!set) {
        // Orphaned queue entry — drop it
        await db.syncQueue.where('id').equals(job.id).delete();
        continue;
      }
      try {
        const res = await fetch('/api/sync-set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(set),
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => String(res.status));
          throw new Error(`${res.status}: ${errText}`);
        }
        await markSetSynced(set.id);
      } catch (err) {
        await bumpSyncAttempt(set.id, err?.message || String(err));
        // Keep going — one failure shouldn't block other sets.
      }
    }
  } finally {
    running = false;
    const remaining = await getPendingQueue();
    emit({ status: remaining.length ? 'pending' : 'idle', pending: remaining.length });
  }
}

export function installSyncTriggers() {
  window.addEventListener('online', () => flushSyncQueue());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') flushSyncQueue();
  });
  // Periodic retry every 60s while app is open
  setInterval(() => flushSyncQueue(), 60_000);
}
