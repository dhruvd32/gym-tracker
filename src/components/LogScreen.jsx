import React, { useEffect, useState } from 'react';
import {
  subMusclesForDay,
  muscleGroupsForDay,
  exercisesFor,
  exercisesForGroup,
  findExercise,
} from '../data/exerciseLibrary.js';
import { BodyHeatmap } from './BodyHeatmap.jsx';
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

const LEGS_SIMPLIFIED = true;

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
  const [view, setView] = useState('builder');
  const [subPick, setSubPick] = useState(null);   // { group, sub } or { group } for legs
  const [editIdx, setEditIdx] = useState(null);
  const [focusGroup, setFocusGroup] = useState(null);
  const [selectedSub, setSelectedSub] = useState(null);

  const readyToLog = draft.exercises.some((ex) => ex.sets.length > 0);
  const totalSets = draft.exercises.reduce((n, ex) => n + ex.sets.length, 0);

  async function handleLogDay() {
    if (!readyToLog) return;
    const dateIso = toIsoDate(new Date());

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
    setSelectedSub(null);
  }

  // Legs day uses simplified group-level picker
  const isLegsDay = draft.dayType === 'Legs' && LEGS_SIMPLIFIED;

  // All muscle groups targeted this day (for body highlight)
  const dayGroups = isLegsDay
    ? new Set(muscleGroupsForDay(draft.dayType))
    : new Set(subMusclesForDay(draft.dayType).map((s) => s.group));

  // ——— Sub-picker view ———
  if (view === 'pick-sub') {

    if (isLegsDay) {
      const groups = muscleGroupsForDay(draft.dayType);
      const highlightSub = selectedSub || (focusGroup ? { group: focusGroup.group } : null);
      const highlightSet = highlightSub ? null : dayGroups;

      return (
        <>
          <button className="back-link" onClick={() => { setView('builder'); setFocusGroup(null); }}>← Back to session</button>
          <div className="section">
            <div className="label">{draft.dayType} Day — Target</div>
            <div className="body-picker-wrap">
              <BodyHeatmap highlightGroups={highlightSet} highlightSub={highlightSub} />
            </div>
            <div className="chip-list">
              {groups.map((g) => (
                <button
                  key={g}
                  className={`chip ${selectedSub && selectedSub.group === g ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedSub({ group: g });
                    setFocusGroup({ group: g });
                  }}
                >
                  <span className="group-tag">{g}</span>
                </button>
              ))}
            </div>
            {selectedSub && (
              <button
                className="log-day-btn mt-m"
                onClick={() => {
                  setSubPick(selectedSub);
                  setFocusGroup(null);
                  setSelectedSub(null);
                  setView('pick-exercise');
                }}
              >
                SELECT
              </button>
            )}
          </div>
        </>
      );
    }

    const subs = subMusclesForDay(draft.dayType);
    const highlightSub = selectedSub || focusGroup;
    const highlightSet = highlightSub ? null : dayGroups;

    return (
      <>
        <button className="back-link" onClick={() => { setView('builder'); setFocusGroup(null); }}>← Back to session</button>
        <div className="section">
          <div className="label">{draft.dayType} Day — Target</div>
          <div className="body-picker-wrap">
            <BodyHeatmap highlightGroups={highlightSet} highlightSub={highlightSub} />
          </div>
          <div className="chip-list">
            {subs.map((s) => (
              <button
                key={`${s.group}::${s.sub}`}
                className={`chip ${selectedSub && selectedSub.group === s.group && selectedSub.sub === s.sub ? 'active' : ''}`}
                onClick={() => {
                  setSelectedSub(s);
                  setFocusGroup(s);
                }}
              >
                <span className="group-tag">{s.group}</span>
                {s.sub}
              </button>
            ))}
          </div>
          {selectedSub && (
            <button
              className="log-day-btn mt-m"
              onClick={() => {
                setSubPick(selectedSub);
                setFocusGroup(null);
                setSelectedSub(null);
                setView('pick-exercise');
              }}
            >
              SELECT
            </button>
          )}
        </div>
      </>
    );
  }

  // ——— Exercise-picker view ———
  if (view === 'pick-exercise' && subPick) {
    const list = subPick.sub
      ? exercisesFor(draft.dayType, subPick.group, subPick.sub)
      : exercisesForGroup(draft.dayType, subPick.group);

    const exerciseHighlight = new Set([subPick.group]);

    return (
      <>
        <button className="back-link" onClick={() => setView('pick-sub')}>← Back</button>
        <div className="section">
          <div className="label">{subPick.group}{subPick.sub ? ` · ${subPick.sub}` : ''}</div>
          <div className="body-picker-wrap small">
            <BodyHeatmap highlightSub={subPick} />
          </div>
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
              <CompoundMuscleHits exercise={ex} />
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
          draft.exercises.map((ex, i) => {
            const libEx = findExercise(ex.name);
            const isTime = libEx?.measureType === 'time';
            return (
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
                        <span className="value tabular">
                          {s.weight} kg {isTime ? `for ${s.reps}s` : `× ${s.reps}`}
                        </span>
                        <span className="n tabular muted">{s.weight * s.reps} kg·{isTime ? 's' : 'r'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="last-time muted">No sets yet — tap to add</div>
                )}
              </div>
            );
          })
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
  const libEx = findExercise(exercise.name);
  const isTime = libEx?.measureType === 'time';

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

        <CompoundMuscleHits exercise={exercise} />
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
            <label>{isTime ? 'Time (s)' : 'Reps'}</label>
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
              isTime={isTime}
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

function DraftSetRow({ index, set, isTime, onChange, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [w, setW] = useState(String(set.weight));
  const [r, setR] = useState(String(set.reps));

  if (!editing) {
    return (
      <div className="logged-set">
        <span className="n">SET {index + 1}</span>
        <span className="value tabular">
          {set.weight} kg {isTime ? `for ${set.reps}s` : `× ${set.reps}`}
        </span>
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
  
  // Need to know if it's time-based
  const ex = findExercise(exerciseName);
  const isTime = ex?.measureType === 'time';

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
      <span className="pill tabular">
        {last.top.weight}kg {isTime ? `for ${last.top.reps}s` : `× ${last.top.reps}`}
      </span>
      across <strong>{last.count}</strong> set{last.count !== 1 ? 's' : ''}.
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Colored tags for compound exercises
// ─────────────────────────────────────────────────────────────

function CompoundMuscleHits({ exercise }) {
  if (!exercise.compound) return null;
  const hits = [
    { name: exercise.primaryGroup + (exercise.primarySub ? ' — ' + exercise.primarySub : ''), pct: exercise.primaryPct || 100 },
    ...(exercise.secondary || []).map(s => ({ name: s.group + (s.sub ? ' — ' + s.sub : ''), pct: s.pct || 0 }))
  ];
  hits.sort((a, b) => b.pct - a.pct);

  return (
    <div className="muscle-hits" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px', marginBottom: '10px' }}>
      {hits.map(h => {
        const opacity = Math.max(0.15, h.pct / 100);
        return (
          <span key={h.name} style={{
            backgroundColor: `rgba(220, 50, 50, ${opacity})`,
            color: opacity > 0.4 ? '#fff' : '#ccc',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '600',
            border: '1px solid rgba(220, 50, 50, 0.3)'
          }}>
            {h.name} ({h.pct}%)
          </span>
        );
      })}
    </div>
  );
}
