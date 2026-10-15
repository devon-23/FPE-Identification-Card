import { h, raw, layout, htmlResponse, spread } from './_lib/html.js';
import { FORM } from './_lib/config.js';
import { cityMark } from './_lib/glyph.js';

// everything anybody wrote in A LINE THAT MEANS SOMETHING, seven on screen
// at a time, swapping themselves out. a pool comes down with the page so
// the cycling costs nothing after the first load

const SLOTS = 7;
const POOL = 180;

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(`
    SELECT id, lyric FROM records
     WHERE status = 'ESCAPED' AND lyric IS NOT NULL AND TRIM(lyric) <> ''
     ORDER BY RANDOM() LIMIT ?
  `).bind(POOL).all();

  const pool = (results || []).map((r) => ({ id: r.id, t: r.lyric }));

  const total = await env.DB.prepare(`
    SELECT count(*) AS n FROM records
     WHERE status = 'ESCAPED' AND lyric IS NOT NULL AND TRIM(lyric) <> ''
  `).first();

  // the first seven are in the markup, so there is something to read before
  // the script runs and something for a crawler to find
  const first = pool.slice(0, SLOTS).map((l) => h`<li class="lines__line">
      <a href="/f/${l.id}">${l.t}</a>
    </li>`).join('');

  const body = h`  <main class="stage doc lines">
    <p class="doc__letterhead spread">${raw(spread(FORM.letterhead))}</p>
    <div class="doc__seal"><a href="/incident" aria-label="Incident report">${raw(cityMark(0, { allLit: true }))}</a></div>

    <h1 class="doc__title">LINES ON FILE</h1>
    <p class="doc__aside">${String((total && total.n) || 0)} subjects wrote something down.
      These are theirs. Tap one to read the record it came from.</p>

    <ul class="lines__list" data-lines>${raw(first)}</ul>

    <p class="lines__more">
      <button class="button" type="button" data-shuffle>SHUFFLE</button>
    </p>

    <!-- nothing under the lines. the colophon still gets you out
    <p class="fh__links" style="margin-top:1.5rem">
      <a href="/stats">STATS FOR NERDS</a>
      <a href="/incident">THE REGISTER</a>
    </p>
    -->
  </main>
  <script id="pool" type="application/json">${raw(JSON.stringify(pool))}</script>
  <script src="/lines.js" defer></script>`;

  return htmlResponse(layout({
    title: 'LINES ON FILE — DEMA ARCHIVES',
    body,
    bodyClass: 'page-lines',
    social: {
      title: 'LINES ON FILE',
      description: 'Everything people wrote on their identification cards.',
    },
  }), { headers: { 'cache-control': 'no-store' } });
}
