import { normalizeId, isSelfRegistered } from '../../_lib/record.js';
import { getRecord } from '../../_lib/db.js';
import { keyMatches } from '../../_lib/auth.js';
import { sameOrigin } from '../../_lib/origin.js';

const home = () => new Response(null, {
  status: 303,
  headers: { location: '/incident', 'cache-control': 'no-store' },
});

export async function onRequestPost({ request, params, env }) {
  // backing out of the form lands on the register. there is nothing to go
  // back to -- the record they were filling in does not exist yet
  if (!sameOrigin(request)) return home();

  const id = normalizeId(params.id);
  if (!id) return home();

  let key = null;
  try { key = (await request.formData()).get('key'); } catch {  }

  // a provisional designation hands itself straight back rather than sitting
  // there until the twenty minutes are up. the issued hundred stay put --
  // somebody is holding that card
  if (isSelfRegistered(id)) {
    const rec = await getRecord(env.DB, id);
    if (rec && rec.status === 'UNREGISTERED' && await keyMatches(rec, key)) {
      await env.DB.prepare("DELETE FROM records WHERE id = ? AND status = 'UNREGISTERED'")
        .bind(id).run();
    }
  }

  return home();
}

export const onRequestGet = () => home();
