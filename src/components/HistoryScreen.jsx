import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, deleteSet, deleteSession, updateSetFields } from '../data/db.js';
import { flushSyncQueue } from '../data/sync.js';

// History screen — one row per workout session, tappable to expand.
// Within an expanded session, each set row can have its weight/reps edited or
// be individually deleted. A whole session can also be deleted.

export function HistoryScreen({ showToast }) {
  // Pull every set, newest first by insertion id.
  const allSets = useLiveQuery(
    () => db.sets.orderBy('id').reverse().toArray(),
    []
  );

  const sessions = useMemo(() => groupIntoSessions(allSets || []), [allSets]);

  const [expanded, setExpanded] = useState(null);

  if (allSets == null) {
    return <div className="section"><div className="muted">Loading…</div></div>;
  }
  if (sessions.length === 0) {
    return (
      <div className="section">
        <div className="label">History</div>
        <div className="empty">No workouts logged yet. Head to Log to start your first session.</div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="label">History · {sessions.length} session{sessions.length === 1 ? '' : 's'}</div>
      {sessions.map((s) => (
        <SessionCard
          key={s.sessionId}
          session={s}
          expanded={expanded === s.sessionId}
          onToggle={() => setExpanded(expanded === s.sessionId ? null : s.sessionId)}
          showToast={showToast}
        />
      ))}
    </div>
  );
}

function SessionCard({ session, expanded, onToggle, showToast }) {
  async function handleDeleteSession() {
    if (!window.confirm(`Delete this ${session.dayType} workout from ${session.date}?\nIt will also be removed from your Notion database.`)) return;
    await deleteSession(session.sessionId);
    flushSyncQueue();
    showToast('SESSION DELETED');
  }

  return (
    <div className="history-card">
      <div className="history-head" onClick={onToggle}>
        <div>
          <div className="history-day">{session.dayType} Day</div>
          <div className="muted" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {session.date}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="tabular" style={{ fontFamily: 'var(--f-display)', fontWeight: 900, fontSize: 22 }}>
            {session.totalVolume.toLocaleString()} kg
          </div>
          <div className="muted" style={{ fontSize: 11 }}>
            {session.setCount} sets · {session.exerciseCount} lift{session.exerciseCount === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="history-body">
          {session.byExercise.map(([exName, sets]) => (
            <div key={exName} className="history-exercise">
              <div className="exercise-name" style={{ fontSize: 15, marginBottom: 6 }}>{exName}</div>
              <div className="logged-sets">
                {sets.map((set) => (
                  <HistorySetRow key={set.id} set={set} showToast={showToast} />
                ))}
              </div>
            </div>
          ))}
          <button className="ghost-btn danger mt-m" onClick={handleDeleteSession}>
            Delete entire session
          </button>
        </div>
      )}
    </div>
  );
}

function HistorySetRow({ set, showToast }) {
  const [editing, setEditing] = useState(false);
  const [w, setW] = useState(String(set.weight));
  const [r, setR] = useState(String(set.reps));
  const [saving, setSaving] = useState(false);

  async function save() {
    const nw = Number(w);
    const nr = Number(r);
    if (!Number.isFinite(nw) || nw < 0 || !Number.isFinite(nr) || nr <= 0) return;
    setSaving(true);
    await updateSetFields(set.id, { weight: nw, reps: nr });
    flushSyncQueue();
    setSaving(false);
    setEditing(false);
    showToast('SET UPDATED');
  }

  async function remove() {
    if (!window.confirm('Delete this set? It will also be removed from Notion.')) return;
    await deleteSet(set.id);
    flushSyncQueue();
    showToast('SET DELETED');
  }

  if (!editing) {
    return (
      <div className={`logged-set ${set.isPR ? 'is-pr' : ''}`}>
        <span className="n">SET {set.setNumber}</span>
        <span className="value tabular">{set.weight} kg × {set.reps}</span>
        <span className="row" style={{ gap: 6 }}>
          {set.isPR
            ? <span className="pr-badge">PR</span>
            : <span className="n tabular muted">{set.weight * set.reps} kg·r</span>}
          <button className="mini-btn" onClick={() => setEditing(true)}>Edit</button>
          <button className="mini-btn danger" onClick={remove}>×</button>
        </span>
      </div>
    );
  }

  return (
    <div className="logged-set edit-mode">
      <span className="n">SET {set.setNumber}</span>
      <input type="number" step="0.5" value={w} onChange={(e) => setW(e.target.value)} style={{ width: 70 }} />
      <input type="number" step="1" value={r} onChange={(e) => setR(e.target.value)} style={{ width: 56 }} />
      <span className="row" style={{ gap: 6 }}>
        <button className="mini-btn" onClick={save} disabled={saving}>{saving ? '…' : '✓'}</button>
        <button className="mini-btn" onClick={() => { setEditing(false); setW(String(set.weight)); setR(String(set.reps)); }}>↶</button>
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function groupIntoSessions(sets) {
  // sets come in newest-first order; group by sessionId preserving order.
  const byId = new Map();
  for (const s of sets) {
    const key = s.sessionId || `orphan::${s.id}`;
    if (!byId.has(key)) {
      byId.set(key, {
        sessionId: key,
        dayType: s.dayType || '—',
        date: s.date || '',
        sets: [],
      });
    }
    byId.get(key).sets.push(s);
  }

  const sessions = Array.from(byId.values());
  for (const s of sessions) {
    // Sort sets ascending by id so SET numbers read in order within a session.
    s.sets.sort((a, b) => a.id - b.id);
    s.totalVolume = s.sets.reduce((sum, x) => sum + (x.weight || 0) * (x.reps || 0), 0);
    s.setCount = s.sets.length;

    const exMap = new Map();
    for (const row of s.sets) {
      const k = row.exerciseName || '—';
      if (!exMap.has(k)) exMap.set(k, []);
      exMap.get(k).push(row);
    }
    s.byExercise = Array.from(exMap.entries());
    s.exerciseCount = exMap.size;
  }

  // Newest first by date desc, then by max id desc (tiebreaker for same date).
  sessions.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    const aMax = Math.max(...a.sets.map((x) => x.id));
    const bMax = Math.max(...b.sets.map((x) => x.id));
    return bMax - aMax;
  });
  return sessions;
}
