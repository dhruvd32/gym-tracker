// Archive a Notion page (Notion's API has no hard-delete; archived pages are
// hidden from the database view and can be restored from the trash if needed).
// Body: { notionPageId }

export async function onRequestPost(context) {
  const { env, request } = context;

  const NOTION_TOKEN = env.NOTION_TOKEN;
  if (!NOTION_TOKEN) {
    return Response.json({ ok: false, error: 'Server not configured' }, { status: 500 });
  }

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 }); }

  const { notionPageId } = body || {};
  if (!notionPageId) {
    return Response.json({ ok: false, error: 'Missing notionPageId' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.notion.com/v1/pages/${notionPageId}`, {
      method: 'PATCH',
      headers: {
        'Authorization':  `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type':   'application/json',
      },
      body: JSON.stringify({ archived: true }),
    });

    if (!res.ok) {
      const text = await res.text();
      // If the page is already gone (404), treat as success — idempotent delete.
      if (res.status === 404) return Response.json({ ok: true, alreadyGone: true });
      return Response.json({ ok: false, error: `Notion ${res.status}`, detail: text }, { status: 502 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: err?.message || String(err) }, { status: 502 });
  }
}
