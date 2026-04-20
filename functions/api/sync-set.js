// Cloudflare Pages Function — runs server-side, keeps NOTION_TOKEN off the client.
// Mirrors the logic in server/index.js but uses the Web fetch API (no Node deps).

export async function onRequestPost(context) {
  const { env, request } = context;

  const NOTION_TOKEN = env.NOTION_TOKEN;
  const NOTION_WORKOUT_DB_ID = env.NOTION_WORKOUT_DB_ID;

  if (!NOTION_TOKEN || !NOTION_WORKOUT_DB_ID) {
    return Response.json(
      { ok: false, error: 'Server not configured — set NOTION_TOKEN and NOTION_WORKOUT_DB_ID in Cloudflare Pages environment variables.' },
      { status: 500 }
    );
  }

  let set;
  try {
    set = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

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

  // Notion throws if any property value is undefined
  for (const k of Object.keys(properties)) {
    if (properties[k] === undefined) delete properties[k];
  }

  try {
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization':  `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type':   'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: NOTION_WORKOUT_DB_ID },
        properties,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return Response.json({ ok: false, error: `Notion ${res.status}`, detail: body }, { status: 502 });
    }

    const page = await res.json();
    return Response.json({ ok: true, notionPageId: page.id });
  } catch (err) {
    return Response.json({ ok: false, error: err?.message || String(err) }, { status: 502 });
  }
}
