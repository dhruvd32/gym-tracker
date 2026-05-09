/**
 * migrate-from-notion.mjs
 *
 * One-time script: reads every row from your Notion workout database and
 * inserts them into the Supabase `workout_sets` table under a given user.
 *
 * Prerequisites:
 *   npm install @notionhq/client @supabase/supabase-js dotenv
 *
 * Usage:
 *   1. Log into the new app with Google — note your user UUID from
 *      Supabase dashboard → Authentication → Users.
 *   2. Create scripts/.env (see scripts/.env.example).
 *   3. node scripts/migrate-from-notion.mjs
 */

import 'dotenv/config';
import { Client as NotionClient } from '@notionhq/client';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const {
  NOTION_TOKEN,
  NOTION_WORKOUT_DB_ID,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  USER_ID,
} = process.env;

for (const [k, v] of Object.entries({ NOTION_TOKEN, NOTION_WORKOUT_DB_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, USER_ID })) {
  if (!v) { console.error(`Missing env var: ${k}`); process.exit(1); }
}

const notion = new NotionClient({ auth: NOTION_TOKEN });
// Service role key bypasses RLS so we can insert with any user_id.
const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ─── Fetch all pages from Notion (paginated) ─────────────────────────────────

async function fetchAllNotionSets() {
  const results = [];
  let cursor;

  do {
    const res = await notion.databases.query({
      database_id: NOTION_WORKOUT_DB_ID,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    results.push(...res.results);
    cursor = res.has_more ? res.next_cursor : null;
    process.stdout.write(`\r  Fetched ${results.length} rows from Notion…`);
  } while (cursor);

  console.log();
  return results;
}

// ─── Transform a Notion page → Supabase row ──────────────────────────────────

function prop(page, name) {
  return page.properties[name];
}

function getText(p) {
  if (!p) return null;
  if (p.type === 'rich_text') return p.rich_text?.[0]?.plain_text ?? null;
  if (p.type === 'title')     return p.title?.[0]?.plain_text     ?? null;
  return null;
}

function getSelect(p) {
  return p?.select?.name ?? null;
}

function transformPage(page) {
  const p = page.properties;

  const date        = p['Date']?.date?.start ?? null;
  const dayType     = getSelect(p['Day Type']);
  const exerciseName = getText(p['Exercise']);
  const sessionId   = getText(p['Session ID']);
  const primaryGroup = getSelect(p['Primary Muscle Group']);
  const primarySub  = getText(p['Sub Muscle (Primary)']);
  const primaryPct  = p['Primary %']?.number ?? null;
  const setNumber   = p['Set Number']?.number ?? 1;
  const weightKg    = p['Weight (kg)']?.number ?? 0;
  const reps        = p['Reps']?.number ?? 0;
  const compound    = p['Compound']?.checkbox ?? false;
  const isPR        = p['PR']?.checkbox ?? false;
  const createdAt   = page.created_time;

  if (!date || !dayType || !exerciseName || !sessionId) return null;

  return {
    user_id:       USER_ID,
    session_id:    sessionId,
    date,
    day_type:      dayType,
    exercise_name: exerciseName,
    primary_group: primaryGroup,
    primary_sub:   primarySub,
    primary_pct:   primaryPct,
    compound,
    set_number:    setNumber,
    weight_kg:     weightKg,
    reps,
    is_pr:         isPR,
    created_at:    createdAt,
    updated_at:    createdAt,
  };
}

// ─── Insert into Supabase in batches ─────────────────────────────────────────

async function insertBatch(rows) {
  const { error } = await supabase.from('workout_sets').insert(rows);
  if (error) throw new Error(error.message);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\ngym.ledger — Notion → Supabase migration\n');

  const pages = await fetchAllNotionSets();
  console.log(`  Total Notion pages: ${pages.length}`);

  const rows = pages.map(transformPage).filter(Boolean);
  const skipped = pages.length - rows.length;
  if (skipped > 0) console.warn(`  Skipped ${skipped} incomplete pages (missing date, dayType, exercise, or sessionId)`);

  console.log(`  Inserting ${rows.length} rows into Supabase…`);

  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    await insertBatch(rows.slice(i, i + BATCH));
    inserted += Math.min(BATCH, rows.length - i);
    process.stdout.write(`\r  Inserted ${inserted}/${rows.length}…`);
  }

  console.log('\n\nDone! Open the app and log in — your history will load from Supabase.');
}

main().catch((err) => {
  console.error('\nMigration failed:', err.message);
  process.exit(1);
});
