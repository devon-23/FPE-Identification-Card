import { h, raw, layout, htmlResponse, spread } from './_lib/html.js';
import { FORM, SET_SIZE, EVENT } from './_lib/config.js';
import { cityMark } from './_lib/glyph.js';
import { newToken, hashToken } from './_lib/auth.js';
import { getSetting } from './_lib/db.js';
import { sameOrigin } from './_lib/origin.js';
import { ipHash } from './_lib/session.js';
import { cleanHometown } from './_lib/sanitize.js';
import { banditoName } from './_lib/lore.js';
import { lookup } from './_lib/geo.js';

// no card, no key, so this is the one form anybody can reach. cap it per
// address or one bored person can fill the register with nothing
const MAX_PER_WINDOW = 3;
const WINDOW_SECONDS = 60 * 60;

// X001.. is the full form, Y0001.. is the origin-only one off the map.
// separate blocks of n so neither can wander into the other
const X_BASE = 1000;
const X_TOP = 1999;
const Y_BASE = 2000;
const Y_TOP = 2999;

// how long a designation sits unregistered before it is handed to the next
// person. somebody who opens the form and backs out should not burn a number
const ABANDONED_SECONDS = 20 * 60;

function page(message) {
  const body = h`  <main class="stage doc">
    <p class="doc__letterhead spread" data-plain="${FORM.letterhead}">${raw(spread(FORM.letterhead))}</p>
    <div class="doc__seal">${raw(cityMark(0, { allLit: true }))}</div>

    <h1 class="doc__title">VOLUNTARY SURRENDER</h1>
    <p class="doc__date">FORM ${FORM.code}-B</p>

    <p class="doc__report">The ${String(SET_SIZE)} numbered cards were issued by hand and
      are accounted for separately. A subject holding no card may still be entered into
      the register, under a provisional designation, by submitting this form. Provisional
      records carry no number of their own and are filed as UNIDENTIFIED PERSONNEL.</p>

    ${raw(message ? h`<p class="form__status">${message}</p>` : '')}

    <form method="POST" action="/turn-yourself-in">
      <button class="button button--primary button--flash" type="submit">TURN YOURSELF IN</button>
    </form>

    <p class="note">THIS ISSUES A PROVISIONAL DESIGNATION AND TAKES YOU STRAIGHT TO THE FORM.
      NOTHING IS RECORDED UNTIL YOU SUBMIT IT.</p>

  </main>`;
  return layout({ title: 'VOLUNTARY SURRENDER — DEMA ARCHIVES', body, bodyClass: 'page-surrender' });
}

export function onRequestGet() {
  return htmlResponse(page(null), { headers: { 'cache-control': 'public, max-age=60' } });
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return htmlResponse(page('REJECTED.'), { status: 403 });

  // the map posts a town here. everything else posts an empty form
  let hometown = '';
  try { hometown = cleanHometown((await request.formData()).get('hometown')); }
  catch {  }

  if ((await getSetting(env.DB, 'claiming_open', '0')) !== '1') {
    return htmlResponse(page('THE ARCHIVE IS NOT ACCEPTING SUBMISSIONS AT THIS TIME.'), { status: 403 });
  }

  // same table the admin login throttle uses, prefixed so the two cannot
  // tread on each other
  const secret = env.SESSION_SECRET || 'fpe';
  const bucket = 'sr:' + (await ipHash(request, secret)).slice(0, 24);
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare('SELECT n, first FROM login_attempts WHERE ip_hash = ?')
    .bind(bucket).first();

  if (row && row.n >= MAX_PER_WINDOW && now - row.first < WINDOW_SECONDS) {
    return htmlResponse(page('TOO MANY SURRENDERS FROM THIS TERMINAL. TRY AGAIN LATER.'), { status: 429 });
  }

  const key = newToken().slice(0, 8).toUpperCase();
  const hash = await hashToken(key);
  const stamp = new Date().toISOString();

  // the origin-only form lands claimed straight away, so it never leaves a
  // half-filled row behind and gets its own block of numbers
  const base = hometown ? Y_BASE : X_BASE;
  const top = hometown ? Y_TOP : X_TOP;
  const label = (n) => (hometown
    ? `Y${String(n - Y_BASE).padStart(4, '0')}`
    : `X${String(n - X_BASE).padStart(3, '0')}`);

  let id = null;

  // somebody who opened the form and hit cancel left a designation sitting
  // unregistered. give it to the next person rather than burning it. the
  // subselect and the write are one statement, so two people cannot both win
  if (!hometown) {
    const cutoff = new Date(Date.now() - ABANDONED_SECONDS * 1000).toISOString();
    const reused = await env.DB.prepare(`
      UPDATE records SET claim_key_hash = ?, updated_at = ?
       WHERE id = (SELECT id FROM records
                    WHERE n > ? AND n <= ? AND status = 'UNREGISTERED'
                      AND (updated_at IS NULL OR updated_at < ?)
                    ORDER BY n LIMIT 1)
      RETURNING id
    `).bind(hash, stamp, X_BASE, X_TOP, cutoff).first();
    if (reused) id = reused.id;
  }

  // the unique index on n is what settles a tie, so retry rather than lock
  for (let attempt = 0; attempt < 5 && !id; attempt++) {
    const highest = await env.DB
      .prepare('SELECT MAX(n) AS top FROM records WHERE n > ? AND n <= ?')
      .bind(base, top).first();
    const next = ((highest && highest.top) || base) + 1;
    if (next > top) return htmlResponse(page('THE PROVISIONAL REGISTER IS FULL.'), { status: 503 });
    try {
      await env.DB.prepare(
        "INSERT INTO records (id, n, status, claim_key_hash, updated_at) VALUES (?, ?, 'UNREGISTERED', ?, ?)"
      ).bind(label(next), next, hash, stamp).run();
      id = label(next);
    } catch {
      // somebody else took that number between the read and the write
    }
  }

  if (!id) return htmlResponse(page('COULD NOT ISSUE A DESIGNATION. TRY AGAIN.'), { status: 503 });

  const fresh = !row || now - row.first >= WINDOW_SECONDS;
  await env.DB.prepare(`
    INSERT INTO login_attempts (ip_hash, n, first) VALUES (?, 1, ?)
    ON CONFLICT(ip_hash) DO UPDATE SET
      n = CASE WHEN ? THEN 1 ELSE n + 1 END,
      first = CASE WHEN ? THEN ? ELSE first END
  `).bind(bucket, now, fresh ? 1 : 0, fresh ? 1 : 0, now).run();

  // came in from the map, so there is nothing else to ask for. fill the
  // record in here instead of handing them a form they already turned down
  if (hometown) {
    const token = newToken();
    await env.DB.prepare(`
      UPDATE records
         SET status = 'ESCAPED', name = ?, name_assigned = 1, faction = 'BANDITO',
             hometown = ?, token_hash = ?, claimed_at = ?, updated_at = ?,
             location = ?, city = ?, event_date = ?
       WHERE id = ?
    `).bind(banditoName(id), hometown, await hashToken(token), stamp, stamp,
            EVENT.venue, EVENT.city, EVENT.date, id).run();

    // awaited, not deferred: the whole point of this form is the pin, so it
    // is worth the second. a town already in `places` costs nothing
    await lookup(env.DB, hometown);

    // back to the map so they watch themselves appear. the edit token rides
    // in the fragment, which browsers keep to themselves
    return new Response(null, {
      status: 303,
      headers: { location: `/map?new=${id}#t=${token}`, 'cache-control': 'no-store' },
    });
  }

  return new Response(null, {
    status: 303,
    headers: { location: `/f/${id}/register?k=${key}`, 'cache-control': 'no-store' },
  });
}
