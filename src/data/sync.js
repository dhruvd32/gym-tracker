import {
  db,
  markSetSynced,
  clearSyncQueueItem,
  bumpSyncAttempt,
  getPendingQueue,
} from './db.js';

// Single-flight flusher. Idempotent — safe to call on mount, after each write,
// on visibility change, and on the 'online' event.
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
      try {
        if (job.action === 'delete') {
          await handleDelete(job);
        } else if (job.action === 'update') {
          await handleUpdate(job);
        } else {
          // 'create' or legacy items (pre-v2 queue rows had no action)
          await handleCreate(job);
        }
      } catch (err) {
        await bumpSyncAttempt(job.id, err?.message || String(err));
        // Keep going — one failure shouldn't block the rest of the queue.
      }
    }
  } finally {
    running = false;
    const remaining = await getPendingQueue();
    emit({ status: remaining.length ? 'pending' : 'idle', pending: remaining.length });
  }
}

async function handleCreate(job) {
  const set = await db.sets.get(job.setId);
  if (!set) {
    // Orphaned queue entry — set was locally deleted before sync. Drop it.
    await clearSyncQueueItem(job.id);
    return;
  }
  const res = await fetch('/api/sync-set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(set),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => String(res.status));
    throw new Error(`${res.status}: ${errText}`);
  }
  const body = await res.json().catch(() => ({}));
  await markSetSynced(set.id, body.notionPageId);
}

async function handleUpdate(job) {
  const set = await db.sets.get(job.setId);
  if (!set) {
    await clearSyncQueueItem(job.id);
    return;
  }
  if (!set.notionPageId) {
    // Nothing to update remotely — shouldn't happen, but drop the job defensively.
    await clearSyncQueueItem(job.id);
    return;
  }
  const res = await fetch('/api/update-set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notionPageId: set.notionPageId, set }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => String(res.status));
    throw new Error(`${res.status}: ${errText}`);
  }
  await clearSyncQueueItem(job.id);
}

async function handleDelete(job) {
  if (!job.notionPageId) {
    // No remote page to delete (set was never synced). Just drop the job.
    await clearSyncQueueItem(job.id);
    return;
  }
  const res = await fetch('/api/delete-set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notionPageId: job.notionPageId }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => String(res.status));
    throw new Error(`${res.status}: ${errText}`);
  }
  await clearSyncQueueItem(job.id);
}

export function installSyncTriggers() {
  window.addEventListener('online', () => flushSyncQueue());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') flushSyncQueue();
  });
  setInterval(() => flushSyncQueue(), 60_000);
}
