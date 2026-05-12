// Seeded from Notion Gym Tracking pages (Push/Pull/Legs/Core).
// Primary % + Secondary % are used to distribute tonnage (Weight x Reps)
// across muscle groups and sub-muscles for the heatmap.
//
// Schema per row:
//   name            — canonical exercise name
//   day             — 'Push' | 'Pull' | 'Legs' | 'Core'
//   primaryGroup    — one of the 12 muscle groups (matches Notion select options)
//   primarySub      — sub-muscle label (free text, matches Notion)
//   primaryPct      — 0..100, proportion of work going to primary sub-muscle
//   secondary       — array of { group, sub, pct } for contribution heatmap
//   compound        — boolean
//   prWeightKg      — last known PR (kg). 0 for bodyweight. null if unknown.
//   prReps          — reps at PR. null if unknown.

export const EXERCISES = [
  // ——— PUSH ———
  {
    name: 'Flat Barbell Bench Press', day: 'Push',
    primaryGroup: 'Chest', primarySub: 'Mid Chest (Sternocostal Head)', primaryPct: 70,
    secondary: [
      { group: 'Shoulders', sub: 'Front Delts', pct: 20 },
      { group: 'Triceps', sub: 'Lateral Head', pct: 10 },
    ],
    compound: true, prWeightKg: 30, prReps: 6,
  },
  {
    name: 'Flat Dumbbell Press', day: 'Push',
    primaryGroup: 'Chest', primarySub: 'Mid Chest (Sternocostal Head)', primaryPct: 65,
    secondary: [
      { group: 'Shoulders', sub: 'Front Delts', pct: 20 },
      { group: 'Triceps', sub: 'Lateral Head', pct: 15 },
    ],
    compound: true, prWeightKg: null, prReps: null,
  },
  {
    name: 'Incline Barbell Bench Press', day: 'Push',
    primaryGroup: 'Chest', primarySub: 'Upper Chest (Clavicular Head)', primaryPct: 65,
    secondary: [
      { group: 'Shoulders', sub: 'Front Delts', pct: 25 },
      { group: 'Triceps', sub: 'Lateral Head', pct: 10 },
    ],
    compound: true, prWeightKg: 20, prReps: 6,
  },
  {
    name: 'Incline Dumbbell Press', day: 'Push',
    primaryGroup: 'Chest', primarySub: 'Upper Chest (Clavicular Head)', primaryPct: 60,
    secondary: [
      { group: 'Shoulders', sub: 'Front Delts', pct: 25 },
      { group: 'Triceps', sub: 'Lateral Head', pct: 15 },
    ],
    compound: true, prWeightKg: 15, prReps: 10,
  },
  {
    name: 'Dips', day: 'Push',
    primaryGroup: 'Chest', primarySub: 'Lower Chest', primaryPct: 55,
    secondary: [
      { group: 'Triceps', sub: 'Long Head', pct: 30 },
      { group: 'Shoulders', sub: 'Front Delts', pct: 15 },
    ],
    compound: true, prWeightKg: 0, prReps: 10,
  },
  {
    name: 'Close-Grip Bench Press', day: 'Push',
    primaryGroup: 'Triceps', primarySub: 'Lateral Head', primaryPct: 55,
    secondary: [
      { group: 'Chest', sub: 'Mid Chest', pct: 30 },
      { group: 'Shoulders', sub: 'Front Delts', pct: 15 },
    ],
    compound: true, prWeightKg: null, prReps: null,
  },
  {
    name: 'Low-to-High Cable Fly', day: 'Push',
    primaryGroup: 'Chest', primarySub: 'Upper Chest (Clavicular Head)', primaryPct: 80,
    secondary: [{ group: 'Shoulders', sub: 'Front Delts', pct: 20 }],
    compound: false, prWeightKg: null, prReps: null,
  },
  {
    name: 'High-to-Low Cable Fly', day: 'Push',
    primaryGroup: 'Chest', primarySub: 'Lower Chest', primaryPct: 80,
    secondary: [{ group: 'Shoulders', sub: 'Front Delts', pct: 20 }],
    compound: false, prWeightKg: null, prReps: null,
  },
  {
    name: 'Cable Chest Fly', day: 'Push',
    primaryGroup: 'Chest', primarySub: 'Mid Chest (Sternocostal Head)', primaryPct: 75,
    secondary: [{ group: 'Shoulders', sub: 'Front Delts', pct: 25 }],
    compound: false, prWeightKg: null, prReps: null,
  },
  {
    name: 'Pec Deck Machine Fly', day: 'Push',
    primaryGroup: 'Chest', primarySub: 'Mid Chest (Sternocostal Head)', primaryPct: 80,
    secondary: [{ group: 'Shoulders', sub: 'Front Delts', pct: 20 }],
    compound: false, prWeightKg: null, prReps: null,
  },
  {
    name: 'Chest Fly (Machine)', day: 'Push',
    primaryGroup: 'Chest', primarySub: 'Lower Chest', primaryPct: 75,
    secondary: [{ group: 'Shoulders', sub: 'Front Delts', pct: 25 }],
    compound: false, prWeightKg: 59, prReps: 10,
  },
  {
    name: 'Shoulder Barbell Press / OHP', day: 'Push',
    primaryGroup: 'Shoulders', primarySub: 'Front Delts (Anterior)', primaryPct: 60,
    secondary: [
      { group: 'Triceps', sub: 'Long Head', pct: 25 },
      { group: 'Chest', sub: 'Upper Chest', pct: 15 },
    ],
    compound: true, prWeightKg: 20, prReps: 10,
  },
  {
    name: 'Machine Shoulder Press', day: 'Push',
    primaryGroup: 'Shoulders', primarySub: 'Front Delts (Anterior)', primaryPct: 65,
    secondary: [{ group: 'Triceps', sub: 'Lateral Head', pct: 35 }],
    compound: true, prWeightKg: 23, prReps: 10,
  },
  {
    name: 'Dumbbell Shoulder Press', day: 'Push',
    primaryGroup: 'Shoulders', primarySub: 'Front Delts (Anterior)', primaryPct: 60,
    secondary: [
      { group: 'Triceps', sub: 'Long Head', pct: 25 },
      { group: 'Chest', sub: 'Upper Chest', pct: 15 },
    ],
    compound: true, prWeightKg: null, prReps: null,
  },
  {
    name: 'Lateral Raises (Dumbbell)', day: 'Push',
    primaryGroup: 'Shoulders', primarySub: 'Side Delts (Medial)', primaryPct: 85,
    secondary: [{ group: 'Traps', sub: 'Upper Traps', pct: 15 }],
    compound: false, prWeightKg: 5, prReps: 12,
  },
  {
    name: 'Cable Lateral Raise', day: 'Push',
    primaryGroup: 'Shoulders', primarySub: 'Side Delts (Medial)', primaryPct: 85,
    secondary: [{ group: 'Traps', sub: 'Upper Traps', pct: 15 }],
    compound: false, prWeightKg: null, prReps: null,
  },
  {
    name: 'Front Delt Dumbbell Raise', day: 'Push',
    primaryGroup: 'Shoulders', primarySub: 'Front Delts (Anterior)', primaryPct: 85,
    secondary: [{ group: 'Chest', sub: 'Upper Chest (Clavicular Head)', pct: 15 }],
    compound: false, prWeightKg: 7.5, prReps: 8,
  },
  {
    name: 'Reverse Pec Deck', day: 'Push',
    primaryGroup: 'Shoulders', primarySub: 'Rear Delts (Posterior)', primaryPct: 80,
    secondary: [{ group: 'Traps', sub: 'Middle Traps', pct: 20 }],
    compound: false, prWeightKg: null, prReps: null,
  },
  {
    name: 'Barbell Shrugs', day: 'Push',
    primaryGroup: 'Traps', primarySub: 'Upper Traps', primaryPct: 85,
    secondary: [{ group: 'Shoulders', sub: 'Rear Delts (Posterior)', pct: 15 }],
    compound: false, prWeightKg: 30, prReps: 10,
  },
  {
    name: 'Dumbbell Shrugs', day: 'Push',
    primaryGroup: 'Traps', primarySub: 'Upper Traps', primaryPct: 80,
    secondary: [{ group: 'Shoulders', sub: 'Rear Delts (Posterior)', pct: 20 }],
    compound: false, prWeightKg: 17.5, prReps: 10,
  },
  {
    name: 'Skullcrushers (EZ Bar)', day: 'Push',
    primaryGroup: 'Triceps', primarySub: 'Long Head', primaryPct: 80,
    secondary: [],
    compound: false, prWeightKg: 20, prReps: 5,
  },
  {
    name: 'Overhead Cable Triceps Extension', day: 'Push',
    primaryGroup: 'Triceps', primarySub: 'Long Head', primaryPct: 75,
    secondary: [{ group: 'Chest', sub: 'Lower Chest', pct: 25 }],
    compound: false, prWeightKg: 10, prReps: 5,
  },
  {
    name: 'Dumbbell Overhead Extension', day: 'Push',
    primaryGroup: 'Triceps', primarySub: 'Long Head', primaryPct: 75,
    secondary: [],
    compound: false, prWeightKg: 10, prReps: 8,
  },
  {
    name: 'Triceps Rope Pushdown', day: 'Push',
    primaryGroup: 'Triceps', primarySub: 'Lateral Head', primaryPct: 75,
    secondary: [],
    compound: false, prWeightKg: 25, prReps: 10,
  },
  {
    name: 'Straight Bar Cable Pushdown', day: 'Push',
    primaryGroup: 'Triceps', primarySub: 'Lateral Head', primaryPct: 70,
    secondary: [],
    compound: false, prWeightKg: null, prReps: null,
  },
  {
    name: 'Diamond Push-Ups', day: 'Push',
    primaryGroup: 'Triceps', primarySub: 'Lateral Head', primaryPct: 50,
    secondary: [
      { group: 'Chest', sub: 'Mid Chest', pct: 30 },
      { group: 'Shoulders', sub: 'Front Delts', pct: 20 },
    ],
    compound: true, prWeightKg: 0, prReps: 10,
  },

  // ——— PULL ———
  {
    name: 'Deadlift', day: 'Pull',
    primaryGroup: 'Back', primarySub: 'Spinal Erectors / Lower Back', primaryPct: 45,
    secondary: [
      { group: 'Hamstrings', sub: 'Biceps Femoris', pct: 25 },
      { group: 'Glutes', sub: 'Glute Max', pct: 15 },
      { group: 'Traps', sub: 'Upper Traps', pct: 10 },
      { group: 'Core', sub: 'Deep Core (Transverse Abdominis)', pct: 5 },
    ],
    compound: true, prWeightKg: null, prReps: null,
  },
  {
    name: 'Bent Over Barbell Row', day: 'Pull',
    primaryGroup: 'Back', primarySub: 'Mid-Back (Rhomboids / Mid Traps)', primaryPct: 50,
    secondary: [
      { group: 'Back', sub: 'Lats', pct: 20 },
      { group: 'Biceps', sub: 'Long Head', pct: 20 },
      { group: 'Shoulders', sub: 'Rear Delts', pct: 10 },
    ],
    compound: true, prWeightKg: 35, prReps: 8,
  },
  {
    name: 'T-Bar Row', day: 'Pull',
    primaryGroup: 'Back', primarySub: 'Mid-Back (Rhomboids / Mid Traps)', primaryPct: 55,
    secondary: [
      { group: 'Back', sub: 'Lats', pct: 20 },
      { group: 'Biceps', sub: 'Long Head', pct: 15 },
      { group: 'Shoulders', sub: 'Rear Delts', pct: 10 },
    ],
    compound: true, prWeightKg: null, prReps: null,
  },
  {
    name: 'Close Grip Seated Row', day: 'Pull',
    primaryGroup: 'Back', primarySub: 'Mid-Back (Rhomboids / Mid Traps)', primaryPct: 60,
    secondary: [
      { group: 'Back', sub: 'Lats', pct: 25 },
      { group: 'Biceps', sub: 'Long Head', pct: 15 },
    ],
    compound: true, prWeightKg: 36, prReps: 9,
  },
  {
    name: 'Single Arm Seated Row', day: 'Pull',
    primaryGroup: 'Back', primarySub: 'Mid-Back (Rhomboids / Mid Traps)', primaryPct: 65,
    secondary: [
      { group: 'Back', sub: 'Lats', pct: 20 },
      { group: 'Biceps', sub: 'Long Head', pct: 15 },
    ],
    compound: true, prWeightKg: 14, prReps: 9,
  },
  {
    name: 'Single Arm Dumbbell Row', day: 'Pull',
    primaryGroup: 'Back', primarySub: 'Lats (Width / Vertical Pull)', primaryPct: 60,
    secondary: [
      { group: 'Back', sub: 'Mid-Back', pct: 25 },
      { group: 'Biceps', sub: 'Long Head', pct: 15 },
    ],
    compound: true, prWeightKg: null, prReps: null,
  },
  {
    name: 'Wide Grip Pull Up', day: 'Pull',
    primaryGroup: 'Back', primarySub: 'Lats (Width / Vertical Pull)', primaryPct: 65,
    secondary: [
      { group: 'Biceps', sub: 'Brachialis', pct: 20 },
      { group: 'Shoulders', sub: 'Rear Delts', pct: 10 },
      { group: 'Core', sub: 'Deep Core (Transverse Abdominis)', pct: 5 },
    ],
    compound: true, prWeightKg: 0, prReps: 6,
  },
  {
    name: 'Wide Grip Lat Pulldown', day: 'Pull',
    primaryGroup: 'Back', primarySub: 'Lats (Width / Vertical Pull)', primaryPct: 65,
    secondary: [
      { group: 'Biceps', sub: 'Brachialis', pct: 20 },
      { group: 'Shoulders', sub: 'Rear Delts', pct: 10 },
      { group: 'Core', sub: 'Deep Core (Transverse Abdominis)', pct: 5 },
    ],
    compound: true, prWeightKg: 45, prReps: 8,
  },
  {
    name: 'Close Grip Pull Up (Chin Up)', day: 'Pull',
    primaryGroup: 'Back', primarySub: 'Lats (Width / Vertical Pull)', primaryPct: 55,
    secondary: [
      { group: 'Biceps', sub: 'Short Head', pct: 30 },
      { group: 'Shoulders', sub: 'Front Delts', pct: 15 },
    ],
    compound: true, prWeightKg: 0, prReps: null,
  },
  {
    name: 'Straight Arm Cable Pulldown', day: 'Pull',
    primaryGroup: 'Back', primarySub: 'Lats (Width / Vertical Pull)', primaryPct: 80,
    secondary: [{ group: 'Core', sub: 'Deep Core (Transverse Abdominis)', pct: 20 }],
    compound: false, prWeightKg: 13.6, prReps: 10,
  },
  {
    name: 'Face Pull', day: 'Pull',
    primaryGroup: 'Shoulders', primarySub: 'Rear Delts', primaryPct: 60,
    secondary: [
      { group: 'Traps', sub: 'Upper Traps', pct: 25 },
      { group: 'Shoulders', sub: 'External Rotators', pct: 15 },
    ],
    compound: false, prWeightKg: 13.6, prReps: 8,
  },
  {
    name: 'Rear Delt Dumbbell Fly', day: 'Pull',
    primaryGroup: 'Shoulders', primarySub: 'Rear Delts', primaryPct: 80,
    secondary: [{ group: 'Traps', sub: 'Middle Traps', pct: 20 }],
    compound: false, prWeightKg: null, prReps: null,
  },
  {
    name: 'Hyperextensions / Back Extensions', day: 'Pull',
    primaryGroup: 'Back', primarySub: 'Spinal Erectors / Lower Back', primaryPct: 70,
    secondary: [
      { group: 'Glutes', sub: 'Glute Max', pct: 20 },
      { group: 'Hamstrings', sub: 'Biceps Femoris', pct: 10 },
    ],
    compound: false, prWeightKg: null, prReps: null,
  },
  {
    name: 'EZ Barbell Preacher Curl', day: 'Pull',
    primaryGroup: 'Biceps', primarySub: 'Short Head (Inner Bicep / Thickness)', primaryPct: 80,
    secondary: [],
    compound: false, prWeightKg: 25, prReps: 8,
  },
  {
    name: 'Incline Dumbbell Curl', day: 'Pull',
    primaryGroup: 'Biceps', primarySub: 'Long Head (Outer Bicep / Peak)', primaryPct: 80,
    secondary: [{ group: 'Forearms', sub: 'Brachialis', pct: 20 }],
    compound: false, prWeightKg: 10, prReps: 8,
  },
  {
    name: 'Hammer Curl', day: 'Pull',
    primaryGroup: 'Biceps', primarySub: 'Long Head (Outer Bicep / Peak)', primaryPct: 60,
    secondary: [{ group: 'Forearms', sub: 'Brachioradialis', pct: 40 }],
    compound: false, prWeightKg: 10, prReps: 8,
  },
  {
    name: 'Concentration Curl', day: 'Pull',
    primaryGroup: 'Biceps', primarySub: 'Short Head (Inner Bicep / Thickness)', primaryPct: 85,
    secondary: [],
    compound: false, prWeightKg: null, prReps: null,
  },
  {
    name: 'Cable Curl with Rope', day: 'Pull',
    primaryGroup: 'Biceps', primarySub: 'Long Head (Outer Bicep / Peak)', primaryPct: 70,
    secondary: [],
    compound: false, prWeightKg: null, prReps: null,
  },
  {
    name: 'Reverse Barbell Curl', day: 'Pull',
    primaryGroup: 'Forearms', primarySub: 'Brachioradialis / Wrist Extensors', primaryPct: 70,
    secondary: [{ group: 'Biceps', sub: 'Long Head', pct: 30 }],
    compound: false, prWeightKg: 15, prReps: 10,
  },
  {
    name: 'Classic Wrist Curls', day: 'Pull',
    primaryGroup: 'Forearms', primarySub: 'Wrist Flexors (Inner Forearm)', primaryPct: 85,
    secondary: [],
    compound: false, prWeightKg: 15, prReps: null,
  },
  {
    name: 'Reverse Wrist Curls', day: 'Pull',
    primaryGroup: 'Forearms', primarySub: 'Wrist Extensors (Outer Forearm)', primaryPct: 85,
    secondary: [],
    compound: false, prWeightKg: 10, prReps: null,
  },
  {
    name: 'Dead Hangs', day: 'Pull',
    primaryGroup: 'Forearms', primarySub: 'Grip Strength / Brachioradialis', primaryPct: 60,
    secondary: [
      { group: 'Back', sub: 'Lats', pct: 30 },
      { group: 'Shoulders', sub: 'Shoulder Decompression', pct: 10 },
    ],
    compound: false, prWeightKg: 0, prReps: null,
  },

  // ——— LEGS ———
  {
    name: 'Squats', day: 'Legs',
    primaryGroup: 'Quads', primarySub: 'Rectus Femoris / Vastus', primaryPct: 55,
    secondary: [
      { group: 'Glutes', sub: 'Glute Max', pct: 20 },
      { group: 'Hamstrings', sub: 'Biceps Femoris', pct: 15 },
      { group: 'Core', sub: 'Deep Core (Transverse Abdominis)', pct: 10 },
    ],
    compound: true, prWeightKg: null, prReps: null,
  },
  {
    name: 'Bulgarian Split Squats', day: 'Legs',
    primaryGroup: 'Quads', primarySub: 'Rectus Femoris / Vastus', primaryPct: 55,
    secondary: [
      { group: 'Glutes', sub: 'Glute Max', pct: 20 },
      { group: 'Hamstrings', sub: 'Biceps Femoris', pct: 15 },
      { group: 'Core', sub: 'Deep Core (Transverse Abdominis)', pct: 10 },
    ],
    compound: true, prWeightKg: null, prReps: null,
  },
  {
    name: 'Leg Press', day: 'Legs',
    primaryGroup: 'Quads', primarySub: 'Rectus Femoris / Vastus', primaryPct: 65,
    secondary: [
      { group: 'Glutes', sub: 'Glute Max', pct: 20 },
      { group: 'Hamstrings', sub: 'Biceps Femoris', pct: 15 },
    ],
    compound: true, prWeightKg: null, prReps: null,
  },
  {
    name: 'Romanian Deadlift (RDL)', day: 'Legs',
    primaryGroup: 'Hamstrings', primarySub: 'Biceps Femoris (Hip Hinge)', primaryPct: 55,
    secondary: [
      { group: 'Glutes', sub: 'Glute Max', pct: 30 },
      { group: 'Back', sub: 'Spinal Erectors', pct: 15 },
    ],
    compound: true, prWeightKg: null, prReps: null,
  },
  {
    name: 'Single Leg RDL', day: 'Legs',
    primaryGroup: 'Hamstrings', primarySub: 'Biceps Femoris (Hip Hinge)', primaryPct: 60,
    secondary: [
      { group: 'Glutes', sub: 'Glute Max', pct: 25 },
      { group: 'Core', sub: 'Deep Core (Transverse Abdominis)', pct: 15 },
    ],
    compound: true, prWeightKg: 2.5, prReps: null,
  },
  {
    name: 'Barbell Hip Thrust', day: 'Legs',
    primaryGroup: 'Glutes', primarySub: 'Glute Max (Hip Extension)', primaryPct: 70,
    secondary: [
      { group: 'Hamstrings', sub: 'Biceps Femoris', pct: 20 },
      { group: 'Core', sub: 'Deep Core (Transverse Abdominis)', pct: 10 },
    ],
    compound: true, prWeightKg: null, prReps: null,
  },
  {
    name: 'Reverse Lunges', day: 'Legs',
    primaryGroup: 'Quads', primarySub: 'Rectus Femoris / Vastus', primaryPct: 50,
    secondary: [
      { group: 'Glutes', sub: 'Glute Max', pct: 20 },
      { group: 'Hamstrings', sub: 'Biceps Femoris', pct: 20 },
      { group: 'Core', sub: 'Deep Core (Transverse Abdominis)', pct: 10 },
    ],
    compound: true, prWeightKg: 0, prReps: null,
  },
  {
    name: 'Sumo Squats', day: 'Legs',
    primaryGroup: 'Quads', primarySub: 'Vastus Medialis / Inner Quad', primaryPct: 50,
    secondary: [
      { group: 'Glutes', sub: 'Glute Max', pct: 30 },
      { group: 'Quads', sub: 'Adductors', pct: 20 },
    ],
    compound: true, prWeightKg: 5, prReps: null,
  },
  {
    name: 'Quad Raises / Leg Extension', day: 'Legs',
    primaryGroup: 'Quads', primarySub: 'Rectus Femoris (Isolation)', primaryPct: 90,
    secondary: [],
    compound: false, prWeightKg: 14, prReps: null,
  },
  {
    name: 'Seated Hamstring Curl', day: 'Legs',
    primaryGroup: 'Hamstrings', primarySub: 'Biceps Femoris (Knee Flexion)', primaryPct: 85,
    secondary: [{ group: 'Calves', sub: 'Gastrocnemius', pct: 15 }],
    compound: false, prWeightKg: null, prReps: null,
  },
  {
    name: 'Glute Bridge', day: 'Legs',
    primaryGroup: 'Glutes', primarySub: 'Glute Max (Hip Extension)', primaryPct: 65,
    secondary: [
      { group: 'Hamstrings', sub: 'Biceps Femoris', pct: 25 },
      { group: 'Core', sub: 'Deep Core (Transverse Abdominis)', pct: 10 },
    ],
    compound: false, prWeightKg: 0, prReps: null,
  },
  {
    name: 'Cable Kickbacks', day: 'Legs',
    primaryGroup: 'Glutes', primarySub: 'Glute Max (Hip Extension)', primaryPct: 80,
    secondary: [{ group: 'Hamstrings', sub: 'Biceps Femoris', pct: 20 }],
    compound: false, prWeightKg: null, prReps: null,
  },
  {
    name: 'Standing Calf Raise', day: 'Legs',
    primaryGroup: 'Calves', primarySub: 'Gastrocnemius (Straight Leg)', primaryPct: 85,
    secondary: [],
    compound: false, prWeightKg: 50, prReps: null,
  },
  {
    name: 'Seated Calf Raise', day: 'Legs',
    primaryGroup: 'Calves', primarySub: 'Soleus (Bent Knee)', primaryPct: 85,
    secondary: [],
    compound: false, prWeightKg: null, prReps: null,
  },

  // ——— CORE ———
  {
    name: 'Cable Crunch', day: 'Core',
    primaryGroup: 'Core', primarySub: 'Upper Abs (Rectus Abdominis)', primaryPct: 85,
    secondary: [],
    compound: false, prWeightKg: null, prReps: null,
  },
  {
    name: 'Decline Sit-Up', day: 'Core',
    primaryGroup: 'Core', primarySub: 'Upper Abs (Rectus Abdominis)', primaryPct: 80,
    secondary: [{ group: 'Core', sub: 'Obliques', pct: 20 }],
    compound: false, prWeightKg: 0, prReps: null,
  },
  {
    name: 'Hanging Leg Raise', day: 'Core',
    primaryGroup: 'Core', primarySub: 'Lower Abs (Rectus Abdominis)', primaryPct: 75,
    secondary: [
      { group: 'Core', sub: 'Deep Core (Transverse Abdominis)', pct: 15 },
      { group: 'Forearms', sub: 'Grip Strength / Brachioradialis', pct: 10 },
    ],
    compound: false, prWeightKg: 0, prReps: null,
  },
  {
    name: 'Lying Leg Raise', day: 'Core',
    primaryGroup: 'Core', primarySub: 'Lower Abs (Rectus Abdominis)', primaryPct: 85,
    secondary: [{ group: 'Core', sub: 'Deep Core (Transverse Abdominis)', pct: 15 }],
    compound: false, prWeightKg: 0, prReps: null,
  },
  {
    name: "Captain's Chair Knee Raise", day: 'Core',
    primaryGroup: 'Core', primarySub: 'Lower Abs (Rectus Abdominis)', primaryPct: 80,
    secondary: [{ group: 'Core', sub: 'Deep Core (Transverse Abdominis)', pct: 20 }],
    compound: false, prWeightKg: 0, prReps: null,
  },
  {
    name: 'Ab Wheel Rollout', day: 'Core',
    primaryGroup: 'Core', primarySub: 'Upper Abs (Rectus Abdominis)', primaryPct: 60,
    secondary: [
      { group: 'Core', sub: 'Deep Core (Transverse Abdominis)', pct: 20 },
      { group: 'Shoulders', sub: 'Front Delts', pct: 10 },
      { group: 'Back', sub: 'Lats', pct: 10 },
    ],
    compound: true, prWeightKg: 0, prReps: null,
  },
  {
    name: 'Russian Twist', day: 'Core',
    primaryGroup: 'Core', primarySub: 'Obliques', primaryPct: 80,
    secondary: [{ group: 'Core', sub: 'Upper Abs (Rectus Abdominis)', pct: 20 }],
    compound: false, prWeightKg: 0, prReps: null,
  },
  {
    name: 'Cable Woodchopper', day: 'Core',
    primaryGroup: 'Core', primarySub: 'Obliques', primaryPct: 75,
    secondary: [
      { group: 'Core', sub: 'Deep Core (Transverse Abdominis)', pct: 15 },
      { group: 'Shoulders', sub: 'Front Delts', pct: 10 },
    ],
    compound: false, prWeightKg: null, prReps: null,
  },
  {
    name: 'Bicycle Crunch', day: 'Core',
    primaryGroup: 'Core', primarySub: 'Obliques', primaryPct: 65,
    secondary: [
      { group: 'Core', sub: 'Upper Abs (Rectus Abdominis)', pct: 20 },
      { group: 'Core', sub: 'Lower Abs (Rectus Abdominis)', pct: 15 },
    ],
    compound: false, prWeightKg: 0, prReps: null,
  },
  {
    name: 'Plank', day: 'Core',
    primaryGroup: 'Core', primarySub: 'Deep Core (Transverse Abdominis)', primaryPct: 70,
    secondary: [
      { group: 'Shoulders', sub: 'Front Delts', pct: 15 },
      { group: 'Core', sub: 'Upper Abs (Rectus Abdominis)', pct: 15 },
    ],
    compound: false, prWeightKg: 0, prReps: null,
  },
  {
    name: 'Dead Bug', day: 'Core',
    primaryGroup: 'Core', primarySub: 'Deep Core (Transverse Abdominis)', primaryPct: 75,
    secondary: [{ group: 'Core', sub: 'Lower Abs (Rectus Abdominis)', pct: 25 }],
    compound: false, prWeightKg: 0, prReps: null,
  },
  {
    name: 'Pallof Press', day: 'Core',
    primaryGroup: 'Core', primarySub: 'Obliques', primaryPct: 70,
    secondary: [{ group: 'Core', sub: 'Deep Core (Transverse Abdominis)', pct: 30 }],
    compound: false, prWeightKg: null, prReps: null,
  },
];

// Helpers ——————————————————————————————————————————————————————

export function exercisesByDay(day) {
  return EXERCISES.filter((e) => e.day === day);
}

export function subMusclesForDay(day) {
  const seen = new Map();
  for (const ex of exercisesByDay(day)) {
    const key = `${ex.primaryGroup}::${ex.primarySub}`;
    if (!seen.has(key)) seen.set(key, { group: ex.primaryGroup, sub: ex.primarySub });
  }
  return Array.from(seen.values()).sort((a, b) =>
    a.group === b.group ? a.sub.localeCompare(b.sub) : a.group.localeCompare(b.group)
  );
}

export function muscleGroupsForDay(day) {
  const seen = new Map();
  for (const ex of exercisesByDay(day)) {
    if (!seen.has(ex.primaryGroup)) seen.set(ex.primaryGroup, ex.primaryGroup);
  }
  return Array.from(seen.values()).sort();
}

export function exercisesFor(day, group, sub) {
  return EXERCISES.filter(
    (e) => e.day === day && e.primaryGroup === group && e.primarySub === sub
  );
}

export function exercisesForGroup(day, group) {
  return EXERCISES.filter((e) => e.day === day && e.primaryGroup === group);
}

export function findExercise(name) {
  return EXERCISES.find((e) => e.name === name);
}

// All 12 muscle groups (matches the Notion select options)
export const MUSCLE_GROUPS = [
  'Chest', 'Shoulders', 'Triceps', 'Back', 'Biceps', 'Forearms',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Traps', 'Core',
];
