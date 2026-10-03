import { sameOrigin } from '../_lib/origin.js';
import { SET_SIZE } from '../_lib/config.js';

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

  // the three-an-hour cap on /turn-yourself-in. fine at the venue, maddening
  // when you are the one testing it
  if (action === 'throttle') {
    const current = await env.DB.prepare("SELECT value FROM settings WHERE key = 'surrender_throttle'").first();
    const next = current && current.value === '0' ? '1' : '0';
    await env.DB.prepare(
      "INSERT INTO settings (key, value) VALUES ('surrender_throttle', ?) ON CONFLICT(key) DO UPDATE SET value = ?"
    ).bind(next, next).run();
    if (next === '0') await env.DB.prepare("DELETE FROM login_attempts WHERE ip_hash LIKE 'sr:%'").run();
    return back(request, next === '1' ? 'SURRENDER LIMIT ON' : 'SURRENDER LIMIT OFF');
  }

  // matched against the table rather than parsed, so a row left behind by an
  // older numbering scheme is still something you can get rid of
  const typed = String(form.get('id') || '').trim().toUpperCase();
  const rec = /^[A-Z0-9]{1,12}$/.test(typed)
    ? await env.DB.prepare('SELECT id, n FROM records WHERE id = ?').bind(typed).first()
    : null;
  if (!rec) return back(request, 'NO SUCH DESIGNATION');
  const id = rec.id;

  if (action === 'drop') {
    // only the ones nobody is holding a card for
    if (rec.n <= SET_SIZE) return back(request, `${id} IS AN ISSUED CARD — RESET IT INSTEAD`);
    if (env.PHOTOS) { try { await env.PHOTOS.delete(`${id}.jpg`); } catch {  } }
    await env.DB.prepare('DELETE FROM records WHERE id = ?').bind(id).run();
    return back(request, `${id} DELETED`);
  }

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
