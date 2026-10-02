import { normalizeId } from '../../_lib/record.js';
import { normalizeFaction } from '../../_lib/card.js';
import { cleanName, cleanHandle, cleanHometown, cleanBio, cleanAttempts } from '../../_lib/sanitize.js';
import { newToken, hashToken } from '../../_lib/auth.js';
import { readJpeg, putPhoto } from '../../_lib/photo.js';
import { getSetting } from '../../_lib/db.js';
import { EVENT } from '../../_lib/config.js';
import { sameOrigin } from '../../_lib/origin.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export async function onRequestPost({ request, params, env }) {
  const id = normalizeId(params.id);
  if (!id) return json({ error: 'NO SUCH RECORD' }, 404);

  // Same-origin guard: a cross-site form post will not carry this.
  if (!sameOrigin(request)) return json({ error: 'REJECTED' }, 403);

  if ((await getSetting(env.DB, 'claiming_open', '0')) !== '1') {
    return json({ error: 'THE ARCHIVE IS NOT ACCEPTING SUBMISSIONS.' }, 403);
  }

  let form;
  try { form = await request.formData(); }
  catch { return json({ error: 'MALFORMED SUBMISSION' }, 400); }

  const name = cleanName(form.get('name'));
  const faction = normalizeFaction(form.get('faction'));
  const handle = cleanHandle(form.get('handle'));
  const hometown = cleanHometown(form.get('hometown'));
  const bio = cleanBio(form.get('bio'));
  const attempts = cleanAttempts(form.get('attempts'));
  const token = newToken();
  const now = new Date().toISOString();

  // Atomic: the WHERE clause is the lock. Two phones tapping the same tag at
  // the same instant cannot both succeed -- exactly one UPDATE matches a row
  // still in UNREGISTERED, and the loser is told so.
  const res = await env.DB.prepare(`
    UPDATE records
       SET status = 'ESCAPED', name = ?, name_assigned = ?, faction = ?,
           handle = ?, hometown = ?, bio = ?, attempts = ?,
           token_hash = ?, claimed_at = ?, updated_at = ?,
           location = ?, city = ?, event_date = ?
     WHERE id = ? AND status = 'UNREGISTERED'
  `).bind(
    name || null, name ? 0 : 1, faction,
    handle || null, hometown || null, bio || null, attempts,
    await hashToken(token), now, now,
    EVENT.venue, EVENT.city, EVENT.dateDisplay,
    id
  ).run();

  if (!res.meta || res.meta.changes !== 1) {
    return json({ error: 'THIS DESIGNATION HAS ALREADY BEEN CLAIMED.', claimed: true }, 409);
  }

  // The photo is written only after the claim succeeds, so a lost race never
  // leaves an orphan in the bucket. A failure here costs the photo, not the record.
  let photo = false;
  const file = form.get('photo');
  if (env.PHOTOS && file && typeof file.arrayBuffer === 'function') {
    const { bytes, error } = await readJpeg(file);
    if (!error) {
      try {
        const key = await putPhoto(env.PHOTOS, id, bytes);
        await env.DB.prepare('UPDATE records SET photo_key = ? WHERE id = ?').bind(key, id).run();
        photo = true;
      } catch { /* record stands without a photo */ }
    }
  }

  return json({ ok: true, token, photo, next: `/f/${id}` });
}
