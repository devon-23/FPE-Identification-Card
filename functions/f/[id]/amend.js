import { normalizeId } from '../../_lib/record.js';
import { normalizeFaction } from '../../_lib/card.js';
import { cleanName } from '../../_lib/sanitize.js';
import { ownsRecord } from '../../_lib/auth.js';
import { readJpeg, putPhoto } from '../../_lib/photo.js';
import { getRecord } from '../../_lib/db.js';
import { sameOrigin } from '../../_lib/origin.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export async function onRequestPost({ request, params, env }) {
  const id = normalizeId(params.id);
  if (!id) return json({ error: 'NO SUCH RECORD' }, 404);

  if (!sameOrigin(request)) return json({ error: 'REJECTED' }, 403);

  const rec = await getRecord(env.DB, id);
  if (!rec || rec.status !== 'ESCAPED') return json({ error: 'NO SUCH RECORD' }, 404);

  let form;
  try { form = await request.formData(); }
  catch { return json({ error: 'MALFORMED SUBMISSION' }, 400); }

  // The whole security model, in one line.
  if (!(await ownsRecord(rec, form.get('token')))) {
    return json({ error: 'THIS DEVICE DOES NOT HOLD THIS RECORD.' }, 403);
  }

  const name = cleanName(form.get('name'));
  const faction = normalizeFaction(form.get('faction'));
  const now = new Date().toISOString();

  await env.DB.prepare(
    'UPDATE records SET name = ?, name_assigned = ?, faction = ?, updated_at = ? WHERE id = ?'
  ).bind(name || null, name ? 0 : 1, faction, now, id).run();

  // photo: 'keep' (default), 'remove', or a new file.
  const intent = String(form.get('photo_action') || 'keep');
  const file = form.get('photo');

  if (intent === 'remove') {
    if (rec.photo_key && env.PHOTOS) { try { await env.PHOTOS.delete(rec.photo_key); } catch {} }
    await env.DB.prepare('UPDATE records SET photo_key = NULL WHERE id = ?').bind(id).run();
  } else if (file && typeof file.arrayBuffer === 'function') {
    if (!env.PHOTOS) return json({ error: 'IMAGE STORAGE IS UNAVAILABLE.' }, 503);
    const { bytes, error } = await readJpeg(file);
    if (error) return json({ error }, 400);
    try {
      const key = await putPhoto(env.PHOTOS, id, bytes);
      await env.DB.prepare('UPDATE records SET photo_key = ? WHERE id = ?').bind(key, id).run();
    } catch {
      return json({ error: 'THE IMAGE COULD NOT BE STORED.' }, 502);
    }
  }

  return json({ ok: true, next: `/f/${id}` });
}
