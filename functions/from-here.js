import { h, raw, layout, htmlResponse } from './_lib/html.js';
import { FORM, EVENT, demaDate } from './_lib/config.js';
import { HOMETOWN_MAX } from './_lib/sanitize.js';
import { getSetting } from './_lib/db.js';
import { normalizeId } from './_lib/record.js';

// the big landscape one, for a laptop. same data as /map, read differently
// the horseshoe itself, not the city. the old pair was downtown Columbus,
// three miles southeast of where anybody actually stood
const DESTINATION = { lat: 40.0016458, lon: -83.0197374, label: EVENT.venue };

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

export async function onRequestGet({ env, request }) {
  const { results } = await env.DB.prepare(`
    SELECT r.id, r.name, r.hometown, r.faction, p.lat, p.lon, p.label
      FROM records r
      JOIN places p ON p.q = UPPER(TRIM(r.hometown))
     WHERE r.status = 'ESCAPED' AND r.attending = 1 AND p.lat IS NOT NULL
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

  const countries = new Set(pins.map((p) => country(p.label)).filter(Boolean));

  const open = (await getSetting(env.DB, 'claiming_open', '0')) === '1';
  const filed = normalizeId(new URL(request.url).searchParams.get('new'));

  const cards = [
    stat('SUBJECTS PLOTTED', h`${String(rows.length)}`,
      h`FROM ${String(pins.length)} SEPARATE ORIGIN${raw(pins.length === 1 ? '' : 'S')}`),

    stat('COUNTRIES ON FILE', h`${String(countries.size)}`,
      countries.size ? h`${[...countries].sort().join(' · ')}` : null),

    biggest ? stat('BIGGEST ORIGIN', h`${biggest.town}`,
      h`${String(biggest.people.length)} SUBJECT${raw(biggest.people.length === 1 ? '' : 'S')} ON ONE PIN`) : '',

    furthest ? stat('FURTHEST TRAVELLED', h`${miles(furthest.away)} MI`,
      h`${furthest.town}`) : '',

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
      <p class="fh__tohere"><button type="button" class="fh__recentre" data-recentre>&mdash;&mdash;&mdash;&gt; TO HERE</button></p>
    </div>

    <dl class="fh__stats">${raw(cards)}</dl>

    ${raw(filed ? h`<p class="fh__filed" data-just-filed>FILED AS <b>FPE-${filed}</b>. THAT IS YOUR RECORD &mdash;
      <a href="/f/${filed}/register">FINISH YOUR CARD &mdash;&gt;</a></p>` : '')}

    ${raw(open && !filed ? h`<section class="fh__held" data-held hidden>
      <p>THIS TERMINAL IS ALREADY ON THE PLOT AS <b data-held-id>&mdash;</b>.
        CHANGE THE ORIGIN ON THAT RECORD RATHER THAN FILING A SECOND ONE.</p>
      <span class="fh__heldrow">
        <a class="fh__addgo" data-held-link href="/">OPEN THAT RECORD</a>
        <button class="fh__addalt" type="button" data-action="anyway">PLOT SOMEBODY ELSE</button>
      </span>
    </section>

    <div data-held-hide>
    <form class="fh__add" method="POST" action="/turn-yourself-in">
      <input type="hidden" name="back" value="/from-here">
      <label class="fh__addlabel" for="hometown">PUT YOURSELF ON IT</label>
      <div class="fh__addrow">
        <input class="fh__addinput" id="hometown" name="hometown" type="text" required
               maxlength="${String(HOMETOWN_MAX)}" autocomplete="off"
               autocapitalize="characters" placeholder="CITY, STATE OR COUNTRY">
        <button class="fh__addgo" type="submit">PLOT IT</button>
      </div>
      <label class="fh__addcheck">
        <input type="checkbox" name="attending" value="1" required>
        <span>I WAS AT THE COLUMBUS SHOW.</span>
      </label>
    </form>
    </div>` : '')}

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
  <script src="/fromhere.js" defer></script>
  <script src="/held.js" defer></script>`;

  return htmlResponse(layout({
    title: 'FRØM HERE — DEMA ARCHIVES',
    body,
    bodyClass: 'page-fromhere',
    back: false,
  }), { headers: { 'cache-control': filed ? 'no-store' : 'public, max-age=60' } });
}
