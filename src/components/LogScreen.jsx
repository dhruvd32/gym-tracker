import React, { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  exercisesByDay,
  subMusclesForDay,
  exercisesFor,
  findExercise,
} from '../data/exerciseLibrary.js';
import { db, addSet, isPR, getLastSetsFor } from '../data/db.js';
import { flushSyncQueue } from '../data/sync.js';
import { toIsoDate } from '../data/volume.js';

const DAYS = [
  { key: 'Push', letter: 'P', name: 'Push' },
  { key: 'Pull', letter: 'L', name: 'Pull' },
  { key: 'Legs', letter: 'G', name: 'Legs' },
  { key: 'Core', letter: 'C', name: 'Core' },
];

// Stable-ish session ID — one per calendar day per day-type.
// Multiple Push sessions in a day will share an ID which is usually desired;
// rare enough that a dedicated "new session" control isn't worth it for v1.
function sessionIdFor(dayType) {
  return `${toIsoDate(new Date())}::${dayType}::${cryptoId()}`.slice(0, 120);
}
let _cachedSession = null;
function sessionForToday(dayType) {
  if (_cachedSession && _cachedSession.dayType === dayType) return _cachedSession;
  _cachedSession = { dayType, id: sessionIdFor(dayType), startedAt: Date.now() };
  return _cachedSession;
}
function cryptoId() {
  if (crypto?.randomUUID) return crypto.randomUUID().split('-')[0];
  return Math.random().toString(36).slice(2, 10);
}

export function LogScreen({ showToast }) {
  const [day, setDay] = useState(null);            // 'Push' | 'Pull' | 'Legs' | 'Core'
  const [subPick, setSubPick] = useState(null);    // { group, sub }
  const [exercise, setExercise] = useState(null);  // exercise object

  // ——— DAY STEP ———
  if (!day) {
    return (
      <>
        <div className="section">
          <div className="label">Today is…</div>
          <div className="day-grid">
            {DAYS.map((d) => (
              <button key={d.key} className="day-btn" onClick={() => setDay(d.key)}>
                <div className="day-letter">{d.letter}</div>
                <div className="day-name">{d.name} Day</div>
              </button>
            ))}
          </div>
        </div>
        <TodaySessionSummary />
      </>
    );
  }

  // ——— SUB-MUSCLE STEP ———
  if (!subPick) {
    if (day === 'Core') {
      // Core day — no exercise library yet, prompt user to pick Core-targeted
      // exercises later. Placeholder: use existing library's Core contributions.
      return (
        <>
          <button className="back-link" onClick={() => setDay(null)}>← Back</button>
          <div className="section">
            <div className="label">Core Day</div>
            <div className="empty">
              Core exercises aren't seeded yet. Log via Push/Pull/Legs for now — core volume accumulates automatically from compound lifts. Open Notion to add Core exercises to the library.
            </div>
          </div>
        </>
      );
    }

    const subs = subMusclesForDay(day);
    return (
      <>
        <button className="back-link" onClick={() => setDay(null)}>← Back</button>
        <div className="section">
          <div className="label">{day} Day — Target</div>
          <div className="chip-list">
            {subs.map((s) => (
              <button
                key={`${s.group}::${s.sub}`}
                className="chip"
                onClick={() => setSubPick(s)}
              >
                <span className="group-tag">{s.group}</span>
                {s.sub}
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  // ——— EXERCISE PICK STEP ———
  if (!exercise) {
    const list = exercisesFor(day, subPick.group, subPick.sub);
    return (
      <>
        <button className="back-link" onClick={() => setSubPick(null)}>← Back</button>
        <div className="section">
          <div className="label">
            {subPick.group} · {subPick.sub}
          </div>
          {list.map((ex) => (
            <div key={ex.name} className="exercise" onClick={() => setExercise(ex)}>
              <div className="row spread">
                <div className="exercise-name">{ex.name}</div>
                {ex.compound && <div className="exercise-meta compound-flag">COMPOUND</div>}
              </div>
              <LastTimeChip exerciseName={ex.name} />
            </div>
          ))}
        </div>
      </>
    );
  }

  // ——— SET LOGGING STEP ———
  return (
    <ExerciseLogger
      day={day}
      exercise={exercise}
      onBack={() => setExercise(null)}
      showToast={showToast}
    />
  );
}

// "Last time I did this" chip — shows top set from the most recent session.
function LastTimeChip({ exerciseName }) {
  const [last, setLast] = useState(null);
  useEffect(() => {
    getLastSetsFor(exerciseName, 10).then((rows) => {
      if (!rows.length) return setLast({ empty: true });
      // Group by sessionId — find most recent session's sets
      const latestSession = rows[0].sessionId;
      const sessionSets = rows.filter((r) => r.sessionId === latestSession);
      const top = sessionSets.reduce(
        (best, s) => (s.weight * s.reps > (best?.weight || 0) * (best?.reps || 0) ? s : best),
        null
      );
      setLast({ top, count: sessionSets.length, date: rows[0].date });
    });
  }, [exerciseName]);

  if (!last) return null;
  if (last.empty) {
    return <div className="last-time muted">No prior logs — first session.</div>;
  }
  return (
    <div className="last-time">
      Last time on <strong>{last.date}</strong> — top set{' '}
      <span className="pill tabular">{last.top.weight}kg × {last.top.reps}</span>
      across <strong>{last.count}</strong> set{last.count !== 1 ? 's' : ''}.
    </div>
  );
}

function ExerciseLogger({ day, exercise, onBack, showToast }) {
  const [weight, setWeight] = useState(exercise.prWeightKg != null ? String(exercise.prWeightKg) : '');
  const [reps, setReps] = useState(exercise.prReps != null ? String(exercise.prReps) : '');
  const [saving, setSaving] = useState(false);

  const session = sessionForToday(day);

  // Live query — sets from this session for this exercise
  const setsThisSession = useLiveQuery(
    () =>
      db.sets
        .where('sessionId').equals(session.id)
        .and((s) => s.exerciseName === exercise.name)
        .sortBy('id'),
    [session.id, exercise.name]
  ) || [];

  const nextSetNumber = setsThisSession.length + 1;

  const canLog = Number(weight) >= 0 && Number(reps) > 0;

  async function handleLog() {
    if (!canLog || saving) return;
    setSaving(true);
    const w = Number(weight);
    const r = Number(reps);

    const pr = await isPR(exercise.name, w, r);

    await addSet({
      sessionId: session.id,
      date: toIsoDate(new Date()),
      dayType: day,
      exerciseName: exercise.name,
      primaryGroup: exercise.primaryGroup,
      primarySub: exercise.primarySub,
      primaryPct: exercise.primaryPct,
      compound: exercise.compound,
      setNumber: nextSetNumber,
      weight: w,
      reps: r,
      isPR: pr ? 1 : 0,
    });

    if (pr) showToast('🔥 NEW PR');

    // Kick off sync in the background (non-blocking)
    flushSyncQueue();
    setSaving(false);
  }

  return (
    <>
      <button className="back-link" onClick={onBack}>← Back</button>
      <div className="section">
        <div className="label">Logging · Set {nextSetNumber}</div>
        <h2 style={{ fontSize: 22, lineHeight: 1.2, marginBottom: 4 }}>{exercise.name}</h2>
        <div className="exercise-meta muted mt-s" style={{ marginBottom: 14 }}>
          {exercise.primaryGroup} · {exercise.primarySub} ({exercise.primaryPct}%)
          {exercise.compound && <span className="compound-flag">COMPOUND</span>}
        </div>

        <LastTimeChip exerciseName={exercise.name} />

        <div className="set-row mt-m">
          <div>
            <label>Weight (kg)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              min="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <label>Reps</label>
            <input
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder="0"
            />
          </div>
          <button className="log-btn" onClick={handleLog} disabled={!canLog || saving}>
            {saving ? '…' : 'Log'}
          </button>
        </div>

        <div className="logged-sets mt-m">
          {setsThisSession.map((s) => (
            <div key={s.id} className={`logged-set ${s.isPR ? 'is-pr' : ''}`}>
              <span className="n">SET {s.setNumber}</span>
              <span className="value tabular">
                {s.weight} kg × {s.reps}
              </span>
              {s.isPR ? <span className="pr-badge">PR</span> : <span className="n tabular muted">{s.weight * s.reps} kg·r</span>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function TodaySessionSummary() {
  const today = toIsoDate(new Date());
  const todaysSets = useLiveQuery(
    () => db.sets.where('date').equals(today).toArray(),
    [today]
  ) || [];
  if (!todaysSets.length) return null;
  const volume = todaysSets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
  const exercises = new Set(todaysSets.map((s) => s.exerciseName)).size;
  return (
    <div className="section">
      <div className="card">
        <div className="label">Today's Work</div>
        <div className="row spread">
          <div>
            <div className="tabular" style={{ fontFamily: 'var(--f-display)', fontWeight: 900, fontSize: 28 }}>
              {volume.toLocaleString()} kg
            </div>
            <div className="muted" style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Total Volume</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="tabular" style={{ fontFamily: 'var(--f-display)', fontWeight: 900, fontSize: 28 }}>
              {todaysSets.length}
            </div>
            <div className="muted" style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Sets · {exercises} lift{exercises !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
