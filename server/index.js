// POST /api/sync-set  →  creates a row in the Notion Workout Log database.
// Token stays server-side (NEVER ship this to the client).
//
// Required env (see .env.example):
//   NOTION_TOKEN               — Internal integration secret
//   NOTION_WORKOUT_DB_ID       — Database ID of the Workout Log database
//   PORT                       — default 3001

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Client } from '@notionhq/client';

const PORT = process.env.PORT || 3001;
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_WORKOUT_DB_ID = process.env.NOTION_WORKOUT_DB_ID;

if (!NOTION_TOKEN || !NOTION_WORKOUT_DB_ID) {
  console.error('Missing NOTION_TOKEN or NOTION_WORKOUT_DB_ID in env. See .env.example.');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, at: new Date().toISOString() }));

app.post('/api/sync-set', async (req, res) => {
  const set = req.body;
  try {
    const titleText =
      `${set.date} — ${set.exerciseName} — Set ${set.setNumber}`;

    const properties = {
      'Set Name': { title: [{ text: { content: titleText } }] },
      'Date': { date: { start: set.date } },
      'Day Type': { select: { name: set.dayType } },
      'Exercise': { rich_text: [{ text: { content: set.exerciseName || '' } }] },
      'Primary Muscle Group': set.primaryGroup
        ? { select: { name: set.primaryGroup } }
        : undefined,
      'Sub Muscle (Primary)': set.primarySub
        ? { rich_text: [{ text: { content: set.primarySub } }] }
        : undefined,
      'Primary %': Number.isFinite(set.primaryPct) ? { number: set.primaryPct } : undefined,
      'Set Number': { number: Number(set.setNumber) || 1 },
      'Weight (kg)': { number: Number(set.weight) || 0 },
      'Reps': { number: Number(set.reps) || 0 },
      'Compound': { checkbox: !!set.compound },
      'PR': { checkbox: !!set.isPR },
      'Session ID': { rich_text: [{ text: { content: set.sessionId || '' } }] },
    };

    // strip undefined properties (Notion throws if any prop is undefined)
    for (const k of Object.keys(properties)) {
      if (properties[k] === undefined) delete properties[k];
    }

    const page = await notion.pages.create({
      parent: { database_id: NOTION_WORKOUT_DB_ID },
      properties,
    });

    res.json({ ok: true, notionPageId: page.id });
  } catch (err) {
    console.error('[sync-set] failed', err?.body || err?.message || err);
    res.status(502).json({
      ok: false,
      error: err?.message || 'Notion API error',
      detail: err?.body || null,
    });
  }
});

app.listen(PORT, () => console.log(`sync server listening on :${PORT}`));
