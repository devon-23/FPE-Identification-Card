import { sameOrigin } from '../_lib/origin.js';
import { SET_SIZE } from '../_lib/config.js';
import { lookup } from '../_lib/geo.js';
import { getSetting } from '../_lib/db.js';

const back = (request, message) => {
  const url = new URL('/admin', request.url);
  if (message) url.searchParams.set('ok', message);
  return new Response(null, { status: 303, headers: { location: url.toString(), 'cache-control': 'no-store' } });
};

// every column a claim writes. shared so reset and release cannot drift
const BLANK = `status = 'UNREGISTERED', name = NULL, name_assigned = 0,
       faction = 'CITIZEN', handle = NULL, hometown = NULL, bio = NULL, attempts = NULL,
       first_show = NULL, lyric = NULL, bishop = NULL,
       photo_key = NULL, token_hash = NULL,
       claimed_at = NULL, updated_at = NULL, location = NULL, city = NULL, event_date = NULL`;

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

  // after testing, every tag is locked to the phone that tested it. this
  // hands all hundred back. the X/Y/Z rows are real people, they stay
  if (action === 'release') {
    if (String(form.get('confirm') || '').trim().toUpperCase() !== 'RELEASE') {
      return back(request, 'TYPE RELEASE TO CONFIRM');
    }

    const { results } = await env.DB
      .prepare("SELECT id, photo_key FROM records WHERE n <= ? AND status = 'ESCAPED'")
      .bind(SET_SIZE).all();
    const hit = results || [];

    const shots = hit.filter((r) => r.photo_key).map((r) => `${r.id}.jpg`);
    if (env.PHOTOS && shots.length) { try { await env.PHOTOS.delete(shots); } catch {  } }

    await env.DB.prepare(`UPDATE records SET ${BLANK} WHERE n <= ? AND status = 'ESCAPED'`)
      .bind(SET_SIZE).run();

    return back(request, `${hit.length} CARD${hit.length === 1 ? '' : 'S'} RELEASED`);
  }

  // towns nominatim never answered for. ten at a time, a second apart --
  // it is somebody else's free service
  if (action === 'pins') {
    const { results } = await env.DB.prepare(`
      SELECT DISTINCT UPPER(TRIM(r.hometown)) AS q
        FROM records r
        LEFT JOIN places p ON p.q = UPPER(TRIM(r.hometown))
       WHERE r.status = 'ESCAPED' AND r.attending = 1
         AND r.hometown IS NOT NULL AND TRIM(r.hometown) <> ''
         AND (p.q IS NULL OR p.lat IS NULL)
       LIMIT 10
    `).all();

    const todo = (results || []).map((r) => r.q).filter(Boolean);
    if (!todo.length) return back(request, 'EVERY TOWN IS LOOKED UP');

    let found = 0;
    for (let i = 0; i < todo.length; i++) {
      if (i) await new Promise((r) => setTimeout(r, 1000));
      // clear the old blank first, or lookup just reads it back
      try { await env.DB.prepare('DELETE FROM places WHERE q = ? AND lat IS NULL').bind(todo[i]).run(); } catch {  }
      try { if (await lookup(env.DB, todo[i])) found++; } catch {  }
    }

    return back(request, `${found} OF ${todo.length} PLACED \u2014 RUN IT AGAIN FOR MORE`);
  }

  // the short list on the register. stored as a settings string so there is
  // no migration to run, and a designation that does not exist is simply
  // skipped when the page renders
  if (action === 'notable') {
    const list = String(await getSetting(env.DB, 'notable', ''))
      .split(',').map((x) => x.trim().toUpperCase()).filter(Boolean);

    const who = String(form.get('who') || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{1,12}$/.test(who)) return back(request, 'NO SUCH DESIGNATION');

    const drop = String(form.get('drop') || '') === '1';
    let next;
    if (drop) {
      next = list.filter((x) => x !== who);
      if (next.length === list.length) return back(request, `${who} WAS NOT ON THE LIST`);
    } else {
      const rec = await env.DB.prepare("SELECT id FROM records WHERE id = ? AND status = 'ESCAPED'")
        .bind(who).first();
      if (!rec) return back(request, `${who} HAS NO FILED RECORD`);
      if (list.includes(who)) return back(request, `${who} IS ALREADY ON THE LIST`);
      next = list.concat(who).slice(0, 24);
    }

    await env.DB.prepare(
      "INSERT INTO settings (key, value) VALUES ('notable', ?) ON CONFLICT(key) DO UPDATE SET value = ?"
    ).bind(next.join(','), next.join(',')).run();
    return back(request, drop ? `${who} REMOVED` : `${who} ADDED`);
  }

  // move a provisional record onto one of the hundred, the way the subject
  // would have from their own phone. plenty of people took a tag at the show
  // and never did it themselves, and only i can do it for them now -- their
  // edit token lives in their browser, not here.
  //
  // the new token is thrown away deliberately: whoever holds the card can
  // claim an edit token by tapping it, and the old browser keeps pointing at
  // a designation that no longer exists
  if (action === 'move') {
    const from = String(form.get('from') || '').trim().toUpperCase();
    const onto = String(form.get('onto') || '').trim().toUpperCase();

    if (!/^[XYZ][0-9]{3,5}$/.test(from)) return back(request, 'SOURCE MUST BE AN X, Y OR Z');
    if (!/^[0-9]{4}$/.test(onto)) return back(request, 'TARGET MUST BE A NUMBERED CARD');

    const source = await env.DB.prepare("SELECT * FROM records WHERE id = ? AND status = 'ESCAPED'")
      .bind(from).first();
    if (!source) return back(request, `${from} HAS NO FILED RECORD`);

    const target = await env.DB.prepare('SELECT id, n, status FROM records WHERE id = ?')
      .bind(onto).first();
    if (!target) return back(request, `${onto} DOES NOT EXIST`);
    if (target.n > SET_SIZE) return back(request, `${onto} IS NOT ONE OF THE HUNDRED`);
    if (target.status === 'ESCAPED') return back(request, `${onto} IS ALREADY CLAIMED — RESET IT FIRST`);

    let photoKey = null;
    if (source.photo_key && env.PHOTOS) {
      try {
        const obj = await env.PHOTOS.get(source.photo_key);
        if (obj) {
          await env.PHOTOS.put(`${onto}.jpg`, obj.body, { httpMetadata: { contentType: 'image/jpeg' } });
          photoKey = `${onto}.jpg`;
        }
      } catch {  }
    }

    const now = new Date().toISOString();
    const res = await env.DB.prepare(`
      UPDATE records
         SET status = 'ESCAPED', name = ?, name_assigned = ?, faction = ?,
             handle = ?, hometown = ?, bio = ?, attempts = ?, first_show = ?, lyric = ?, bishop = ?,
             attending = ?, photo_key = ?, token_hash = NULL, claimed_at = ?, updated_at = ?
       WHERE id = ? AND status = 'UNREGISTERED'
    `).bind(
      source.name, source.name_assigned, source.faction,
      source.handle, source.hometown, source.bio, source.attempts, source.first_show,
      source.lyric, source.bishop, source.attending, photoKey,
      source.claimed_at || now, now, onto
    ).run();

    if (!res.meta || res.meta.changes !== 1) {
      if (photoKey && env.PHOTOS) { try { await env.PHOTOS.delete(photoKey); } catch {  } }
      return back(request, `${onto} WAS CLAIMED WHILE THAT RAN`);
    }

    if (source.photo_key && env.PHOTOS) { try { await env.PHOTOS.delete(source.photo_key); } catch {  } }
    await env.DB.prepare('DELETE FROM records WHERE id = ?').bind(from).run();

    return back(request, `${from} MOVED ONTO ${onto}`);
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
    await env.DB.prepare(`UPDATE records SET ${BLANK} WHERE id = ?`).bind(id).run();
    return back(request, `${id} RESET TO UNREGISTERED`);
  }

  return back(request, 'UNKNOWN ACTION');
}
