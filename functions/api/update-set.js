// Update an existing Notion page's properties.
// Body: { notionPageId, set } where `set` has the same shape as sync-set.
// Only weight/reps and PR flag are user-editable in the app today, but we send
// the full property set for simplicity — Notion ignores unchanged fields.

export async function onRequestPost(context) {
  const { env, request } = context;

  const NOTION_TOKEN = env.NOTION_TOKEN;
  if (!NOTION_TOKEN) {
    return Response.json({ ok: false, error: 'Server not configured' }, { status: 500 });
  }

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 }); }

  const { notionPageId, set } = body || {};
  if (!notionPageId || !set) {
    return Response.json({ ok: false, error: 'Missing notionPageId or set' }, { status: 400 });
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

  for (const k of Object.keys(properties)) {
    if (properties[k] === undefined) delete properties[k];
  }

  try {
    const res = await fetch(`https://api.notion.com/v1/pages/${notionPageId}`, {
      method: 'PATCH',
      headers: {
        'Authorization':  `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type':   'application/json',
      },
      body: JSON.stringify({ properties }),
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json({ ok: false, error: `Notion ${res.status}`, detail: text }, { status: 502 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: err?.message || String(err) }, { status: 502 });
  }
}
