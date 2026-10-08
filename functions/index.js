import { h, raw, layout, htmlResponse, spread } from './_lib/html.js';
import { SET_SIZE, FORM } from './_lib/config.js';
import { cityMark } from './_lib/glyph.js';
import { getSetting } from './_lib/db.js';

// the front door, and the link that gets posted. laid out like the physical
// letters: one word down the middle, a narrow column of small print under it
// and nothing in a box
export async function onRequestGet({ env }) {
  const open = (await getSetting(env.DB, 'claiming_open', '0')) === '1';

  // the same line twice. held.js shows the form to anybody with nothing on
  // file, so one tap puts them straight into the card, and leaves the link up
  // for anybody who already has a record -- that page lists what they have
  // instead of quietly filing them a second time. no script, no form: the
  // extra tap is the safe way round
  const door = 'MAKE YOUR IDENTIFICATION CARD';

  const body = h`  <main class="stage doc gate">
    <p class="doc__letterhead spread" data-plain="${FORM.letterhead}">${raw(spread(FORM.letterhead))}</p>
    <div class="doc__seal">${raw(cityMark(0, { allLit: true }))}</div>

    <h1 class="gate__word">IDENTIFY</h1>

    <p class="gate__small">IDENTIFICATION IS ISSUED AT THIS TERMINAL UNDER FORM ${FORM.code}.
      THE ${String(SET_SIZE)} NUMBERED CARDS WERE PUT INTO HANDS ON THE NIGHT AND ARE
      ACCOUNTED FOR SEPARATELY; EVERY OTHER SUBJECT IS ENTERED UNDER A PROVISIONAL
      DESIGNATION. RECORDS ARE PUBLIC AND PERMANENT, AND ARE AMENDED OR WITHDRAWN ON
      REQUEST OF THE SUBJECT.</p>

    <section class="gate__call">
      <p>SUBJECTS REACHING THIS TERMINAL ARE TO BE ENTERED INTO THE REGISTER BEFORE
        DEPARTURE. STATE A NAME, OR DECLINE AND HAVE ONE ASSIGNED. NO SUBJECT LEAVES
        THE PERIMETER UNRECORDED.</p>

      ${raw(open ? h`<form method="POST" action="/turn-yourself-in" data-gate-new hidden>
        <input type="hidden" name="seq" value="0" data-seq>
        <button class="gate__way" type="submit">${door}</button>
      </form>` : '')}

      <a class="gate__way" href="/turn-yourself-in" data-gate-held>${door}</a>
    </section>

    <section class="gate__call">
      <p>SUBJECTS ALREADY ON FILE MAY CONSULT THE SURVEY OF ORIGINS, IN WHICH MASS
        SIGHTINGS ARE RECORDED AND THE DRAG PATHS LEADING OUT OF THEM ARE PLOTTED
        AGAINST THE NIGHT IN QUESTION.</p>

      <a class="gate__way" href="/from-here">BANDITO SIGHTINGS</a>
    </section>

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
  }), { headers: { 'cache-control': 'public, max-age=30' } });
}
