import { normalizeId, isSelfRegistered } from '../../_lib/record.js';
import { newToken, hashToken, keyMatches, ownsRecord } from '../../_lib/auth.js';
import { getRecord, getSetting } from '../../_lib/db.js';
import { EVENT } from '../../_lib/config.js';
import { sameOrigin } from '../../_lib/origin.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

// somebody filed a provisional record off a link, then turned up and was
// handed one of the hundred cards. this moves what they already wrote onto
// the card and takes the provisional one away, so they are in the register
// once rather than twice.
//
// [id] is the card. two proofs are needed and neither is enough on its own:
// the key printed on the card, so it has to be in their hand, and the edit
// token for the old record, so it has to be theirs to move
export async function onRequestPost({ request, params, env }) {
  const id = normalizeId(params.id);
  if (!id) return json({ error: 'NO SUCH RECORD' }, 404);

  if (!sameOrigin(request)) return json({ error: 'REJECTED' }, 403);

  if ((await getSetting(env.DB, 'claiming_open', '0')) !== '1') {
    return json({ error: 'THE ARCHIVE IS NOT ACCEPTING SUBMISSIONS.' }, 403);
  }

  let form;
  try { form = await request.formData(); }
  catch { return json({ error: 'MALFORMED SUBMISSION' }, 400); }

  const from = normalizeId(form.get('from'));
  if (!from || from === id) return json({ error: 'NOTHING TO MOVE' }, 400);

  // only the made-on-demand ones move. an issued card is somebody else's
  if (!isSelfRegistered(from)) return json({ error: 'THAT RECORD CANNOT BE MOVED' }, 403);

  const target = await getRecord(env.DB, id);
  if (!target) return json({ error: 'NO SUCH RECORD' }, 404);
  if (target.status !== 'UNREGISTERED') {
    return json({ error: 'THIS DESIGNATION HAS ALREADY BEEN CLAIMED.', claimed: true }, 409);
  }
  if (!(await keyMatches(target, form.get('key')))) {
    return json({ error: 'THIS DESIGNATION CAN ONLY BE CLAIMED FROM ITS OWN CARD.' }, 403);
  }

  const source = await getRecord(env.DB, from);
  if (!source || source.status !== 'ESCAPED') return json({ error: 'NOTHING TO MOVE' }, 404);
  if (!(await ownsRecord(source, form.get('token')))) {
    return json({ error: 'THIS DEVICE DOES NOT HOLD THAT RECORD.' }, 403);
  }

  // the photo goes first. if it fails they keep the record, not the picture,
  // same bargain as the ordinary claim
  let photoKey = null;
  if (source.photo_key && env.PHOTOS) {
    try {
      const obj = await env.PHOTOS.get(source.photo_key);
      if (obj) {
        await env.PHOTOS.put(`${id}.jpg`, obj.body, { httpMetadata: { contentType: 'image/jpeg' } });
        photoKey = `${id}.jpg`;
      }
    } catch {  }
  }

  const token = newToken();
  const now = new Date().toISOString();

  // the WHERE is the lock, same as claim.js. somebody tapping this card at
  // the same moment either wins the claim or wins this, never both
  const res = await env.DB.prepare(`
    UPDATE records
       SET status = 'ESCAPED', name = ?, name_assigned = ?, faction = ?,
           handle = ?, hometown = ?, bio = ?, attempts = ?, first_show = ?, lyric = ?, bishop = ?,
           attending = ?, photo_key = ?, token_hash = ?, claimed_at = ?, updated_at = ?,
           location = ?, city = ?, event_date = ?
     WHERE id = ? AND status = 'UNREGISTERED'
  `).bind(
    source.name, source.name_assigned, source.faction,
    source.handle, source.hometown, source.bio, source.attempts, source.first_show,
    source.lyric, source.bishop, source.attending, photoKey,
    await hashToken(token),
    // when they actually filed, not now -- it keeps their place in the night
    source.claimed_at || now, now,
    EVENT.venue, EVENT.city, EVENT.date,
    id
  ).run();

  if (!res.meta || res.meta.changes !== 1) {
    if (photoKey && env.PHOTOS) { try { await env.PHOTOS.delete(photoKey); } catch {  } }
    return json({ error: 'THIS DESIGNATION HAS ALREADY BEEN CLAIMED.', claimed: true }, 409);
  }

  // and the provisional one stops existing. its number goes back in the pool
  if (source.photo_key && env.PHOTOS) { try { await env.PHOTOS.delete(source.photo_key); } catch {  } }
  await env.DB.prepare('DELETE FROM records WHERE id = ?').bind(from).run();

  return json({ ok: true, token, from, next: `/f/${id}` });
}
