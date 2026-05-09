-- gym.ledger — Supabase schema
-- Run this once in your Supabase SQL editor: https://supabase.com/dashboard/project/<project>/sql

CREATE TABLE IF NOT EXISTS workout_sets (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id    TEXT        NOT NULL,
  date          DATE        NOT NULL,
  day_type      TEXT        NOT NULL CHECK (day_type IN ('Push', 'Pull', 'Legs', 'Core')),
  exercise_name TEXT        NOT NULL,
  primary_group TEXT,
  primary_sub   TEXT,
  primary_pct   NUMERIC,
  compound      BOOLEAN     NOT NULL DEFAULT FALSE,
  set_number    INTEGER     NOT NULL DEFAULT 1,
  weight_kg     NUMERIC     NOT NULL DEFAULT 0,
  reps          INTEGER     NOT NULL DEFAULT 0,
  is_pr         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for the common read patterns
CREATE INDEX IF NOT EXISTS idx_workout_sets_user_date
  ON workout_sets (user_id, date);
CREATE INDEX IF NOT EXISTS idx_workout_sets_user_session
  ON workout_sets (user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_user_updated
  ON workout_sets (user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_workout_sets_user_exercise
  ON workout_sets (user_id, exercise_name);

-- Row Level Security: every user sees only their own rows
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own rows only" ON workout_sets;
CREATE POLICY "own rows only" ON workout_sets
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-bump updated_at on every UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workout_sets_updated_at ON workout_sets;
CREATE TRIGGER trg_workout_sets_updated_at
  BEFORE UPDATE ON workout_sets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
