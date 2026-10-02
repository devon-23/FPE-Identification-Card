import { normalizeId } from '../_lib/record.js';
import { sameOrigin } from '../_lib/origin.js';

const back = (request, message) => {
  const url = new URL('/admin', request.url);
  if (message) url.searchParams.set('ok', message);
  return new Response(null, { status: 303, headers: { location: url.toString(), 'cache-control': 'no-store' } });
};

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return new Response('Rejected', { status: 403 });

  const form = await request.formData();
  const action = String(form.get('do') || '');

  if (action === 'toggle') {
    const current = await env.DB.prepare("SELECT value FROM settings WHERE key = 'claiming_open'").first();
    const next = current && current.value === '1' ? '0' : '1';
    await env.DB.prepare("UPDATE settings SET value = ? WHERE key = 'claiming_open'").bind(next).run();
    return back(request, next === '1' ? 'CLAIMING OPENED' : 'CLAIMING CLOSED');
  }

  const id = normalizeId(form.get('id'));
  if (!id) return back(request, 'NO SUCH DESIGNATION');

  if (action === 'unphoto') {
    if (env.PHOTOS) { try { await env.PHOTOS.delete(`${id}.jpg`); } catch {  } }
    await env.DB.prepare('UPDATE records SET photo_key = NULL WHERE id = ?').bind(id).run();
    return back(request, `IMAGE REMOVED FROM ${id}`);
  }

  if (action === 'reset') {
    // puts the number back in the pool: old edit token dies, photo goes,
    // and the physical tag starts working again for whoever taps it next
    if (env.PHOTOS) { try { await env.PHOTOS.delete(`${id}.jpg`); } catch {  } }
    await env.DB.prepare(`
      UPDATE records SET status = 'UNREGISTERED', name = NULL, name_assigned = 0,
             faction = 'CITIZEN', handle = NULL, hometown = NULL, bio = NULL, attempts = NULL,
             first_show = NULL, lyric = NULL, bishop = NULL,
             photo_key = NULL, token_hash = NULL,
             claimed_at = NULL, updated_at = NULL, location = NULL, city = NULL, event_date = NULL
       WHERE id = ?
    `).bind(id).run();
    return back(request, `${id} RESET TO UNREGISTERED`);
  }

  return back(request, 'UNKNOWN ACTION');
}
