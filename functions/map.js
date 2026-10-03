import { h, raw, layout, htmlResponse, spread } from './_lib/html.js';
import { FORM, EVENT, demaDate } from './_lib/config.js';
import { cityMark } from './_lib/glyph.js';
import { normalise } from './_lib/geo.js';

// where everyone came from, and the one place they all ended up
const DESTINATION = { lat: 39.9612, lon: -82.9988, label: 'OHIO STATE UNIVERSITY' };

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(`
    SELECT r.id, r.name, r.hometown, p.lat, p.lon
      FROM records r
      JOIN places p ON p.q = UPPER(TRIM(r.hometown))
     WHERE r.status = 'ESCAPED' AND p.lat IS NOT NULL
     ORDER BY r.n
  `).all();

  // two people from the same town land on the same coordinates, so group
  // them into one pin rather than stacking markers nobody can click apart
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

    <p class="backlink"><a href="/">&larr; INCIDENT REPORT ${FORM.statute}</a></p>
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
  }), { headers: { 'cache-control': 'public, max-age=60' } });
}
