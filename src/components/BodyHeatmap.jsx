import React from 'react';
import { gradeMuscle } from '../data/volume.js';

export function BodyHeatmap({ tonnageByGroup, subTonnage, highlightSub, onMuscleClick }) {
  // If highlightSub is provided (e.g. { group: 'Triceps', sub: 'Long Head...' }), we only light up that sub.
  // Otherwise, we color by subTonnage if available, falling back to group tonnage.
  
  const getTonnage = (group, sub) => {
    if (highlightSub) {
      if (highlightSub.group === group && highlightSub.sub === sub) return 99999; // max highlight
      return 0; // dim others
    }
    if (subTonnage) {
      const key = `${group} — ${sub}`;
      return subTonnage[key] || 0;
    }
    return tonnageByGroup?.[group] || 0;
  };

  const color = (group, sub) => {
    if (highlightSub) {
      return getTonnage(group, sub) > 0 ? 'var(--accent)' : 'var(--grade-untrained)';
    }
    // Grade by group targets, but ideally we'd grade by sub-muscle targets. 
    // For now we'll grade the sub-muscle tonnage using the group's targets (divided roughly or just visually).
    // Actually, just grading by group targets works visually if we scale it or just accept it's a relative heatmap.
    return gradeMuscle(group, getTonnage(group, sub)).color;
  };

  const clickable = (group, sub) => ({
    fill: color(group, sub),
    stroke: 'var(--line)',
    strokeWidth: 0.6,
    onClick: () => onMuscleClick?.(group),
    style: { cursor: 'pointer', transition: 'fill 300ms ease' },
    'data-group': group,
    'data-sub': sub,
  });

  return (
    <div className="body-svg-wrap">
      {/* ——— FRONT ——— */}
      <div>
        <svg viewBox="0 0 180 340" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="skin-front" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1a1a1d" />
              <stop offset="1" stopColor="#0f0f11" />
            </linearGradient>
            {/* Clip paths for chest */}
            <clipPath id="chest-upper"><rect x="0" y="0" width="180" height="60" /></clipPath>
            <clipPath id="chest-mid"><rect x="0" y="60" width="180" height="15" /></clipPath>
            <clipPath id="chest-lower"><rect x="0" y="75" width="180" height="50" /></clipPath>
            {/* Clip paths for biceps (Left Bicep = right side of screen, Right Bicep = left side of screen) */}
            <clipPath id="bicep-l-inner"><rect x="40" y="0" width="5" height="340" /></clipPath>
            <clipPath id="bicep-l-outer"><rect x="45" y="0" width="15" height="340" /></clipPath>
            <clipPath id="bicep-r-inner"><rect x="135" y="0" width="15" height="340" /></clipPath>
            <clipPath id="bicep-r-outer"><rect x="120" y="0" width="15" height="340" /></clipPath>
            {/* Clip paths for Quads */}
            <clipPath id="quads-inner"><rect x="80" y="0" width="20" height="340" /></clipPath>
            <clipPath id="quads-outer-l"><rect x="0" y="0" width="80" height="340" /></clipPath>
            <clipPath id="quads-outer-r"><rect x="100" y="0" width="80" height="340" /></clipPath>
          </defs>

          {/* body outline */}
          <path
            d="M90 10 c14 0 22 10 22 22 c0 6 -1 10 -3 14 c8 3 18 10 22 22 l8 34 c2 10 2 18 -2 26 l-6 18 c-2 6 -2 12 0 18 l4 16 c2 10 2 22 -4 30 l-4 10 c-2 10 -2 22 2 32 l6 26 c3 14 3 28 -2 40 l-4 10 c-2 4 -4 6 -8 6 h-8 c-4 0 -6 -2 -7 -6 l-6 -26 c-2 -8 -3 -16 -3 -24 l-1 -36 h-6 l-1 36 c0 8 -1 16 -3 24 l-6 26 c-1 4 -3 6 -7 6 h-8 c-4 0 -6 -2 -8 -6 l-4 -10 c-5 -12 -5 -26 -2 -40 l6 -26 c4 -10 4 -22 2 -32 l-4 -10 c-6 -8 -6 -20 -4 -30 l4 -16 c2 -6 2 -12 0 -18 l-6 -18 c-4 -8 -4 -16 -2 -26 l8 -34 c4 -12 14 -19 22 -22 c-2 -4 -3 -8 -3 -14 c0 -12 8 -22 22 -22 z"
            fill="url(#skin-front)" stroke="var(--line)" strokeWidth="0.8"
          />

          <ellipse cx="90" cy="22" rx="11" ry="13" fill="var(--bg-card)" stroke="var(--line)" strokeWidth="0.6" />

          {/* Upper Traps */}
          <path {...clickable('Traps', 'Upper Traps')} d="M80 38 l4 6 c2 2 10 2 12 0 l4 -6 c-2 4 -2 8 0 12 l-2 4 h-16 l-2 -4 c2 -4 2 -8 0 -12 z" />

          {/* Chest sub-muscles */}
          <g clipPath="url(#chest-upper)">
            <path {...clickable('Chest', 'Upper Chest (Clavicular Head)')} d="M68 56 c-4 2 -8 8 -8 14 l2 18 c0 4 2 6 6 7 l18 3 c4 0 6 -2 6 -6 l0 -28 c0 -5 -2 -8 -6 -9 c-6 -2 -12 -1 -18 1 z" />
            <path {...clickable('Chest', 'Upper Chest (Clavicular Head)')} d="M112 56 c4 2 8 8 8 14 l-2 18 c0 4 -2 6 -6 7 l-18 3 c-4 0 -6 -2 -6 -6 l0 -28 c0 -5 2 -8 6 -9 c6 -2 12 -1 18 1 z" />
          </g>
          <g clipPath="url(#chest-mid)">
            <path {...clickable('Chest', 'Mid Chest (Sternocostal Head)')} d="M68 56 c-4 2 -8 8 -8 14 l2 18 c0 4 2 6 6 7 l18 3 c4 0 6 -2 6 -6 l0 -28 c0 -5 -2 -8 -6 -9 c-6 -2 -12 -1 -18 1 z" />
            <path {...clickable('Chest', 'Mid Chest (Sternocostal Head)')} d="M112 56 c4 2 8 8 8 14 l-2 18 c0 4 -2 6 -6 7 l-18 3 c-4 0 -6 -2 -6 -6 l0 -28 c0 -5 2 -8 6 -9 c6 -2 12 -1 18 1 z" />
          </g>
          <g clipPath="url(#chest-lower)">
            <path {...clickable('Chest', 'Lower Chest')} d="M68 56 c-4 2 -8 8 -8 14 l2 18 c0 4 2 6 6 7 l18 3 c4 0 6 -2 6 -6 l0 -28 c0 -5 -2 -8 -6 -9 c-6 -2 -12 -1 -18 1 z" />
            <path {...clickable('Chest', 'Lower Chest')} d="M112 56 c4 2 8 8 8 14 l-2 18 c0 4 -2 6 -6 7 l-18 3 c-4 0 -6 -2 -6 -6 l0 -28 c0 -5 2 -8 6 -9 c6 -2 12 -1 18 1 z" />
          </g>

          {/* Shoulders - Front Delts */}
          <path {...clickable('Shoulders', 'Front Delts (Anterior)')} d="M60 58 c-8 2 -14 8 -16 18 l-2 10 c6 -2 12 -6 16 -12 l4 -10 c0 -3 0 -5 -2 -6 z" />
          <path {...clickable('Shoulders', 'Front Delts (Anterior)')} d="M120 58 c8 2 14 8 16 18 l2 10 c-6 -2 -12 -6 -16 -12 l-4 -10 c0 -3 0 -5 2 -6 z" />

          {/* Biceps sub-muscles */}
          <g clipPath="url(#bicep-l-inner)">
            <path {...clickable('Biceps', 'Short Head (Inner Bicep / Thickness)')} d="M44 92 c-3 8 -4 18 -2 28 l3 16 c3 -4 5 -10 5 -18 l1 -18 c0 -6 -3 -10 -7 -8 z" />
          </g>
          <g clipPath="url(#bicep-l-outer)">
            <path {...clickable('Biceps', 'Long Head (Outer Bicep / Peak)')} d="M44 92 c-3 8 -4 18 -2 28 l3 16 c3 -4 5 -10 5 -18 l1 -18 c0 -6 -3 -10 -7 -8 z" />
          </g>
          <g clipPath="url(#bicep-r-inner)">
            <path {...clickable('Biceps', 'Short Head (Inner Bicep / Thickness)')} d="M136 92 c3 8 4 18 2 28 l-3 16 c-3 -4 -5 -10 -5 -18 l-1 -18 c0 -6 3 -10 7 -8 z" />
          </g>
          <g clipPath="url(#bicep-r-outer)">
            <path {...clickable('Biceps', 'Long Head (Outer Bicep / Peak)')} d="M136 92 c3 8 4 18 2 28 l-3 16 c-3 -4 -5 -10 -5 -18 l-1 -18 c0 -6 3 -10 7 -8 z" />
          </g>

          {/* Forearms */}
          <path {...clickable('Forearms', 'Wrist Flexors (Inner Forearm)')} d="M46 138 c-3 10 -4 22 -2 34 l3 16 c4 -2 6 -8 6 -14 l1 -20 c0 -8 -3 -14 -8 -16 z" />
          <path {...clickable('Forearms', 'Wrist Flexors (Inner Forearm)')} d="M134 138 c3 10 4 22 2 34 l-3 16 c-4 -2 -6 -8 -6 -14 l-1 -20 c0 -8 3 -14 8 -16 z" />

          {/* Core */}
          <path {...clickable('Core', 'Upper Abs')} d="M76 92 l0 26 c0 5 2 8 7 9 l14 0 c5 -1 7 -4 7 -9 l0 -26 c-4 2 -9 3 -14 3 c-5 0 -10 -1 -14 -3 z" />
          <path {...clickable('Core', 'Lower Abs')} d="M76 118 l0 26 c0 5 2 8 7 9 l14 0 c5 -1 7 -4 7 -9 l0 -26 c-4 2 -9 3 -14 3 c-5 0 -10 -1 -14 -3 z" />

          {/* Quads */}
          <path {...clickable('Quads', 'Quads')} d="M68 158 c-3 8 -4 20 -3 32 l4 48 c1 6 4 9 9 9 l4 0 c5 0 8 -3 9 -9 l2 -52 c0 -12 -2 -22 -5 -30 c-6 2 -13 3 -20 2 z" />
          <path {...clickable('Quads', 'Quads')} d="M112 158 c3 8 4 20 3 32 l-4 48 c-1 6 -4 9 -9 9 l-4 0 c-5 0 -8 -3 -9 -9 l-2 -52 c0 -12 2 -22 5 -30 c6 2 13 3 20 2 z" />

          {/* Calves */}
          <path {...clickable('Calves', 'Calves')} d="M72 252 c-2 10 -3 24 -2 38 l2 24 c1 5 4 7 8 7 l2 0 c4 0 6 -2 7 -6 l1 -28 c0 -14 -2 -26 -5 -34 z" />
          <path {...clickable('Calves', 'Calves')} d="M108 252 c2 10 3 24 2 38 l-2 24 c-1 5 -4 7 -8 7 l-2 0 c-4 0 -6 -2 -7 -6 l-1 -28 c0 -14 2 -26 5 -34 z" />
        </svg>
        <div className="body-caption">Front</div>
      </div>

      {/* ——— BACK ——— */}
      <div>
        <svg viewBox="0 0 180 340" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <clipPath id="tricep-l-inner"><rect x="46" y="0" width="10" height="340" /></clipPath>
            <clipPath id="tricep-l-outer"><rect x="30" y="0" width="16" height="340" /></clipPath>
            <clipPath id="tricep-r-inner"><rect x="124" y="0" width="10" height="340" /></clipPath>
            <clipPath id="tricep-r-outer"><rect x="134" y="0" width="20" height="340" /></clipPath>
            <clipPath id="lats-outer"><rect x="0" y="0" width="75" height="340" /><rect x="105" y="0" width="75" height="340" /></clipPath>
            <clipPath id="rhomboids"><rect x="75" y="0" width="30" height="340" /></clipPath>
          </defs>

          <path d="M90 10 c14 0 22 10 22 22 c0 6 -1 10 -3 14 c8 3 18 10 22 22 l8 34 c2 10 2 18 -2 26 l-6 18 c-2 6 -2 12 0 18 l4 16 c2 10 2 22 -4 30 l-4 10 c-2 10 -2 22 2 32 l6 26 c3 14 3 28 -2 40 l-4 10 c-2 4 -4 6 -8 6 h-8 c-4 0 -6 -2 -7 -6 l-6 -26 c-2 -8 -3 -16 -3 -24 l-1 -36 h-6 l-1 36 c0 8 -1 16 -3 24 l-6 26 c-1 4 -3 6 -7 6 h-8 c-4 0 -6 -2 -8 -6 l-4 -10 c-5 -12 -5 -26 -2 -40 l6 -26 c4 -10 4 -22 2 -32 l-4 -10 c-6 -8 -6 -20 -4 -30 l4 -16 c2 -6 2 -12 0 -18 l-6 -18 c-4 -8 -4 -16 -2 -26 l8 -34 c4 -12 14 -19 22 -22 c-2 -4 -3 -8 -3 -14 c0 -12 8 -22 22 -22 z" fill="url(#skin-front)" stroke="var(--line)" strokeWidth="0.8" />

          <ellipse cx="90" cy="22" rx="11" ry="13" fill="var(--bg-card)" stroke="var(--line)" strokeWidth="0.6" />

          {/* Upper Traps */}
          <path {...clickable('Traps', 'Upper Traps')} d="M72 40 c0 6 2 14 8 18 l10 4 l10 -4 c6 -4 8 -12 8 -18 c-4 4 -10 6 -18 6 c-8 0 -14 -2 -18 -6 z" />

          {/* Shoulders - Rear Delts */}
          <path {...clickable('Shoulders', 'Rear Delts (Posterior)')} d="M60 58 c-8 2 -14 8 -16 18 l-2 10 c6 -2 12 -6 16 -12 l4 -10 c0 -3 0 -5 -2 -6 z" />
          <path {...clickable('Shoulders', 'Rear Delts (Posterior)')} d="M120 58 c8 2 14 8 16 18 l2 10 c-6 -2 -12 -6 -16 -12 l-4 -10 c0 -3 0 -5 2 -6 z" />

          {/* Back sub-muscles */}
          <g clipPath="url(#lats-outer)">
            <path {...clickable('Back', 'Lats (Width / Vertical Pull)')} d="M68 58 c-4 4 -6 10 -6 16 l0 34 c0 6 4 10 10 10 l14 0 c3 0 4 -2 4 -4 l0 -56 c0 -2 -1 -4 -4 -4 c-6 0 -12 1 -18 4 z" />
            <path {...clickable('Back', 'Lats (Width / Vertical Pull)')} d="M112 58 c4 4 6 10 6 16 l0 34 c0 6 -4 10 -10 10 l-14 0 c-3 0 -4 -2 -4 -4 l0 -56 c0 -2 1 -4 4 -4 c6 0 12 1 18 4 z" />
          </g>
          <g clipPath="url(#rhomboids)">
            <path {...clickable('Back', 'Mid-Back (Rhomboids / Mid Traps)')} d="M68 58 c-4 4 -6 10 -6 16 l0 34 c0 6 4 10 10 10 l14 0 c3 0 4 -2 4 -4 l0 -56 c0 -2 -1 -4 -4 -4 c-6 0 -12 1 -18 4 z" />
            <path {...clickable('Back', 'Mid-Back (Rhomboids / Mid Traps)')} d="M112 58 c4 4 6 10 6 16 l0 34 c0 6 -4 10 -10 10 l-14 0 c-3 0 -4 -2 -4 -4 l0 -56 c0 -2 1 -4 4 -4 c6 0 12 1 18 4 z" />
          </g>

          {/* Lower Back */}
          <path {...clickable('Back', 'Spinal Erectors / Lower Back')} d="M78 120 l0 30 c0 4 2 6 6 6 l12 0 c4 0 6 -2 6 -6 l0 -30 c-4 2 -8 3 -12 3 c-4 0 -8 -1 -12 -3 z" />

          {/* Triceps sub-muscles */}
          <g clipPath="url(#tricep-l-inner)">
            <path {...clickable('Triceps', 'Long Head (Stretch / Overhead)')} d="M44 92 c-3 8 -4 18 -2 28 l3 16 c3 -4 5 -10 5 -18 l1 -18 c0 -6 -3 -10 -7 -8 z" />
          </g>
          <g clipPath="url(#tricep-l-outer)">
            <path {...clickable('Triceps', 'Lateral Head (Outer / Pushdown)')} d="M44 92 c-3 8 -4 18 -2 28 l3 16 c3 -4 5 -10 5 -18 l1 -18 c0 -6 -3 -10 -7 -8 z" />
          </g>
          <g clipPath="url(#tricep-r-inner)">
            <path {...clickable('Triceps', 'Long Head (Stretch / Overhead)')} d="M136 92 c3 8 4 18 2 28 l-3 16 c-3 -4 -5 -10 -5 -18 l-1 -18 c0 -6 3 -10 7 -8 z" />
          </g>
          <g clipPath="url(#tricep-r-outer)">
            <path {...clickable('Triceps', 'Lateral Head (Outer / Pushdown)')} d="M136 92 c3 8 4 18 2 28 l-3 16 c-3 -4 -5 -10 -5 -18 l-1 -18 c0 -6 3 -10 7 -8 z" />
          </g>

          {/* Forearms back */}
          <path {...clickable('Forearms', 'Brachioradialis / Wrist Extensors')} d="M46 138 c-3 10 -4 22 -2 34 l3 16 c4 -2 6 -8 6 -14 l1 -20 c0 -8 -3 -14 -8 -16 z" />
          <path {...clickable('Forearms', 'Brachioradialis / Wrist Extensors')} d="M134 138 c3 10 4 22 2 34 l-3 16 c-4 -2 -6 -8 -6 -14 l-1 -20 c0 -8 3 -14 8 -16 z" />

          {/* Glutes */}
          <path {...clickable('Glutes', 'Glutes')} d="M72 156 c-4 4 -6 10 -6 18 l0 8 c0 6 4 10 10 10 l14 0 c2 0 3 -1 3 -3 l0 -30 c0 -3 -2 -4 -5 -4 c-6 0 -12 -1 -16 1 z" />
          <path {...clickable('Glutes', 'Glutes')} d="M108 156 c4 4 6 10 6 18 l0 8 c0 6 -4 10 -10 10 l-14 0 c-2 0 -3 -1 -3 -3 l0 -30 c0 -3 2 -4 5 -4 c6 0 12 -1 16 1 z" />

          {/* Hamstrings */}
          <path {...clickable('Hamstrings', 'Hamstrings')} d="M72 198 c-2 8 -3 20 -2 32 l3 30 c1 5 4 8 9 8 l3 0 c4 0 7 -3 8 -8 l1 -32 c0 -10 -1 -20 -4 -28 c-6 2 -12 2 -18 -2 z" />
          <path {...clickable('Hamstrings', 'Hamstrings')} d="M108 198 c2 8 3 20 2 32 l-3 30 c-1 5 -4 8 -9 8 l-3 0 c-4 0 -7 -3 -8 -8 l-1 -32 c0 -10 1 -20 4 -28 c6 2 12 2 18 -2 z" />

          {/* Calves back */}
          <path {...clickable('Calves', 'Calves')} d="M72 272 c-2 10 -3 22 -2 34 l2 22 c1 5 4 7 8 7 l2 0 c4 0 6 -2 7 -6 l1 -26 c0 -14 -2 -24 -5 -32 z" />
          <path {...clickable('Calves', 'Calves')} d="M108 272 c2 10 3 22 2 34 l-2 22 c-1 5 -4 7 -8 7 l-2 0 c-4 0 -6 -2 -7 -6 l-1 -26 c0 -14 2 -24 5 -32 z" />
        </svg>
        <div className="body-caption">Back</div>
      </div>
    </div>
  );
}
