import { h, raw, layout, htmlResponse, spread } from './_lib/html.js';
import { FORM, SET_SIZE, EVENT } from './_lib/config.js';
import { cityMark } from './_lib/glyph.js';
import { newToken, hashToken } from './_lib/auth.js';
import { getSetting } from './_lib/db.js';
import { sameOrigin } from './_lib/origin.js';
import { ipHash } from './_lib/session.js';
import { cleanHometown } from './_lib/sanitize.js';
import { lookup } from './_lib/geo.js';

// no card, no key, so this is the one form anybody can reach. cap it per
// address or one bored person can fill the register with nothing
const MAX_PER_WINDOW = 3;
const WINDOW_SECONDS = 60 * 60;

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

export async function onRequestPost({ request, env, waitUntil }) {
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

  // n >= 1001 keeps provisional records clear of the hundred issued cards.
  // the unique index on n is what settles a tie, so retry rather than lock
  let id = null;
  for (let attempt = 0; attempt < 5 && !id; attempt++) {
    const top = await env.DB.prepare('SELECT MAX(n) AS top FROM records WHERE n > 1000').first();
    const next = ((top && top.top) || 1000) + 1;
    if (next > 1999) return htmlResponse(page('THE PROVISIONAL REGISTER IS FULL.'), { status: 503 });
    const candidate = `X${String(next - 1000).padStart(3, '0')}`;
    try {
      await env.DB.prepare(
        "INSERT INTO records (id, n, status, claim_key_hash) VALUES (?, ?, 'UNREGISTERED', ?)"
      ).bind(candidate, next, hash).run();
      id = candidate;
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
    const stamp = new Date().toISOString();
    await env.DB.prepare(`
      UPDATE records
         SET status = 'ESCAPED', name_assigned = 1, hometown = ?, token_hash = ?,
             claimed_at = ?, updated_at = ?, location = ?, city = ?, event_date = ?
       WHERE id = ?
    `).bind(hometown, await hashToken(token), stamp, stamp,
            EVENT.venue, EVENT.city, EVENT.date, id).run();

    if (waitUntil) waitUntil(lookup(env.DB, hometown));

    // the edit token rides in the fragment, which browsers keep to themselves
    return new Response(null, {
      status: 303,
      headers: { location: `/f/${id}#t=${token}`, 'cache-control': 'no-store' },
    });
  }

  return new Response(null, {
    status: 303,
    headers: { location: `/f/${id}/register?k=${key}`, 'cache-control': 'no-store' },
  });
}
