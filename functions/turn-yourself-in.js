import { h, raw, layout, htmlResponse, spread } from './_lib/html.js';
import { FORM, SET_SIZE, EVENT } from './_lib/config.js';
import { cityMark } from './_lib/glyph.js';
import { newToken, hashToken } from './_lib/auth.js';
import { getSetting } from './_lib/db.js';
import { sameOrigin } from './_lib/origin.js';
import { ipHash } from './_lib/session.js';
import { cleanHometown } from './_lib/sanitize.js';
import { banditoName, assignedFaction } from './_lib/lore.js';
import { heldBlock } from './_lib/held.js';
import { lookup } from './_lib/geo.js';

// no card, no key, so this is the one form anybody can reach. cap it per address or one bored person can fill the register with nothing
const MAX_PER_WINDOW = 3;
const WINDOW_SECONDS = 60 * 60;

// X is somebody's first record, Y their second, Z their third. 
const LETTERS = ['X', 'Y', 'Z'];
// a hundred thousand apart, so each letter holds 99,999 designations. they used to be a thousand apart and the register jammed at the 999th person
const BLOCK = 100000;
const blockBase = (i) => BLOCK * (i + 1);
const blockTop = (i) => blockBase(i) + BLOCK - 1;

const ABANDONED_SECONDS = 20 * 60; // how long it sits unregistered

function page(message, open = true) {
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

    ${raw(open ? String(heldBlock({ anyway: 'FILE A SEPARATE ONE ANYWAY' })) + `

    <div class="surrender" data-held-hide>
      <form method="POST" action="/turn-yourself-in">
        <input type="hidden" name="seq" value="0" data-seq>
        <button class="button button--primary button--flash" type="submit">TURN YOURSELF IN</button>
      </form>

      <p class="note">THIS ISSUES A PROVISIONAL DESIGNATION AND TAKES YOU STRAIGHT TO THE FORM.
        NOTHING IS RECORDED UNTIL YOU SUBMIT IT.</p>
    </div>` : `<p class="shut">THE REGISTER IS CLOSED.<br>
      NO DESIGNATIONS ARE BEING ISSUED AT THIS TIME.</p>`)}

  </main>
  <script src="/held.js" defer></script>`;
  return layout({ title: 'VOLUNTARY SURRENDER — DEMA ARCHIVES', body, bodyClass: 'page-surrender' });
}

export async function onRequestGet({ env }) {
  // no point flashing a button at somebody that is going to say no
  const open = (await getSetting(env.DB, 'claiming_open', '0')) === '1';
  return htmlResponse(page(null, open), { headers: { 'cache-control': 'public, max-age=60' } });
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return htmlResponse(page('REJECTED.'), { status: 403 });

  // either plot posts a town here. everything else posts an empty form
  let hometown = '';
  let attending = 0;
  let back = '/map';
  // how many records this browser is already carrying.
  let seq = 0;
  try {
    const form = await request.formData();
    hometown = cleanHometown(form.get('hometown'));
    attending = form.get('attending') === '1' ? 1 : 0;
    const said = parseInt(String(form.get('seq') || '0'), 10);
    seq = Number.isFinite(said) && said > 0 ? Math.min(said, 9) : 0;
    // whichever plot they were looking at. an allowlist, not the raw value -- a redirect that takes its target off a form is an open redirect
    if (form.get('back') === '/from-here') back = '/from-here';
  } catch {  } // idk what to catch

  if ((await getSetting(env.DB, 'claiming_open', '0')) !== '1') { // i think this'll just stay on 
    return htmlResponse(page(null, false), { status: 403 });
  }

  // same table the admin login throttle uses, prefixed so the two cannot tread on each other. switchable from /admin, because the cap is useless
  const throttle = (await getSetting(env.DB, 'surrender_throttle', '1')) === '1';
  const secret = env.SESSION_SECRET || 'fpe';
  const bucket = 'sr:' + (await ipHash(request, secret)).slice(0, 24);
  const now = Math.floor(Date.now() / 1000);
  const row = throttle
    ? await env.DB.prepare('SELECT n, first FROM login_attempts WHERE ip_hash = ?').bind(bucket).first()
    : null;

  if (row && row.n >= MAX_PER_WINDOW && now - row.first < WINDOW_SECONDS) {
    return htmlResponse(page('TOO MANY SURRENDERS FROM THIS TERMINAL. TRY AGAIN LATER.'), { status: 429 });
  }

  if (seq >= LETTERS.length) {
    return htmlResponse(page(`THIS TERMINAL HAS FILED ${String(LETTERS.length)} TIMES. THAT IS THE LIMIT. AMEND OR WITHDRAW ONE OF THEM INSTEAD.`), { status: 429 });
  }

  const key = newToken().slice(0, 8).toUpperCase();
  const hash = await hashToken(key);
  const stamp = new Date().toISOString();

  // their own block first, then whatever is left. the letter is meant to say
  // how many times this device has filed, but a thousand people turning up is
  // a much better problem than a register that stops taking anybody
  const blocks = [seq];
  for (let i = 0; i < LETTERS.length; i++) if (i !== seq) blocks.push(i);

  let which = seq;
  let base = blockBase(which);
  let top = blockTop(which);
  const label = (n, i) => `${LETTERS[i]}${String(n - blockBase(i)).padStart(3, '0')}`;

  let id = null;

  // somebody who opened the form and hit cancel left a designation sitting  unregistered. give it to the next person rather than burning it. the
  if (!hometown) {
    const cutoff = new Date(Date.now() - ABANDONED_SECONDS * 1000).toISOString();
    const reused = await env.DB.prepare(`
      UPDATE records SET claim_key_hash = ?, updated_at = ?
       WHERE id = (SELECT id FROM records
                    WHERE n > ? AND n <= ? AND status = 'UNREGISTERED'
                      AND (updated_at IS NULL OR updated_at < ?)
                    ORDER BY n LIMIT 1)
      RETURNING id
    `).bind(hash, stamp, base, top, cutoff).first();
    if (reused) id = reused.id;
  }

  // the unique index on n is what settles a tie, so retry rather than lock
  for (let b = 0; b < blocks.length && !id; b++) {
    which = blocks[b];
    base = blockBase(which);
    top = blockTop(which);

    for (let attempt = 0; attempt < 5 && !id; attempt++) {
      const highest = await env.DB
        .prepare('SELECT MAX(n) AS top FROM records WHERE n > ? AND n <= ?')
        .bind(base, top).first();
      const next = ((highest && highest.top) || base) + 1;
      if (next > top) break;              // that block is full, try the next one
      try {
        await env.DB.prepare(
          "INSERT INTO records (id, n, status, claim_key_hash, updated_at) VALUES (?, ?, 'UNREGISTERED', ?, ?)"
        ).bind(label(next, which), next, hash, stamp).run();
        id = label(next, which);
      } catch {
        // somebody else took that number between the read and the write and idk what to do with that soooo
      }
    }
  }

  if (!id) return htmlResponse(page('COULD NOT ISSUE A DESIGNATION. TRY AGAIN.'), { status: 503 });

  if (throttle) {
    const fresh = !row || now - row.first >= WINDOW_SECONDS;
    await env.DB.prepare(`
      INSERT INTO login_attempts (ip_hash, n, first) VALUES (?, 1, ?)
      ON CONFLICT(ip_hash) DO UPDATE SET
        n = CASE WHEN ? THEN 1 ELSE n + 1 END,
        first = CASE WHEN ? THEN ? ELSE first END
    `).bind(bucket, now, fresh ? 1 : 0, fresh ? 1 : 0, now).run();
  }

  // came in from the map
  if (hometown) {
    const token = newToken();
    await env.DB.prepare(`
      UPDATE records
         SET status = 'ESCAPED', name = ?, name_assigned = 1, faction = ?,
             hometown = ?, attending = ?, token_hash = ?, claimed_at = ?, updated_at = ?,
             location = ?, city = ?, event_date = ?
       WHERE id = ?
    `).bind(banditoName(id), assignedFaction(id), hometown, attending, await hashToken(token), stamp, stamp, EVENT.venue, EVENT.city, EVENT.date, id).run();

    // awaited, not deferred
    if (attending) await lookup(env.DB, hometown);

    // straight back to the plot with nothing said
    return new Response(null, {
      status: 303,
      headers: { 
        location: `${back}?new=${id}#t=${id}.${token}`, 
        'cache-control': 'no-store' 
      },
    });
  }

  return new Response(null, {
    status: 303,
    headers: { 
      location: `/f/${id}/register?k=${key}`, 
      'cache-control': 'no-store' 
    },
  });
}
