import {
  normalizeId, renderUnregistered, renderRecord, renderNotFound,
} from '../_lib/record.js';
import { htmlResponse } from '../_lib/html.js';
import { getRecord, getSetting } from '../_lib/db.js';

export async function onRequestGet({ request, params, env }) {
  const requested = params.id;
  const id = normalizeId(requested);

  if (!id) {
    return htmlResponse(renderNotFound(String(requested).slice(0, 12).toUpperCase()), { status: 404 });
  }

  if (id !== requested) {
    return Response.redirect(new URL(`/f/${id}`, request.url).toString(), 302);
  }

  const rec = await getRecord(env.DB, id);
  if (!rec) return htmlResponse(renderNotFound(`FPE-${id}`), { status: 404 });

  if (rec.status === 'ESCAPED') {
    // Where this record sits in the night's filing order.
    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM records WHERE status = 'ESCAPED' AND claimed_at <= ?"
    ).bind(rec.claimed_at || '').first();
    const rank = row && row.n ? row.n : null;
    return htmlResponse(renderRecord(rec, { rank }), { headers: { 'cache-control': 'no-cache' } });
  }

  const claimingOpen = (await getSetting(env.DB, 'claiming_open', '0')) === '1';
  return htmlResponse(renderUnregistered(id, { claimingOpen }), {
    headers: { 'cache-control': 'no-cache' },
  });
}
