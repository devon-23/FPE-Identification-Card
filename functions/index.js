import { h, raw, layout, htmlResponse, spread } from './_lib/html.js';
import { SET_SIZE, FORM, EVENT, demaDate } from './_lib/config.js';
import { cityMark } from './_lib/glyph.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare('SELECT id, status, faction FROM records ORDER BY n')
    .all();

  const all = results || [];
  const claimed = all.filter((r) => r.status === 'ESCAPED').length;

  const cells = all.map((r) => {
    const taken = r.status === 'ESCAPED';
    const bandito = r.faction === 'BANDITO';
    const cls = `cell${taken ? ' cell--taken' : ''}${taken && bandito ? ' cell--bandito' : ''}`;
    return h`<a class="${raw(cls)}" href="/f/${r.id}"><span class="cell__n">${r.id}</span></a>`;
  }).join('');

  // Written in the register's own voice, with the scan artefacts the archive's
  // documents carry. Light enough to stay readable on a phone.
  const report = `At aporoximately 21:14 L.M.T, on the 17th day of 10MOON, 026,
    Municipal Sensors reglstered sustained thermal and
    acoustic disturbance at Grid Section OS-North, outslde Perimeter Sector
    Thoroughfare. On-site response units discovered an unsanctioned assembly of
    inhabitants within the boundary of the structure known locally as OHIO STATE
    UNIVERSITY, Columbus district. Attendees were observed in coordinated
    vocalisation of prohibited material. Identifying marks were recorded where
    recoverable; ${SET_SIZE} subjects were issued designation under Form
    ${FORM.code}. Surveillance volds in the same quadrant suggest intentional
    disruption of municipal telemetry, an infraction in direct violatlon of
    Statute C-22.112(b).`;

  const body = h`  <main class="stage doc">
    <p class="doc__letterhead spread">${raw(spread(FORM.letterhead))}</p>
    <div class="doc__seal">${raw(cityMark(0, { allLit: true }))}</div>

    <h1 class="doc__title">INVESTIGATIVE SUMMARY &mdash; INCIDENT RPT</h1>
    <p class="doc__date">${demaDate(`${EVENT.date}T00:00:00Z`)}</p>

    <p class="doc__report">${report}</p>

    <p class="doc__count"><b>${String(claimed)}</b> OF ${String(SET_SIZE)} DESIGNATIONS ACCOUNTED FOR.</p>

    <h2 class="doc__sub">IDENTIFIED PERSONNEL:</h2>
    <div class="grid">${raw(cells)}</div>

    <aside class="restricted">
      <div class="restricted__box">
        <span class="restricted__mark">DMA<br>ORG</span>
        <span class="restricted__shout">RESTRICTED CONTENT</span>
        <span class="restricted__seal">${raw(cityMark(0, { className: 'mark mark--flat', allLit: true }))}</span>
        <span class="restricted__code">VIOLATION CODE<br><b>${FORM.violation}</b></span>
        <p class="restricted__body">THIS RECORD IS CLASSIFIED AND INTENDED EXCLUSIVELY FOR
          AUTHORIZED PERSONNEL OF DMAORG. UNAUTHORIZED VIEWING, POSSESSION, OR DISSEMINATION
          OF THIS MATERIAL WITHIN THE SACRED MUNICIPALITY OF DEMA IS A VIOLATION OF MUNICIPAL
          LAW AND WILL RESULT IN SEVERE PENALTIES, INCLUDING BUT NOT LIMITED TO CONFINEMENT
          OR PERMANENT BANISHMENT.</p>
      </div>
      <p class="restricted__foot spread">${raw(spread(FORM.benediction))}</p>
    </aside>
  </main>`;

  return htmlResponse(layout({
    title: `DMAORG — INCIDENT RPT ${FORM.statute}`,
    body,
    bodyClass: 'page-index',
    mastLeft: 'DEMA ARCHIVES',
    hideAll: true,
  }), { headers: { 'cache-control': 'public, max-age=30' } });
}
