import { normalizeId, isSelfRegistered } from '../../_lib/record.js';
import { ownsRecord } from '../../_lib/auth.js';
import { getRecord } from '../../_lib/db.js';
import { sameOrigin } from '../../_lib/origin.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

// withdraw a record you filed yourself. only the made-on-demand ones -- an
// issued card belongs to a number somebody is carrying, and taking that out
// of the table would strand the tag. those go through /admin
export async function onRequestPost({ request, params, env }) {
  const id = normalizeId(params.id);
  if (!id) return json({ error: 'NO SUCH RECORD' }, 404);

  if (!sameOrigin(request)) return json({ error: 'REJECTED' }, 403);
  if (!isSelfRegistered(id)) return json({ error: 'THAT RECORD CANNOT BE WITHDRAWN HERE' }, 403);

  let form;
  try { form = await request.formData(); }
  catch { return json({ error: 'MALFORMED SUBMISSION' }, 400); }

  const rec = await getRecord(env.DB, id);
  if (!rec) return json({ ok: true, gone: true });

  if (!(await ownsRecord(rec, form.get('token')))) {
    return json({ error: 'THIS DEVICE DOES NOT HOLD THAT RECORD.' }, 403);
  }

  if (rec.photo_key && env.PHOTOS) {
    try { await env.PHOTOS.delete(rec.photo_key); } catch {  }
  }
  await env.DB.prepare('DELETE FROM records WHERE id = ?').bind(id).run();

  return json({ ok: true, gone: true });
}
