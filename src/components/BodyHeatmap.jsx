import React from 'react';
import { gradeMuscle } from '../data/volume.js';

export function BodyHeatmap({ tonnageByGroup, tonnageBySub, highlightGroups, highlightSub, onMuscleClick }) {
  const color = (group, sub) => {
    if (highlightSub) {
      if (highlightSub.group === group) {
        if (!highlightSub.sub) return 'var(--accent)';
        if (highlightSub.sub === 'All Heads' || sub === 'All Heads') return 'var(--accent)';
        if (highlightSub.sub.includes('Deep Core') && group === 'Core') return 'var(--accent)';
        if (sub && sub.includes(highlightSub.sub)) return 'var(--accent)';
        if (sub && highlightSub.sub.includes(sub)) return 'var(--accent)';
        
        // Similar fallbacks
        if (sub === 'Front Delts (Anterior)' && highlightSub.sub.includes('Front Delt')) return 'var(--accent)';
        if (sub === 'Rear Delts (Posterior)' && highlightSub.sub.includes('Rear Delt')) return 'var(--accent)';
        if (sub === 'Side Delts (Medial)' && highlightSub.sub.includes('Side Delt')) return 'var(--accent)';
      }
      return 'var(--grade-untrained)';
    }

    if (highlightGroups) {
      return highlightGroups.has(group) ? 'var(--accent)' : 'var(--grade-untrained)';
    }

    if (tonnageBySub && sub) {
      const key = `${group} — ${sub}`;
      const t = tonnageBySub[key] || 0;
      const tAll = tonnageBySub[`${group} — All Heads`] || 0;
      return gradeMuscle(group, t + tAll).color;
    }

    return gradeMuscle(group, (tonnageByGroup || {})[group] || 0).color;
  };

  const clickable = (group, sub) => ({
    fill: color(group, sub),
    stroke: 'var(--line)',
    strokeWidth: 0.6,
    onClick: () => onMuscleClick?.(group, sub),
    style: { cursor: 'pointer', transition: 'fill 300ms ease' },
    'data-group': group,
    'data-sub': sub,
  });

  // Base Paths
  const ChestL = "M68 56 c-4 2 -8 8 -8 14 l2 18 c0 4 2 6 6 7 l18 3 c4 0 6 -2 6 -6 l0 -28 c0 -5 -2 -8 -6 -9 c-6 -2 -12 -1 -18 1 z";
  const ChestR = "M112 56 c4 2 8 8 8 14 l-2 18 c0 4 -2 6 -6 7 l-18 3 c-4 0 -6 -2 -6 -6 l0 -28 c0 -5 2 -8 6 -9 c6 -2 12 -1 18 1 z";
  
  const ShoulderL = "M60 58 c-8 2 -14 8 -16 18 l-2 10 c6 -2 12 -6 16 -12 l4 -10 c0 -3 0 -5 -2 -6 z";
  const ShoulderR = "M120 58 c8 2 14 8 16 18 l2 10 c-6 -2 -12 -6 -16 -12 l-4 -10 c0 -3 0 -5 2 -6 z";

  const BicepL = "M44 92 c-3 8 -4 18 -2 28 l3 16 c3 -4 5 -10 5 -18 l1 -18 c0 -6 -3 -10 -7 -8 z";
  const BicepR = "M136 92 c3 8 4 18 2 28 l-3 16 c-3 -4 -5 -10 -5 -18 l-1 -18 c0 -6 3 -10 7 -8 z";

  const ForearmL = "M46 138 c-3 10 -4 22 -2 34 l3 16 c4 -2 6 -8 6 -14 l1 -20 c0 -8 -3 -14 -8 -16 z";
  const ForearmR = "M134 138 c3 10 4 22 2 34 l-3 16 c-4 -2 -6 -8 -6 -14 l-1 -20 c0 -8 3 -14 8 -16 z";

  const CoreCenter = "M76 92 l0 52 c0 5 2 8 7 9 l14 0 c5 -1 7 -4 7 -9 l0 -52 c-4 2 -9 3 -14 3 c-5 0 -10 -1 -14 -3 z";
  const ObliqueL = "M68 93 l8 0 l0 53 l-8 -5 z";
  const ObliqueR = "M104 93 l8 0 l0 53 l-8 5 z";

  const QuadL = "M68 158 c-3 8 -4 20 -3 32 l4 48 c1 6 4 9 9 9 l4 0 c5 0 8 -3 9 -9 l2 -52 c0 -12 -2 -22 -5 -30 c-6 2 -13 3 -20 2 z";
  const QuadR = "M112 158 c3 8 4 20 3 32 l-4 48 c-1 6 -4 9 -9 9 l-4 0 c-5 0 -8 -3 -9 -9 l-2 -52 c0 -12 2 -22 5 -30 c6 2 13 3 20 2 z";

  const ShinL = "M72 252 c-2 10 -3 24 -2 38 l2 24 c1 5 4 7 8 7 l2 0 c4 0 6 -2 7 -6 l1 -28 c0 -14 -2 -26 -5 -34 z";
  const ShinR = "M108 252 c2 10 3 24 2 38 l-2 24 c-1 5 -4 7 -8 7 l-2 0 c-4 0 -6 -2 -7 -6 l-1 -28 c0 -14 2 -26 5 -34 z";

  const TrapsUpper = "M72 40 c0 6 2 14 8 18 l10 4 l10 -4 c6 -4 8 -12 8 -18 c-4 4 -10 6 -18 6 c-8 0 -14 -2 -18 -6 z";

  const LatL = "M68 58 c-4 4 -6 10 -6 16 l0 34 c0 6 4 10 10 10 l14 0 c3 0 4 -2 4 -4 l0 -56 c0 -2 -1 -4 -4 -4 c-6 0 -12 1 -18 4 z";
  const LatR = "M112 58 c4 4 6 10 6 16 l0 34 c0 6 -4 10 -10 10 l-14 0 c-3 0 -4 -2 -4 -4 l0 -56 c0 -2 1 -4 4 -4 c6 0 12 1 18 4 z";
  
  const MidBack = "M82 60 l16 0 l0 56 l-16 0 z";
  const LowerBack = "M78 120 l0 30 c0 4 2 6 6 6 l12 0 c4 0 6 -2 6 -6 l0 -30 c-4 2 -8 3 -12 3 c-4 0 -8 -1 -12 -3 z";

  const GluteL = "M72 156 c-4 4 -6 10 -6 18 l0 8 c0 6 4 10 10 10 l14 0 c2 0 3 -1 3 -3 l0 -30 c0 -3 -2 -4 -5 -4 c-6 0 -12 -1 -16 1 z";
  const GluteR = "M108 156 c4 4 6 10 6 18 l0 8 c0 6 -4 10 -10 10 l-14 0 c-2 0 -3 -1 -3 -3 l0 -30 c0 -3 2 -4 5 -4 c6 0 12 -1 16 1 z";

  const HamstringL = "M72 198 c-2 8 -3 20 -2 32 l3 30 c1 5 4 8 9 8 l3 0 c4 0 7 -3 8 -8 l1 -32 c0 -10 -1 -20 -4 -28 c-6 2 -12 2 -18 -2 z";
  const HamstringR = "M108 198 c2 8 3 20 2 32 l-3 30 c-1 5 -4 8 -9 8 l-3 0 c-4 0 -7 -3 -8 -8 l-1 -32 c0 -10 1 -20 4 -28 c6 2 12 2 18 -2 z";

  const CalfBackL = "M72 272 c-2 10 -3 22 -2 34 l2 22 c1 5 4 7 8 7 l2 0 c4 0 6 -2 7 -6 l1 -26 c0 -14 -2 -24 -5 -32 z";
  const CalfBackR = "M108 272 c2 10 3 22 2 34 l-2 22 c-1 5 -4 7 -8 7 l-2 0 c-4 0 -6 -2 -7 -6 l-1 -26 c0 -14 2 -24 5 -32 z";

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
            
            {/* Splits */}
            <clipPath id="chest-upper"><rect x="0" y="0" width="180" height="60" /></clipPath>
            <clipPath id="chest-mid"><rect x="0" y="60" width="180" height="15" /></clipPath>
            <clipPath id="chest-lower"><rect x="0" y="75" width="180" height="40" /></clipPath>

            <clipPath id="shoulder-l-side"><rect x="0" y="0" width="52" height="200" /></clipPath>
            <clipPath id="shoulder-l-front"><rect x="52" y="0" width="40" height="200" /></clipPath>
            <clipPath id="shoulder-r-side"><rect x="128" y="0" width="52" height="200" /></clipPath>
            <clipPath id="shoulder-r-front"><rect x="88" y="0" width="40" height="200" /></clipPath>

            <clipPath id="bicep-l-outer"><rect x="0" y="0" width="47" height="200" /></clipPath>
            <clipPath id="bicep-l-inner"><rect x="47" y="0" width="40" height="200" /></clipPath>
            <clipPath id="bicep-r-outer"><rect x="133" y="0" width="47" height="200" /></clipPath>
            <clipPath id="bicep-r-inner"><rect x="93" y="0" width="40" height="200" /></clipPath>

            <clipPath id="core-upper"><rect x="0" y="0" width="180" height="115" /></clipPath>
            <clipPath id="core-lower"><rect x="0" y="115" width="180" height="100" /></clipPath>

            <clipPath id="quad-l-outer"><rect x="0" y="0" width="60" height="300" /></clipPath>
            <clipPath id="quad-l-inner"><rect x="60" y="0" width="40" height="300" /></clipPath>
            <clipPath id="quad-r-outer"><rect x="120" y="0" width="60" height="300" /></clipPath>
            <clipPath id="quad-r-inner"><rect x="80" y="0" width="40" height="300" /></clipPath>
          </defs>

          {/* Body Outline */}
          <path
            d="M90 10 c14 0 22 10 22 22 c0 6 -1 10 -3 14 c8 3 18 10 22 22 l8 34 c2 10 2 18 -2 26 l-6 18 c-2 6 -2 12 0 18 l4 16 c2 10 2 22 -4 30 l-4 10 c-2 10 -2 22 2 32 l6 26 c3 14 3 28 -2 40 l-4 10 c-2 4 -4 6 -8 6 h-8 c-4 0 -6 -2 -7 -6 l-6 -26 c-2 -8 -3 -16 -3 -24 l-1 -36 h-6 l-1 36 c0 8 -1 16 -3 24 l-6 26 c-1 4 -3 6 -7 6 h-8 c-4 0 -6 -2 -8 -6 l-4 -10 c-5 -12 -5 -26 -2 -40 l6 -26 c4 -10 4 -22 2 -32 l-4 -10 c-6 -8 -6 -20 -4 -30 l4 -16 c2 -6 2 -12 0 -18 l-6 -18 c-4 -8 -4 -16 -2 -26 l8 -34 c4 -12 14 -19 22 -22 c-2 -4 -3 -8 -3 -14 c0 -12 8 -22 22 -22 z"
            fill="url(#skin-front)" stroke="var(--line)" strokeWidth="0.8"
          />
          <ellipse cx="90" cy="22" rx="11" ry="13" fill="var(--bg-card)" stroke="var(--line)" strokeWidth="0.6" />

          {/* Neck Front */}
          <path {...clickable('Traps', 'Upper Traps')} d="M80 38 l4 6 c2 2 10 2 12 0 l4 -6 c-2 4 -2 8 0 12 l-2 4 h-16 l-2 -4 c2 -4 2 -8 0 -12 z" />

          {/* Chest */}
          <path {...clickable('Chest', 'Upper Chest (Clavicular Head)')} d={ChestL} clipPath="url(#chest-upper)" />
          <path {...clickable('Chest', 'Upper Chest (Clavicular Head)')} d={ChestR} clipPath="url(#chest-upper)" />
          <path {...clickable('Chest', 'Mid Chest (Sternocostal Head)')} d={ChestL} clipPath="url(#chest-mid)" />
          <path {...clickable('Chest', 'Mid Chest (Sternocostal Head)')} d={ChestR} clipPath="url(#chest-mid)" />
          <path {...clickable('Chest', 'Lower Chest')} d={ChestL} clipPath="url(#chest-lower)" />
          <path {...clickable('Chest', 'Lower Chest')} d={ChestR} clipPath="url(#chest-lower)" />

          {/* Shoulders (Front) */}
          <path {...clickable('Shoulders', 'Side Delts (Medial)')} d={ShoulderL} clipPath="url(#shoulder-l-side)" />
          <path {...clickable('Shoulders', 'Front Delts (Anterior)')} d={ShoulderL} clipPath="url(#shoulder-l-front)" />
          <path {...clickable('Shoulders', 'Side Delts (Medial)')} d={ShoulderR} clipPath="url(#shoulder-r-side)" />
          <path {...clickable('Shoulders', 'Front Delts (Anterior)')} d={ShoulderR} clipPath="url(#shoulder-r-front)" />

          {/* Biceps */}
          <path {...clickable('Biceps', 'Long Head (Outer Bicep / Peak)')} d={BicepL} clipPath="url(#bicep-l-outer)" />
          <path {...clickable('Biceps', 'Short Head (Inner Bicep / Thickness)')} d={BicepL} clipPath="url(#bicep-l-inner)" />
          <path {...clickable('Biceps', 'Long Head (Outer Bicep / Peak)')} d={BicepR} clipPath="url(#bicep-r-outer)" />
          <path {...clickable('Biceps', 'Short Head (Inner Bicep / Thickness)')} d={BicepR} clipPath="url(#bicep-r-inner)" />

          {/* Forearms */}
          <path {...clickable('Forearms', 'Inner Forearm (Wrist Flexors)')} d={ForearmL} />
          <path {...clickable('Forearms', 'Inner Forearm (Wrist Flexors)')} d={ForearmR} />

          {/* Core */}
          <path {...clickable('Core', 'Upper Abs (Rectus Abdominis)')} d={CoreCenter} clipPath="url(#core-upper)" />
          <path {...clickable('Core', 'Lower Abs (Rectus Abdominis)')} d={CoreCenter} clipPath="url(#core-lower)" />
          <path {...clickable('Core', 'Obliques')} d={ObliqueL} />
          <path {...clickable('Core', 'Obliques')} d={ObliqueR} />

          {/* Quads */}
          <path {...clickable('Quads', 'Rectus Femoris / Vastus')} d={QuadL} clipPath="url(#quad-l-outer)" />
          <path {...clickable('Quads', 'Vastus Medialis / Inner Quad')} d={QuadL} clipPath="url(#quad-l-inner)" />
          <path {...clickable('Quads', 'Rectus Femoris / Vastus')} d={QuadR} clipPath="url(#quad-r-outer)" />
          <path {...clickable('Quads', 'Vastus Medialis / Inner Quad')} d={QuadR} clipPath="url(#quad-r-inner)" />

          {/* Shin / Soleus */}
          <path {...clickable('Calves', 'Soleus (Bent Knee)')} d={ShinL} />
          <path {...clickable('Calves', 'Soleus (Bent Knee)')} d={ShinR} />
        </svg>
        <div className="body-caption">Front</div>
      </div>

      {/* ——— BACK ——— */}
      <div>
        <svg viewBox="0 0 180 340" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M90 10 c14 0 22 10 22 22 c0 6 -1 10 -3 14 c8 3 18 10 22 22 l8 34 c2 10 2 18 -2 26 l-6 18 c-2 6 -2 12 0 18 l4 16 c2 10 2 22 -4 30 l-4 10 c-2 10 -2 22 2 32 l6 26 c3 14 3 28 -2 40 l-4 10 c-2 4 -4 6 -8 6 h-8 c-4 0 -6 -2 -7 -6 l-6 -26 c-2 -8 -3 -16 -3 -24 l-1 -36 h-6 l-1 36 c0 8 -1 16 -3 24 l-6 26 c-1 4 -3 6 -7 6 h-8 c-4 0 -6 -2 -8 -6 l-4 -10 c-5 -12 -5 -26 -2 -40 l6 -26 c4 -10 4 -22 2 -32 l-4 -10 c-6 -8 -6 -20 -4 -30 l4 -16 c2 -6 2 -12 0 -18 l-6 -18 c-4 -8 -4 -16 -2 -26 l8 -34 c4 -12 14 -19 22 -22 c-2 -4 -3 -8 -3 -14 c0 -12 8 -22 22 -22 z"
            fill="url(#skin-front)" stroke="var(--line)" strokeWidth="0.8"
          />
          <ellipse cx="90" cy="22" rx="11" ry="13" fill="var(--bg-card)" stroke="var(--line)" strokeWidth="0.6" />

          <path {...clickable('Traps', 'Upper Traps')} d={TrapsUpper} />

          {/* Shoulders (Back) */}
          <path {...clickable('Shoulders', 'Rear Delts (Posterior)')} d={ShoulderL} clipPath="url(#shoulder-l-front)" />
          <path {...clickable('Shoulders', 'Side Delts (Medial)')} d={ShoulderL} clipPath="url(#shoulder-l-side)" />
          <path {...clickable('Shoulders', 'Rear Delts (Posterior)')} d={ShoulderR} clipPath="url(#shoulder-r-front)" />
          <path {...clickable('Shoulders', 'Side Delts (Medial)')} d={ShoulderR} clipPath="url(#shoulder-r-side)" />

          {/* Back */}
          <path {...clickable('Back', 'Lats (Width / Vertical Pull)')} d={LatL} />
          <path {...clickable('Back', 'Lats (Width / Vertical Pull)')} d={LatR} />
          <path {...clickable('Back', 'Mid-Back (Rhomboids / Mid Traps)')} d={MidBack} />
          <path {...clickable('Back', 'Spinal Erectors / Lower Back')} d={LowerBack} />

          {/* Triceps */}
          <path {...clickable('Triceps', 'Long Head')} d={BicepL} />
          <path {...clickable('Triceps', 'Long Head')} d={BicepR} />
          
          <path {...clickable('Triceps', 'Lateral Head')} d={BicepL} clipPath="url(#bicep-l-outer)" />
          <path {...clickable('Triceps', 'Lateral Head')} d={BicepR} clipPath="url(#bicep-r-outer)" />

          {/* Forearms (Extensors) */}
          <path {...clickable('Forearms', 'Outer Forearm (Wrist Extensors)')} d={ForearmL} clipPath="url(#bicep-l-inner)" />
          <path {...clickable('Forearms', 'Outer Forearm (Wrist Extensors)')} d={ForearmR} clipPath="url(#bicep-r-inner)" />

          {/* Glutes */}
          <path {...clickable('Glutes', 'Glute Max (Hip Extension)')} d={GluteL} />
          <path {...clickable('Glutes', 'Glute Max (Hip Extension)')} d={GluteR} />

          {/* Hamstrings */}
          <path {...clickable('Hamstrings', 'Biceps Femoris')} d={HamstringL} />
          <path {...clickable('Hamstrings', 'Biceps Femoris')} d={HamstringR} />

          {/* Calves */}
          <path {...clickable('Calves', 'Gastrocnemius (Straight Leg)')} d={CalfBackL} />
          <path {...clickable('Calves', 'Gastrocnemius (Straight Leg)')} d={CalfBackR} />
        </svg>
        <div className="body-caption">Back</div>
      </div>
    </div>
  );
}
