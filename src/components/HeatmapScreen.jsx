import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db.js';
import { BodyHeatmap } from './BodyHeatmap.jsx';
import {
  startOfWeekMon,
  endOfWeekSun,
  toIsoDate,
  weekLabel,
  aggregateWeekTonnage,
  aggregateWeekSubMuscleTonnage,
  gradeMuscle,
  formatKg,
  setVolume,
  WEEKLY_TARGETS,
} from '../data/volume.js';

export function HeatmapScreen() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState(null);

  const { weekStart, weekEnd, weekStartIso, weekEndIso } = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    const start = startOfWeekMon(base);
    const end = endOfWeekSun(base);
    return {
      weekStart: start,
      weekEnd: end,
      weekStartIso: toIsoDate(start),
      weekEndIso: toIsoDate(end),
    };
  }, [weekOffset]);

  const sets = useLiveQuery(
    () => db.sets.where('date').between(weekStartIso, weekEndIso, true, true).toArray(),
    [weekStartIso, weekEndIso]
  ) || [];

  const tonnage = useMemo(() => aggregateWeekTonnage(sets), [sets]);
  const subTonnage = useMemo(() => aggregateWeekSubMuscleTonnage(sets), [sets]);
  const totalVolume = useMemo(
    () => sets.reduce((sum, s) => sum + setVolume(s), 0),
    [sets]
  );

  return (
    <>
      <div className="heatmap-header">
        <h2>Weekly<br />Heatmap</h2>
        <div style={{ textAlign: 'right' }}>
          <div className="week-range">{weekLabel(weekStart, weekEnd)}</div>
          <div className="row mt-s" style={{ justifyContent: 'flex-end', gap: 6 }}>
            <button
              onClick={() => setWeekOffset(weekOffset - 1)}
              style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6 }}
            >◀</button>
            <button
              onClick={() => setWeekOffset(0)}
              disabled={weekOffset === 0}
              style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, opacity: weekOffset === 0 ? 0.4 : 1 }}
            >Today</button>
            <button
              onClick={() => setWeekOffset(weekOffset + 1)}
              disabled={weekOffset >= 0}
              style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, opacity: weekOffset >= 0 ? 0.4 : 1 }}
            >▶</button>
          </div>
        </div>
      </div>

      {sets.length === 0 ? (
        <div className="empty">No sets logged this week.<br />Go lift something.</div>
      ) : (
        <>
          <BodyHeatmap tonnageByGroup={tonnage} tonnageBySub={subTonnage} onMuscleClick={setSelected} />

          <div className="legend">
            <span>Cold</span>
            <div className="bar" />
            <span>Over</span>
          </div>

          <div className="section" style={{ paddingTop: 0 }}>
            <div className="card">
              <div className="row spread">
                <div>
                  <div style={{ fontFamily: 'var(--f-display)', fontWeight: 900, fontSize: 34, lineHeight: 1 }} className="tabular">
                    {formatKg(totalVolume)} kg
                  </div>
                  <div className="muted" style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 4 }}>
                    Total Tonnage
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--f-display)', fontWeight: 900, fontSize: 34, lineHeight: 1 }} className="tabular">
                    {sets.length}
                  </div>
                  <div className="muted" style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 4 }}>
                    Sets
                  </div>
                </div>
              </div>
            </div>
          </div>

          <MuscleList
            tonnage={tonnage}
            subTonnage={subTonnage}
            selected={selected}
            onSelect={setSelected}
          />
        </>
      )}
    </>
  );
}

function MuscleList({ tonnage, subTonnage, selected, onSelect }) {
  const rows = Object.entries(tonnage)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  return (
    <>
      <div className="section" style={{ paddingBottom: 8 }}>
        <div className="label">By Muscle Group</div>
      </div>
      <div className="muscle-list">
        {rows.map(([group, v]) => {
          const grade = gradeMuscle(group, v);
          const isSelected = selected === group;
          const subEntries = Object.entries(subTonnage)
            .filter(([k]) => k.startsWith(`${group} — `))
            .sort(([, a], [, b]) => b - a);

          return (
            <div key={group}>
              <div
                className="muscle-row"
                onClick={() => onSelect(isSelected ? null : group)}
                style={{ cursor: 'pointer', borderColor: isSelected ? 'var(--accent)' : 'var(--line-soft)' }}
              >
                <div>
                  <div className="name">{group}</div>
                  <div className="muted" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 2 }}>
                    {grade.state === 'untrained' && 'Untouched'}
                    {grade.state === 'under' && `Under target (${formatKg(WEEKLY_TARGETS[group]?.min || 0)} kg)`}
                    {grade.state === 'hit' && 'Hit target'}
                    {grade.state === 'over' && 'Overloaded'}
                  </div>
                </div>
                <div className="tonnage tabular">{formatKg(v)} kg</div>
                <div className="swatch" style={{ background: grade.color }} />
              </div>
              {subEntries.length > 1 && (
                <div className="sub-muscle-breakdown">
                  {subEntries.map(([k, sv]) => {
                    const sub = k.split(' — ').slice(1).join(' — ');
                    const pct = v > 0 ? Math.round((sv / v) * 100) : 0;
                    return (
                      <div key={k} className="sub-muscle-row">
                        <span className="sub-name">{sub}</span>
                        <div className="sub-bar-track">
                          <div className="sub-bar-fill" style={{ width: `${pct}%`, background: grade.color }} />
                        </div>
                        <span className="sub-tonnage tabular">{formatKg(sv)} kg</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
