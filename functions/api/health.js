export async function onRequestGet() {
  return Response.json({ ok: true, at: new Date().toISOString() });
}
