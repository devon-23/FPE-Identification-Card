import {
  normalizeId, renderUnregistered, renderRecord, renderNotFound,
} from '../_lib/record.js';
import { htmlResponse } from '../_lib/html.js';
import { getRecord } from '../_lib/db.js';

export async function onRequestGet({ request, params, env }) {
  const requested = params.id;
  const id = normalizeId(requested);

  if (!id) {
    const label = String(requested).slice(0, 12).toUpperCase();
    return htmlResponse(renderNotFound(label), { status: 404 });
  }

  // Canonicalise '/f/42' and '/f/FPE-0042' to '/f/0042'.
  if (id !== requested) {
    return Response.redirect(new URL(`/f/${id}`, request.url).toString(), 302);
  }

  const rec = await getRecord(env.DB, id);
  if (!rec) return htmlResponse(renderNotFound(`FPE-${id}`), { status: 404 });

  const markup = rec.status === 'ESCAPED' ? renderRecord(rec) : renderUnregistered(id);
  return htmlResponse(markup, { headers: { 'cache-control': 'no-cache' } });
}
