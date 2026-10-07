import { h, raw, layout, htmlResponse, spread } from './_lib/html.js';
import { SET_SIZE, FORM, EVENT, demaDate } from './_lib/config.js';
import { cityMark } from './_lib/glyph.js';
import { getSetting } from './_lib/db.js';

// the front door, and the link that gets posted. the incident report and the
// whole set of cards moved to /incident -- this is just the way in
export async function onRequestGet({ env }) {
  const row = await env.DB
    .prepare("SELECT count(*) AS n FROM records WHERE status = 'ESCAPED'")
    .first();
  const filed = (row && row.n) || 0;
  const open = (await getSetting(env.DB, 'claiming_open', '0')) === '1';

  // the same door twice. held.js shows the form to anybody with nothing on
  // file, so one tap puts them straight into the card, and leaves the link
  // up for anybody who already has a record -- that page lists what they
  // have instead of quietly filing them a second time. no script, no form:
  // the extra tap is the safe way round
  const door = h`<b>MAKE YOUR IDENTIFICATION CARD</b>
      <span>NAME, ALLEGIANCE, BISHOP, PHOTOGRAPH. YOURS TO KEEP AND TO SAVE.</span>`;

  const body = h`  <main class="stage doc gate">
    <p class="doc__letterhead spread" data-plain="${FORM.letterhead}">${raw(spread(FORM.letterhead))}</p>
    <div class="doc__seal">${raw(cityMark(0, { allLit: true }))}</div>

    <h1 class="doc__title">SUBJECT INTAKE<br>&mdash; FORM ${FORM.code} &mdash;</h1>
    <p class="doc__date">${demaDate(`${EVENT.date}T00:00:00Z`)}</p>

    <p class="doc__report">Every inhabitant leaving the perimeter is to be entered into
      the register before departure. State a name, or decline and have one assigned.
      State an origin, or have the file note that you would not. The ${String(SET_SIZE)}
      numbered cards were issued by hand on the night; anyone else is entered under a
      provisional designation. Records are public and permanent, and are amended or
      withdrawn on request.</p>

    ${raw(open ? h`<form method="POST" action="/turn-yourself-in" data-gate-new hidden>
      <input type="hidden" name="seq" value="0" data-seq>
      <button class="gate__door" type="submit">${raw(String(door))}</button>
    </form>` : '')}

    <a class="gate__door" href="/turn-yourself-in" data-gate-held>${raw(String(door))}</a>

    <a class="gate__door" href="/from-here">
      <b>BANDITO SIGHTINGS</b>
      <span>EVERY ORIGIN ON FILE, AND THE ONE PLACE THEY ALL ENDED UP.</span>
    </a>

    <p class="doc__count"><b>${String(filed)}</b> SUBJECT${raw(filed === 1 ? '' : 'S')} ON FILE</p>

    <a class="sighting" href="/incident">INCIDENT REPORT ${FORM.statute} &mdash;&mdash;&mdash;&gt;</a>

    <aside class="restricted">
      <img class="restricted__img" src="/images/restricted.webp"
           alt="RESTRICTED CONTENT. VIOLATION CODE ${FORM.violation}." width="1027" height="167">
      <p class="restricted__foot spread" data-plain="${FORM.benediction}">${raw(spread(FORM.benediction))}</p>
    </aside>
  </main>
  <script src="/held.js" defer></script>`;

  return htmlResponse(layout({
    title: `DMAORG — SUBJECT INTAKE ${FORM.code}`,
    body,
    bodyClass: 'page-gate',
    back: false,
  }), { headers: { 'cache-control': 'public, max-age=30' } });
}
