// Local development server — mirrors the Cloudflare Pages Functions in /functions.
// In production these endpoints run as Pages Functions; this file exists so
// `npm run dev` (+ the Vite proxy) can hit the same /api routes locally.
//
// Required env (see ../.env):
//   NOTION_TOKEN               — Internal integration secret
//   NOTION_WORKOUT_DB_ID       — Database ID of the Workout Log database
//   PORT                       — default 3001

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const PORT = process.env.PORT || 3001;
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_WORKOUT_DB_ID = process.env.NOTION_WORKOUT_DB_ID;

if (!NOTION_TOKEN || !NOTION_WORKOUT_DB_ID) {
  console.error('Missing NOTION_TOKEN or NOTION_WORKOUT_DB_ID in env. See .env.example.');
  process.exit(1);
}

const NOTION_HEADERS = {
  'Authorization':  `Bearer ${NOTION_TOKEN}`,
  'Notion-Version': '2022-06-28',
  'Content-Type':   'application/json',
};

function buildProperties(set) {
  const titleText = `${set.date} — ${set.exerciseName} — Set ${set.setNumber}`;
  const properties = {
    'Set Name':             { title: [{ text: { content: titleText } }] },
    'Date':                 { date: { start: set.date } },
    'Day Type':             { select: { name: set.dayType } },
    'Exercise':             { rich_text: [{ text: { content: set.exerciseName || '' } }] },
    'Primary Muscle Group': set.primaryGroup  ? { select:     { name: set.primaryGroup } }                   : undefined,
    'Sub Muscle (Primary)': set.primarySub    ? { rich_text:  [{ text: { content: set.primarySub } }] }      : undefined,
    'Primary %':            Number.isFinite(set.primaryPct) ? { number: set.primaryPct }                     : undefined,
    'Set Number':           { number: Number(set.setNumber) || 1 },
    'Weight (kg)':          { number: Number(set.weight)    || 0 },
    'Reps':                 { number: Number(set.reps)      || 0 },
    'Compound':             { checkbox: !!set.compound },
    'PR':                   { checkbox: !!set.isPR },
    'Session ID':           { rich_text: [{ text: { content: set.sessionId || '' } }] },
  };
  for (const k of Object.keys(properties)) {
    if (properties[k] === undefined) delete properties[k];
  }
  return properties;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, at: new Date().toISOString() }));

app.post('/api/sync-set', async (req, res) => {
  const set = req.body;
  try {
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: NOTION_HEADERS,
      body: JSON.stringify({
        parent: { database_id: NOTION_WORKOUT_DB_ID },
        properties: buildProperties(set),
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ ok: false, error: `Notion ${response.status}`, detail: text });
    }
    const page = await response.json();
    res.json({ ok: true, notionPageId: page.id });
  } catch (err) {
    console.error('[sync-set] failed', err);
    res.status(502).json({ ok: false, error: err?.message || 'Notion API error' });
  }
});

app.post('/api/update-set', async (req, res) => {
  const { notionPageId, set } = req.body || {};
  if (!notionPageId || !set) {
    return res.status(400).json({ ok: false, error: 'Missing notionPageId or set' });
  }
  try {
    const response = await fetch(`https://api.notion.com/v1/pages/${notionPageId}`, {
      method: 'PATCH',
      headers: NOTION_HEADERS,
      body: JSON.stringify({ properties: buildProperties(set) }),
    });
    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ ok: false, error: `Notion ${response.status}`, detail: text });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[update-set] failed', err);
    res.status(502).json({ ok: false, error: err?.message || 'Notion API error' });
  }
});

app.post('/api/delete-set', async (req, res) => {
  const { notionPageId } = req.body || {};
  if (!notionPageId) {
    return res.status(400).json({ ok: false, error: 'Missing notionPageId' });
  }
  try {
    const response = await fetch(`https://api.notion.com/v1/pages/${notionPageId}`, {
      method: 'PATCH',
      headers: NOTION_HEADERS,
      body: JSON.stringify({ archived: true }),
    });
    if (!response.ok) {
      if (response.status === 404) return res.json({ ok: true, alreadyGone: true });
      const text = await response.text();
      return res.status(502).json({ ok: false, error: `Notion ${response.status}`, detail: text });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[delete-set] failed', err);
    res.status(502).json({ ok: false, error: err?.message || 'Notion API error' });
  }
});

app.listen(PORT, () => console.log(`sync server listening on :${PORT}`));
