import { h, raw, layout, htmlResponse } from './_lib/html.js';
import { FORM, EVENT, demaDate } from './_lib/config.js';

// the big landscape one, for a laptop. same data as /map, read differently
const DESTINATION = { lat: 39.9612, lon: -82.9988, label: 'OHIO STATE UNIVERSITY' };

const MILES = 3958.8;

function distance(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * MILES * Math.asin(Math.min(1, Math.sqrt(s)));
}

const miles = (n) => Math.round(n).toLocaleString('en-US');

// nominatim hands back "Toronto, Golden Horseshoe, Ontario, Canada"
function country(label) {
  if (!label) return null;
  const parts = String(label).split(',').map((x) => x.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1].toUpperCase() : null;
}

function stat(label, value, note) {
  return h`<div class="fh__stat">
        <dd>${value}</dd>
        <dt>${label}</dt>
        ${raw(note ? h`<p>${note}</p>` : '')}
      </div>`;
}

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(`
    SELECT r.id, r.name, r.hometown, r.faction, p.lat, p.lon, p.label
      FROM records r
      JOIN places p ON p.q = UPPER(TRIM(r.hometown))
     WHERE r.status = 'ESCAPED' AND p.lat IS NOT NULL
     ORDER BY r.n
  `).all();

  const rows = results || [];

  const byPlace = new Map();
  for (const r of rows) {
    const key = `${r.lat},${r.lon}`;
    if (!byPlace.has(key)) {
      byPlace.set(key, {
        lat: r.lat, lon: r.lon, town: r.hometown, label: r.label, people: [],
        away: distance(DESTINATION, { lat: r.lat, lon: r.lon }),
      });
    }
    byPlace.get(key).people.push({ id: r.id, name: r.name || `SUBJECT ${r.id}` });
  }

  const pins = [...byPlace.values()];
  const travelled = pins.reduce((sum, p) => sum + p.away * p.people.length, 0);

  const biggest = pins.slice().sort((a, b) => b.people.length - a.people.length)[0];
  const furthest = pins.slice().sort((a, b) => b.away - a.away)[0];
  const nearest = pins.slice().sort((a, b) => a.away - b.away)[0];

  const countries = new Set(pins.map((p) => country(p.label)).filter(Boolean));

  const cards = [
    stat('SUBJECTS PLOTTED', h`${String(rows.length)}`,
      h`FROM ${String(pins.length)} SEPARATE ORIGIN${raw(pins.length === 1 ? '' : 'S')}`),

    stat('COUNTRIES ON FILE', h`${String(countries.size)}`,
      countries.size ? h`${[...countries].sort().join(' · ')}` : null),

    biggest ? stat('BIGGEST ORIGIN', h`${biggest.town}`,
      h`${String(biggest.people.length)} SUBJECT${raw(biggest.people.length === 1 ? '' : 'S')} ON ONE PIN`) : '',

    furthest ? stat('FURTHEST TRAVELLED', h`${miles(furthest.away)} MI`,
      h`${furthest.town}`) : '',

    nearest ? stat('CLOSEST TO THE WALL', h`${miles(nearest.away)} MI`,
      h`${nearest.town}`) : '',

    stat('DISTANCE COVERED', h`${miles(travelled)} MI`,
      raw('EVERY SUBJECT, EVERY MILE, ADDED UP')),
  ].filter(Boolean).join('');

  const body = h`  <main class="fh">
    <header class="fh__head">
      <p class="fh__kicker">DEMA ARCHIVES &middot; INCIDENT ${FORM.statute}</p>
      <h1 class="fh__title">FR&Oslash;M HERE</h1>
      <p class="fh__sub">${EVENT.venue} &middot; ${EVENT.city} &middot; ${demaDate(`${EVENT.date}T00:00:00Z`)}</p>
    </header>

    <div class="fh__plot">
      <div class="fh__map" id="map" role="application" aria-label="Map of subject origins"></div>
      <p class="fh__tohere">&mdash;&mdash;&mdash;&gt; TO HERE</p>
    </div>

    <dl class="fh__stats">${raw(cards)}</dl>

    <noscript><p class="fh__note">THIS PLOT REQUIRES SCRIPTING.</p></noscript>

    <p class="fh__links">
      <a href="/map">THE SMALL PLOT</a>
      <a href="/">INCIDENT REPORT ${FORM.statute}</a>
    </p>
  </main>

  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js" defer></script>
  <script id="pins" type="application/json">${raw(JSON.stringify(pins.map((p) => ({
    lat: p.lat, lon: p.lon, town: p.town, people: p.people,
  }))))}</script>
  <script id="dest" type="application/json">${raw(JSON.stringify(DESTINATION))}</script>
  <script src="/fromhere.js" defer></script>`;

  return htmlResponse(layout({
    title: 'FRØM HERE — DEMA ARCHIVES',
    body,
    bodyClass: 'page-fromhere',
    back: false,
  }), { headers: { 'cache-control': 'public, max-age=60' } });
}
