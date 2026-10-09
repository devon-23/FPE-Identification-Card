import { h, raw, layout, htmlResponse, spread } from './_lib/html.js';
import { SET_SIZE, FORM, EVENT, demaDate } from './_lib/config.js';
import { cityMark } from './_lib/glyph.js';

const PAGE = 100;

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  // how many of the walk-ins to show, and what they are looking for. both
  // live in the url so this still works with no javascript
  const asked = parseInt(url.searchParams.get('u') || '', 10);
  const shown = Number.isFinite(asked) ? Math.min(Math.max(asked, PAGE), 20000) : PAGE;
  const q = (url.searchParams.get('q') || '').trim().slice(0, 40);

  // the hundred issued cards. always all of them, it is a hundred rows
  const { results } = await env.DB
    .prepare('SELECT id, status, faction, name, n FROM records WHERE n <= ? ORDER BY n')
    .bind(SET_SIZE).all();

  const all = results || [];
  const claimed = all.filter((r) => r.status === 'ESCAPED').length;

  // the walk-ins are a page at a time. there could be thousands of them and
  // reading every row on every front page load is how you burn a day's quota
  const like = `%${q.toUpperCase()}%`;
  const filter = q
    ? "AND (UPPER(id) LIKE ? OR UPPER(COALESCE(name, '')) LIKE ?)"
    : '';
  const args = q ? [SET_SIZE, like, like] : [SET_SIZE];

  const tally = await env.DB
    .prepare(`SELECT count(*) AS n FROM records
               WHERE n > ? AND status = 'ESCAPED' AND attending = 1 ${filter}`)
    .bind(...args).first();
  const walkInTotal = (tally && tally.n) || 0;

  const page = await env.DB
    .prepare(`SELECT id, status, faction, name, n FROM records
               WHERE n > ? AND status = 'ESCAPED' AND attending = 1 ${filter}
               ORDER BY n LIMIT ?`)
    .bind(...args, shown).all();
  const walkIns = page.results || [];

  // one square per designation. taken ones get filled; citizen stays black, escapee goes red, bandito goes yellow
  function cell(r) {
    const taken = r.status === 'ESCAPED';
    const side = taken ? String(r.faction || '').toLowerCase() : '';
    const cls = `cell${taken ? ' cell--taken' : ''}${side === 'escapee' || side === 'bandito' ? ` cell--${side}` : ''}`;
    const who = taken ? h`<span class="cell__who">${r.name || 'FILED'}</span>` : '';
    const mark = taken ? ` data-f="${side || 'citizen'}"` : '';
    return h`<a class="${raw(cls)}"${raw(mark)} href="/f/${r.id}"><span class="cell__n">${r.id}</span>${raw(who)}</a>`;
  }

  const cells = all.map(cell).join('');

  const report = `At approximately 21:14 L.M.T, on the 17th day of October, 2026_moon (Revised Dema Calendar),
    Municipal Sensors registered a thermal disturbance at Grid Section OS-North, outside Perimeter Sector
    Thoroughfare. On-site response units discovered an unsanctioned assembly of
    inhabitants within the boundary of the structure known locally as OHIO STATE
    UNIVERSITY, Columbus district. Attendees were observed in coordinated
    vocalisation of prohibited material and dressing. Identifying marks were recorded where
    recoverable; ${SET_SIZE} subjects were issued designation under Form
    ${FORM.code}. Surveillance volds in the same quadrant suggest intentional
    disruption of municipal telemetry, an infraction in direct violatlon of
    Statute C-22.112(b).`;

  const body = h`  <main class="stage doc">
    <p class="doc__letterhead spread">${raw(spread(FORM.letterhead))}</p>
    <div class="doc__seal">
      ${raw(cityMark(0, { allLit: true }))}`
      /* <a class="doc__who" href="/about">WHO FILED THIS &mdash;&mdash;&mdash;&gt;</a> */
    + `</div>

    <h1 class="doc__title">INVESTIGATIVE SUMMARY<br>&mdash; INCIDENT RPT &mdash;</h1>
    <p class="doc__date">${demaDate(`${EVENT.date}T00:00:00Z`)}</p>

    <p class="doc__report">${report}</p>

    <p class="doc__count"><b>${String(claimed)}</b> OF ${String(SET_SIZE)} DESIGNATIONS ACCOUNTED FOR.</p>

    <a class="sighting" href="/turn-yourself-in">NO CARD? TURN YOURSELF IN &mdash;&mdash;&mdash;&gt;</a>

    <h2 class="doc__sub">IDENTIFIED PERSONNEL:</h2>
    <div class="grid">${raw(cells)}</div>

    ${raw(walkInTotal || q ? h`<h2 class="doc__sub" id="unidentified">UNIDENTIFIED PERSONNEL:</h2>
    <p class="doc__aside">Provisional designations. No card was issued; these subjects
      presented themselves.</p>

    ${raw(walkInTotal > PAGE || q ? h`<form class="find" method="GET" action="/incident">
      <label class="form__label" for="q">FIND A SUBJECT</label>
      <div class="find__row">
        <input class="form__input" id="q" name="q" type="search" value="${q}"
               maxlength="40" autocomplete="off" autocapitalize="characters"
               placeholder="NUMBER OR NAME" enterkeyhint="search">
        <button class="button" type="submit">SEARCH</button>
      </div>
      ${raw(q ? h`<p class="find__clear"><a href="/incident#unidentified">CLEAR THE SEARCH</a></p>` : '')}
    </form>` : '')}

    ${raw(walkIns.length
      ? h`<div class="grid">${raw(walkIns.map(cell).join(''))}</div>`
      : h`<p class="note">NOTHING IN THE REGISTER MATCHES THAT.</p>`)}

    ${raw(walkInTotal > walkIns.length ? h`<p class="more">
      <span>SHOWING ${String(walkIns.length)} OF ${String(walkInTotal)}</span>
      <a class="button" href="/incident?u=${String(shown + PAGE)}${raw(q ? `&q=${encodeURIComponent(q)}` : '')}#unidentified">LOAD NEXT ${String(PAGE)}</a>
    </p>` : raw(walkInTotal > PAGE ? h`<p class="more"><span>SHOWING ALL ${String(walkInTotal)}</span></p>` : ''))}` : '')}

    <a class="sighting" href="/from-here">BANDITO SIGHTINGS &mdash;&mdash;&mdash;&gt;</a>

    <aside class="restricted">
      <img class="restricted__img" src="/images/restricted.webp"
           alt="RESTRICTED CONTENT. VIOLATION CODE ${FORM.violation}." width="1027" height="167">

      <!-- the hand-built version of the banner. 
      <div class="restricted__box">
        <span class="restricted__mark">DMA<br>ORG</span>
        <span class="restricted__shout">RESTRICTED CONTENT</span>
        <span class="restricted__seal">[city mark went here]</span>
        <span class="restricted__code">VIOLATION CODE<br><b>DMA-8325</b></span>
        <p class="restricted__body">THIS RECORD IS CLASSIFIED AND INTENDED EXCLUSIVELY FOR
          AUTHORIZED PERSONNEL OF DMAORG. UNAUTHORIZED VIEWING, POSSESSION, OR DISSEMINATION
          OF THIS MATERIAL WITHIN THE SACRED MUNICIPALITY OF DEMA IS A VIOLATION OF MUNICIPAL
          LAW AND WILL RESULT IN SEVERE PENALTIES, INCLUDING BUT NOT LIMITED TO CONFINEMENT
          OR PERMANENT BANISHMENT.</p>
      </div>
      -->

      <p class="restricted__foot spread">${raw(spread(FORM.benediction))}</p>
    </aside>
  </main>`;

  return htmlResponse(layout({
    title: `DMAORG — INCIDENT RPT ${FORM.statute}`,
    body,
    bodyClass: 'page-index',
    back: false,
  }), { headers: { 'cache-control': 'public, max-age=30' } });
}
