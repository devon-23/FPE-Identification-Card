import { h, raw, layout, htmlResponse, spread } from './_lib/html.js';
import { FORM } from './_lib/config.js';
import { cityMark } from './_lib/glyph.js';

// everything anybody wrote in A LINE THAT MEANS SOMETHING, seven on screen
// at a time, swapping themselves out. a pool comes down with the page so
// the cycling costs nothing after the first load

const SLOTS = 7;
const POOL = 180;

export async function onRequestGet({ env }) {
  // this was ORDER BY RANDOM() plus a COUNT, and both read every row in the
  // table -- two full scans on a page with no caching at all. it takes a
  // random window off the index instead. a contiguous slice rather than a
  // true shuffle, which on a wall of lines nobody can tell apart.
  //
  // INDEXED BY matters: almost every row is ESCAPED, so left alone the
  // planner uses the status index and scans everything anyway
  const top = await env.DB.prepare('SELECT MAX(n) AS top FROM records').first();
  const ceiling = (top && top.top) || 0;

  const grab = (from) => env.DB.prepare(`
    SELECT id, lyric FROM records INDEXED BY records_n_idx
     WHERE n >= ? AND status = 'ESCAPED' AND lyric IS NOT NULL AND TRIM(lyric) <> ''
     ORDER BY n LIMIT ?
  `).bind(from, POOL).all();

  let got = [];
  if (ceiling > 0) got = (await grab(1 + Math.floor(Math.random() * ceiling))).results || [];

  // a window near the end comes back short. top it up from the beginning --
  // the threshold here was SLOTS, which meant a pool of seven survived and
  // the wall had nothing to cycle through
  if (got.length < POOL) {
    const seen = new Set(got.map((r) => r.id));
    for (const r of (await grab(1)).results || []) {
      if (got.length >= POOL) break;
      if (!seen.has(r.id)) { got.push(r); seen.add(r.id); }
    }
  }

  const pool = got.map((r) => ({ id: r.id, t: r.lyric }));

  // the first seven are in the markup, so there is something to read before
  // the script runs and something for a crawler to find
  const first = pool.slice(0, SLOTS).map((l) => h`<li class="lines__line">
      <a href="/f/${l.id}">${l.t}</a>
    </li>`).join('');

  const body = h`  <main class="stage doc lines">
    <p class="doc__letterhead spread">${raw(spread(FORM.letterhead))}</p>
    <div class="doc__seal"><a href="/incident" aria-label="Incident report">${raw(cityMark(0, { allLit: true }))}</a></div>

    <h1 class="doc__title">LINES ON FILE</h1>
    <p class="doc__aside">Thousands of subjects wrote something down. These are
      theirs. Tap one to read the record it came from.</p>

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
  }), { headers: { 'cache-control': 'public, max-age=300' } });
}
