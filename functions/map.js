import { h, raw, layout, htmlResponse, spread } from './_lib/html.js';
import { FORM, EVENT, demaDate } from './_lib/config.js';
import { cityMark } from './_lib/glyph.js';
import { normalise } from './_lib/geo.js';
import { HOMETOWN_MAX } from './_lib/sanitize.js';
import { REDACTED } from './_lib/card.js';
import { getSetting } from './_lib/db.js';
import { normalizeId } from './_lib/record.js';

// where everyone came from, and the one place they all ended up
const DESTINATION = { lat: 39.9612, lon: -82.9988, label: 'OHIO STATE UNIVERSITY' };

export async function onRequestGet({ env, request }) {
  const { results } = await env.DB.prepare(`
    SELECT r.id, r.name, r.hometown, p.lat, p.lon
      FROM records r
      JOIN places p ON p.q = UPPER(TRIM(r.hometown))
     WHERE r.status = 'ESCAPED' AND p.lat IS NOT NULL
     ORDER BY r.n
  `).all();

  // two people from the same town land on the same coordinates, so group them into one pin rather than stacking markers nobody can click apart
  const byPlace = new Map();
  for (const r of results || []) {
    const key = `${r.lat},${r.lon}`;
    if (!byPlace.has(key)) {
      byPlace.set(key, { lat: r.lat, lon: r.lon, town: r.hometown, people: [] });
    }
    byPlace.get(key).people.push({ id: r.id, name: r.name || `SUBJECT ${r.id}` });
  }
  const pins = [...byPlace.values()];
  const plotted = (results || []).length;

  const counted = await env.DB.prepare(
    "SELECT count(*) AS n FROM records WHERE status = 'ESCAPED' AND hometown IS NOT NULL"
  ).first();
  const waiting = Math.max(0, (counted ? counted.n : 0) - plotted);

  const open = (await getSetting(env.DB, 'claiming_open', '0')) === '1';

  // just came off the origin-only form. say so and point at the record
  const filed = normalizeId(new URL(request.url).searchParams.get('new'));
  const plottedIt = filed && (results || []).some((r) => r.id === filed);

  const body = h`  <main class="stage doc">
    <p class="doc__letterhead spread" data-plain="${FORM.letterhead}">${raw(spread(FORM.letterhead))}</p>
    <div class="doc__seal">${raw(cityMark(0, { allLit: true }))}</div>

    <h1 class="doc__title">FROM HERE</h1>
    <p class="doc__date">${demaDate(`${EVENT.date}T00:00:00Z`)}</p>

    <p class="doc__report">Every subject on file gave an origin. Plotted below. The
      single marked point is ${EVENT.venue}, ${EVENT.city} &mdash; where all of them
      were recorded on the same night. Select any origin to open its record.</p>

    <div class="map" id="map" role="application" aria-label="Map of subject origins"></div>

    <p class="doc__count"><b>${String(plotted)}</b> ORIGIN${raw(plotted === 1 ? '' : 'S')} PLOTTED${raw(waiting ? h` &middot; ${String(waiting)} AWAITING SURVEY` : '')}</p>

    <noscript><p class="note">THIS PLOT REQUIRES SCRIPTING. THE RECORDS THEMSELVES DO NOT.</p></noscript>

    ${raw(filed ? h`<p class="filed" data-fpe="${filed}">FILED AS FPE-${filed}. ${raw(plottedIt
      ? h`YOUR ORIGIN IS ON THE PLOT. <a href="/f/${filed}">OPEN YOUR RECORD &mdash;&gt;</a>`
      : h`THE ORIGIN YOU GAVE COULD NOT BE PLACED, BUT THE RECORD STANDS. <a href="/f/${filed}">OPEN IT &mdash;&gt;</a>`)}</p>` : '')}

    <a class="sighting" href="/from-here">FR&Oslash;M HERE &mdash; THE BIG PLOT &mdash;&mdash;&mdash;&gt;</a>

    <a class="sighting" href="/turn-yourself-in">NOT ON HERE? MAKE YOUR OWN CARD &mdash;&mdash;&mdash;&gt;</a>

    ${raw(open ? h`<form class="plot" method="POST" action="/turn-yourself-in">
      <h2 class="doc__sub">ORIGIN ONLY:</h2>
      <p class="doc__aside">A whole file is a lot to fill in on a phone in a crowd. Give a
        town and nothing else and you get a pin, under a provisional designation, with every
        other field left ${REDACTED}. Finish it later if you want to.</p>
      <div class="form__row">
        <label class="form__label" for="hometown">WHERE YOU CAME FROM</label>
        <input class="form__input" id="hometown" name="hometown" type="text" required
               maxlength="${String(HOMETOWN_MAX)}" autocomplete="off"
               autocapitalize="characters" placeholder="CITY, STATE OR COUNTRY">
      </div>
      <button class="button button--primary" type="submit">PLOT MY HOMETOWN</button>
    </form>` : '')}
  </main>

  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js" defer></script>
  <script id="pins" type="application/json">${raw(JSON.stringify(pins))}</script>
  <script id="dest" type="application/json">${raw(JSON.stringify(DESTINATION))}</script>
  <script src="/map.js" defer></script>`;

  return htmlResponse(layout({
    title: 'FROM HERE — DEMA ARCHIVES',
    body,
    bodyClass: 'page-map',
  }), { headers: { 'cache-control': filed ? 'no-store' : 'public, max-age=60' } });
}
