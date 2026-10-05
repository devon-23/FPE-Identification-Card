import { normalizeId } from '../../_lib/record.js';
import { normalizeFaction } from '../../_lib/card.js';
import { BISHOPS } from '../../_lib/lore.js';
import { cleanName, cleanHandle, cleanHometown, cleanBio, cleanAttempts, cleanLyric, cleanFirstShow, cleanBishop } from '../../_lib/sanitize.js';
import { newToken, hashToken, keyMatches } from '../../_lib/auth.js';
import { readJpeg, putPhoto } from '../../_lib/photo.js';
import { getRecord, getSetting } from '../../_lib/db.js';
import { EVENT } from '../../_lib/config.js';
import { sameOrigin } from '../../_lib/origin.js';
import { lookup } from '../../_lib/geo.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export async function onRequestPost({ request, params, env, waitUntil }) {
  // first registration only. amend.js handles everything after
  const id = normalizeId(params.id);
  if (!id) return json({ error: 'NO SUCH RECORD' }, 404);

  if (!sameOrigin(request)) return json({ error: 'REJECTED' }, 403);

  if ((await getSetting(env.DB, 'claiming_open', '0')) !== '1') {
    return json({ error: 'THE ARCHIVE IS NOT ACCEPTING SUBMISSIONS.' }, 403);
  }

  let form;
  try { form = await request.formData(); }
  catch { return json({ error: 'MALFORMED SUBMISSION' }, 400); }

  const rec = await getRecord(env.DB, id);
  if (!rec) return json({ error: 'NO SUCH RECORD' }, 404);
  if (!(await keyMatches(rec, form.get('key')))) {
    return json({ error: 'THIS DESIGNATION CAN ONLY BE REGISTERED FROM ITS OWN CARD.' }, 403);
  }

  const name = cleanName(form.get('name'));
  const faction = normalizeFaction(form.get('faction'));
  const handle = cleanHandle(form.get('handle'));
  const hometown = cleanHometown(form.get('hometown'));
  const bio = cleanBio(form.get('bio'));
  const attempts = cleanAttempts(form.get('attempts'));
  const firstShow = cleanFirstShow(form.get('firstShow'));
  const lyric = cleanLyric(form.get('lyric'));
  const bishop = cleanBishop(form.get('bishop'), BISHOPS);
  const attending = form.get('attending') === '1' ? 1 : 0;
  const token = newToken();
  const now = new Date().toISOString();

  const res = await env.DB.prepare(`
    UPDATE records
       SET status = 'ESCAPED', name = ?, name_assigned = ?, faction = ?,
           handle = ?, hometown = ?, bio = ?, attempts = ?, first_show = ?, lyric = ?, bishop = ?,
           attending = ?, token_hash = ?, claimed_at = ?, updated_at = ?,
           location = ?, city = ?, event_date = ?
     WHERE id = ? AND status = 'UNREGISTERED'
    -- the WHERE is the lock. two people tapping at once, one wins
  `).bind(
    name || null, name ? 0 : 1, faction,
    handle || null, hometown || null, bio || null, attempts, firstShow, lyric || null, bishop,
    attending, await hashToken(token), now, now,
    EVENT.venue, EVENT.city, EVENT.date,
    id
  ).run();

  if (!res.meta || res.meta.changes !== 1) {
    return json({ error: 'THIS DESIGNATION HAS ALREADY BEEN CLAIMED.', claimed: true }, 409);
  }

  let photo = false;
  // photo goes in after the claim lands, so a lost race leaves nothing
  // orphaned in the bucket. if this fails they keep the record, not the photo
  const file = form.get('photo');
  if (env.PHOTOS && file && typeof file.arrayBuffer === 'function') {
    const { bytes, error } = await readJpeg(file);
    if (!error) {
      try {
        const key = await putPhoto(env.PHOTOS, id, bytes);
        await env.DB.prepare('UPDATE records SET photo_key = ? WHERE id = ?').bind(key, id).run();
        photo = true;
      } catch {  }
    }
  }

  // after the response, so a slow geocoder never holds up a claim at the venue
  // no pin, no point asking nominatim
  if (hometown && attending && waitUntil) waitUntil(lookup(env.DB, hometown));

  return json({ ok: true, token, photo, next: `/f/${id}` });
}
