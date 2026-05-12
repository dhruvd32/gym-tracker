import React, { useEffect, useState } from 'react';
import {
  subMusclesForDay,
  exercisesFor,
} from '../data/exerciseLibrary.js';
import { addSet, isPR, getLastSetsFor } from '../data/db.js';
import { flushSyncQueue } from '../data/sync.js';
import { toIsoDate } from '../data/volume.js';
import {
  loadDraft, saveDraft, clearDraft, newDraft, draftExerciseFrom,
} from '../data/draft.js';

const DAYS = [
  { key: 'Push', letter: 'P', name: 'Push' },
  { key: 'Pull', letter: 'L', name: 'Pull' },
  { key: 'Legs', letter: 'G', name: 'Legs' },
  { key: 'Core', letter: 'C', name: 'Core' },
];

// ─────────────────────────────────────────────────────────────
// Top-level screen: either the day-picker or the session builder.
// The `draft` state is the single source of truth — null means no active session.
// ─────────────────────────────────────────────────────────────

export function LogScreen({ showToast }) {
  const [draft, setDraftState] = useState(() => loadDraft());

  function updateDraft(next) {
    setDraftState(next);
    if (next) saveDraft(next);
    else clearDraft();
  }

  if (!draft) {
    return (
      <div className="section">
        <div className="label">Today is…</div>
        <div className="day-grid">
          {DAYS.map((d) => (
            <button
              key={d.key}
              className="day-btn"
              onClick={() => updateDraft(newDraft(d.key))}
            >
              <div className="day-letter">{d.letter}</div>
              <div className="day-name">{d.name} Day</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return <SessionBuilder draft={draft} updateDraft={updateDraft} showToast={showToast} />;
}

// ─────────────────────────────────────────────────────────────
// Session builder: shows the in-progress draft, lets you add
// exercises, edit each exercise's sets, and finally "Log Day".
// ─────────────────────────────────────────────────────────────

function SessionBuilder({ draft, updateDraft, showToast }) {
  // Navigation inside the builder. `view` is one of:
  //   'builder'          → main list with "+ Add Exercise" and "Log Day"
  //   'pick-sub'         → choose sub-muscle chips
  //   'pick-exercise'    → list exercises for a chosen sub
  //   'edit-sets'        → add/remove sets for a specific draft exercise
  const [view, setView] = useState('builder');
  const [subPick, setSubPick] = useState(null); // { group, sub }
  const [editIdx, setEditIdx] = useState(null); // index into draft.exercises

  const readyToLog = draft.exercises.some((ex) => ex.sets.length > 0);
  const totalSets = draft.exercises.reduce((n, ex) => n + ex.sets.length, 0);

  async function handleLogDay() {
    if (!readyToLog) return;
    const dateIso = toIsoDate(new Date());

    // Flatten exercises → sets and write in order, so setNumber matches draft order.
    for (const ex of draft.exercises) {
      let setNumber = 1;
      for (const s of ex.sets) {
        const pr = await isPR(ex.name, s.weight, s.reps);
        await addSet({
          sessionId: draft.sessionId,
          date: dateIso,
          dayType: draft.dayType,
          exerciseName: ex.name,
          primaryGroup: ex.primaryGroup,
          primarySub: ex.primarySub,
          primaryPct: ex.primaryPct,
          compound: ex.compound,
          setNumber,
          weight: s.weight,
          reps: s.reps,
          isPR: pr ? 1 : 0,
        });
        setNumber += 1;
      }
    }
    updateDraft(null);
    flushSyncQueue();
    showToast(`LOGGED · ${totalSets} SET${totalSets === 1 ? '' : 'S'}`);
  }

  function handleDiscard() {
    if (!window.confirm('Discard this session? Everything you\'ve added will be lost.')) return;
    updateDraft(null);
    setView('builder');
    setSubPick(null);
    setEditIdx(null);
  }

  // ——— Sub-picker view ———
  if (view === 'pick-sub') {
    if (draft.dayType === 'Core') {
      return (
        <>
          <button className="back-link" onClick={() => setView('builder')}>← Back to session</button>
          <div className="section">
            <div className="empty">
              Core exercises aren't seeded yet. Log via Push/Pull/Legs for now — core volume accumulates from compound lifts.
            </div>
          </div>
        </>
      );
    }
    const subs = subMusclesForDay(draft.dayType);
    return (
      <>
        <button className="back-link" onClick={() => setView('builder')}>← Back to session</button>
        <div className="section">
          <div className="label">{draft.dayType} Day — Target</div>
          <div className="chip-list">
            {subs.map((s) => (
              <button
                key={`${s.group}::${s.sub}`}
                className="chip"
                onClick={() => { setSubPick(s); setView('pick-exercise'); }}
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

  // ——— Exercise-picker view ———
  if (view === 'pick-exercise' && subPick) {
    const list = exercisesFor(draft.dayType, subPick.group, subPick.sub);
    return (
      <>
        <button className="back-link" onClick={() => setView('pick-sub')}>← Back</button>
        <div className="section">
          <div className="label">{subPick.group} · {subPick.sub}</div>
          {list.map((ex) => (
            <div
              key={ex.name}
              className="exercise"
              onClick={() => {
                const next = { ...draft, exercises: [...draft.exercises, draftExerciseFrom(ex)] };
                updateDraft(next);
                setEditIdx(next.exercises.length - 1);
                setView('edit-sets');
              }}
            >
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

  // ——— Edit-sets view for one exercise in the draft ———
  if (view === 'edit-sets' && editIdx != null && draft.exercises[editIdx]) {
    const ex = draft.exercises[editIdx];
    return (
      <ExerciseSetsEditor
        exercise={ex}
        onChange={(updatedEx) => {
          const next = { ...draft, exercises: draft.exercises.map((e, i) => i === editIdx ? updatedEx : e) };
          updateDraft(next);
        }}
        onBack={() => { setEditIdx(null); setView('builder'); }}
        onRemove={() => {
          const next = { ...draft, exercises: draft.exercises.filter((_, i) => i !== editIdx) };
          updateDraft(next);
          setEditIdx(null);
          setView('builder');
        }}
      />
    );
  }

  // ——— Main builder view ———
  return (
    <>
      <div className="section">
        <div className="row spread" style={{ marginBottom: 14 }}>
          <div>
            <div className="label" style={{ marginBottom: 2 }}>Session in progress</div>
            <h2 style={{ fontSize: 26, lineHeight: 1 }}>{draft.dayType} Day</h2>
          </div>
          <button className="ghost-btn" onClick={handleDiscard}>Discard</button>
        </div>

        {draft.exercises.length === 0 ? (
          <div className="empty">No exercises added yet — tap below to start.</div>
        ) : (
          draft.exercises.map((ex, i) => (
            <div
              key={i}
              className="exercise"
              onClick={() => { setEditIdx(i); setView('edit-sets'); }}
            >
              <div className="row spread">
                <div className="exercise-name">{ex.name}</div>
                <span className="n muted">{ex.sets.length} set{ex.sets.length === 1 ? '' : 's'}</span>
              </div>
              {ex.sets.length > 0 ? (
                <div className="logged-sets">
                  {ex.sets.map((s, j) => (
                    <div key={j} className="logged-set">
                      <span className="n">SET {j + 1}</span>
                      <span className="value tabular">{s.weight} kg × {s.reps}</span>
                      <span className="n tabular muted">{s.weight * s.reps} kg·r</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="last-time muted">No sets yet — tap to add</div>
              )}
            </div>
          ))
        )}

        <button
          className="add-exercise-btn mt-m"
          onClick={() => setView('pick-sub')}
        >
          + Add Exercise
        </button>
      </div>

      {readyToLog && (
        <div className="log-day-bar">
          <button className="log-day-btn" onClick={handleLogDay}>
            Log Day · {totalSets} set{totalSets === 1 ? '' : 's'}
          </button>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Set editor — add/remove sets of a single draft exercise.
// Weight & reps are buffered in local state; tapping "+ Set" commits
// a row to the draft. Existing sets can be edited in place or removed.
// ─────────────────────────────────────────────────────────────

function ExerciseSetsEditor({ exercise, onChange, onBack, onRemove }) {
  // Seed inputs with PR if no sets yet, otherwise with the last set (common case:
  // user keeps same weight for the next set).
  const last = exercise.sets[exercise.sets.length - 1];
  const seed = last
    ? { w: String(last.weight), r: String(last.reps) }
    : {
        w: exercise.prWeightKg != null ? String(exercise.prWeightKg) : '',
        r: exercise.prReps != null ? String(exercise.prReps) : '',
      };
  const [weight, setWeight] = useState(seed.w);
  const [reps, setReps]     = useState(seed.r);

  const canAdd = Number(weight) >= 0 && Number(reps) > 0;

  function addSetRow() {
    if (!canAdd) return;
    onChange({
      ...exercise,
      sets: [...exercise.sets, { weight: Number(weight), reps: Number(reps) }],
    });
    // Keep inputs — user usually reuses the same values for the next set.
  }

  function removeSetAt(idx) {
    onChange({
      ...exercise,
      sets: exercise.sets.filter((_, i) => i !== idx),
    });
  }

  function updateSetAt(idx, fields) {
    onChange({
      ...exercise,
      sets: exercise.sets.map((s, i) => i === idx ? { ...s, ...fields } : s),
    });
  }

  return (
    <>
      <button className="back-link" onClick={onBack}>← Back to session</button>
      <div className="section">
        <div className="label">Adding sets</div>
        <h2 style={{ fontSize: 22, lineHeight: 1.2, marginBottom: 4 }}>{exercise.name}</h2>
        <div className="exercise-meta muted mt-s" style={{ marginBottom: 14 }}>
          {exercise.primaryGroup} · {exercise.primarySub} ({exercise.primaryPct}%)
          {exercise.compound && <span className="compound-flag">  COMPOUND</span>}
        </div>

        <LastTimeChip exerciseName={exercise.name} />

        <div className="set-row mt-m">
          <div>
            <label>Weight (kg)</label>
            <input
              type="number" inputMode="decimal" step="0.5" min="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <label>Reps</label>
            <input
              type="number" inputMode="numeric" step="1" min="1"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder="0"
            />
          </div>
          <button className="log-btn" onClick={addSetRow} disabled={!canAdd}>
            + Set
          </button>
        </div>

        <div className="logged-sets mt-m">
          {exercise.sets.map((s, i) => (
            <DraftSetRow
              key={i}
              index={i}
              set={s}
              onChange={(fields) => updateSetAt(i, fields)}
              onRemove={() => removeSetAt(i)}
            />
          ))}
        </div>

        <button className="ghost-btn danger mt-m" onClick={onRemove}>
          Remove this exercise from session
        </button>
      </div>
    </>
  );
}

function DraftSetRow({ index, set, onChange, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [w, setW] = useState(String(set.weight));
  const [r, setR] = useState(String(set.reps));

  if (!editing) {
    return (
      <div className="logged-set">
        <span className="n">SET {index + 1}</span>
        <span className="value tabular">{set.weight} kg × {set.reps}</span>
        <span className="row" style={{ gap: 6 }}>
          <button className="mini-btn" onClick={() => setEditing(true)}>Edit</button>
          <button className="mini-btn danger" onClick={onRemove}>×</button>
        </span>
      </div>
    );
  }

  return (
    <div className="logged-set edit-mode">
      <span className="n">SET {index + 1}</span>
      <input type="number" step="0.5" value={w} onChange={(e) => setW(e.target.value)} style={{ width: 70 }} />
      <input type="number" step="1" value={r} onChange={(e) => setR(e.target.value)} style={{ width: 56 }} />
      <button className="mini-btn" onClick={() => {
        onChange({ weight: Number(w), reps: Number(r) });
        setEditing(false);
      }}>✓</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// "Last time I did this" chip — unchanged from the original flow.
// ─────────────────────────────────────────────────────────────

function LastTimeChip({ exerciseName }) {
  const [last, setLast] = useState(null);
  useEffect(() => {
    getLastSetsFor(exerciseName, 10).then((rows) => {
      if (!rows.length) return setLast({ empty: true });
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
