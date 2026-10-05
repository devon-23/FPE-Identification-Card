import { h, raw, layout, htmlResponse, spread } from './_lib/html.js';
import { FORM, EVENT, demaDate } from './_lib/config.js';
import { cityMark } from './_lib/glyph.js';
import { normalise } from './_lib/geo.js';
import { HOMETOWN_MAX } from './_lib/sanitize.js';
import { getSetting } from './_lib/db.js';
import { normalizeId } from './_lib/record.js';
import { heldBlock } from './_lib/held.js';

// where everyone came from, and the one place they all ended up
// the horseshoe itself, not the city. the old pair was downtown Columbus,
// three miles southeast of where anybody actually stood
const DESTINATION = { lat: 40.0016458, lon: -83.0197374, label: EVENT.venue };

export async function onRequestGet({ env, request }) {
  const { results } = await env.DB.prepare(`
    SELECT r.id, r.name, r.hometown, p.lat, p.lon
      FROM records r
      JOIN places p ON p.q = UPPER(TRIM(r.hometown))
     WHERE r.status = 'ESCAPED' AND r.attending = 1 AND p.lat IS NOT NULL
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
    "SELECT count(*) AS n FROM records WHERE status = 'ESCAPED' AND attending = 1 AND hometown IS NOT NULL"
  ).first();
  const waiting = Math.max(0, (counted ? counted.n : 0) - plotted);

  const open = (await getSetting(env.DB, 'claiming_open', '0')) === '1';

  // just came off the form. say which record it made, so nobody goes and
  // makes a second one five minutes later
  const filed = normalizeId(new URL(request.url).searchParams.get('new'));

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

    ${raw(filed ? h`<p class="filed" data-just-filed>FILED AS <b>FPE-${filed}</b>. THAT IS YOUR RECORD &mdash;
      <a href="/f/${filed}/register">FINISH YOUR CARD &mdash;&gt;</a></p>` : '')}

    ${raw(open && !filed ? String(heldBlock({ cls: 'held', anyway: 'PLOT SOMEBODY ELSE' })) + h`

    <div data-held-hide>
    <form class="plot" method="POST" action="/turn-yourself-in">
      <input type="hidden" name="seq" value="0" data-seq>
      <div class="form__row">
        <label class="form__label" for="hometown">ORIGIN ONLY</label>
        <input class="form__input" id="hometown" name="hometown" type="text" required
               maxlength="${String(HOMETOWN_MAX)}" autocomplete="off"
               autocapitalize="characters" placeholder="CITY, STATE OR COUNTRY">
      </div>
      <label class="consent__box consent__box--plain">
        <input type="checkbox" name="attending" value="1" required>
        <span>I WAS AT THE COLUMBUS SHOW.</span>
      </label>
      <button class="button button--primary" type="submit">PLOT MY HOMETOWN</button>
    </form>
    </div>` : '')}

    <a class="sighting" href="/from-here">FR&Oslash;M HERE &mdash; THE BIG PLOT &mdash;&mdash;&mdash;&gt;</a>

    <noscript><p class="note">THIS PLOT REQUIRES SCRIPTING. THE RECORDS THEMSELVES DO NOT.</p></noscript>
  </main>

  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js" defer></script>
  <script id="pins" type="application/json">${raw(JSON.stringify(pins))}</script>
  <script id="dest" type="application/json">${raw(JSON.stringify(DESTINATION))}</script>
  <script src="/map.js" defer></script>
  <script src="/held.js" defer></script>`;

  return htmlResponse(layout({
    title: 'FROM HERE — DEMA ARCHIVES',
    body,
    bodyClass: 'page-map',
  }), { headers: { 'cache-control': filed ? 'no-store' : 'public, max-age=60' } });
}
