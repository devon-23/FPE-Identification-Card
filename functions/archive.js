import { h, raw, layout, htmlResponse } from './_lib/html.js';
import { SET_SIZE, FORM, EVENT } from './_lib/config.js';

export async function onRequestGet({ env }) {
  // Names are deliberately not listed here. The archive answers "which
  // designations are taken", which is what makes the set feel finite; who
  // holds one is a tap away rather than aggregated onto a single page.
  const { results } = await env.DB
    .prepare('SELECT id, status, faction FROM records ORDER BY n')
    .all();

  const rows = results || [];
  const claimed = rows.filter((r) => r.status === 'ESCAPED').length;

  const cells = rows.map((r) => {
    const taken = r.status === 'ESCAPED';
    const cls = taken ? `cell cell--taken cell--${r.faction === 'BANDITO' ? 'bandito' : 'citizen'}` : 'cell';
    return h`<a class="${raw(cls)}" href="/f/${r.id}"><span class="cell__n">${r.id}</span><span class="cell__s">${raw(taken ? (r.faction === 'BANDITO' ? 'BND' : 'CTZ') : '——')}</span></a>`;
  }).join('');

  const body = h`  <main class="stage">
    <p class="kicker">REGISTER OF DESIGNATIONS</p>
    <p class="designation">${String(claimed).padStart(3, '0')}<span class="of">/${String(SET_SIZE).padStart(3, '0')}</span></p>
    <p class="note">${String(claimed)} OF ${String(SET_SIZE)} DESIGNATIONS ACCOUNTED FOR.
      ${raw(claimed === SET_SIZE ? 'THE PERIMETER IS FULLY BREACHED.' : `${SET_SIZE - claimed} REMAIN UNCLAIMED.`)}</p>

    <div class="grid">${raw(cells)}</div>

    <p class="legend">
      <span><b class="swatch swatch--ctz"></b> CITIZEN</span>
      <span><b class="swatch swatch--bnd"></b> BANDITO</span>
      <span><b class="swatch"></b> UNREGISTERED</span>
    </p>
    <p class="standing">IF FOUND, RETURN TO DEMA.<br>DO NOT TRUST THE BISHOPS.</p>
  </main>`;

  return htmlResponse(layout({
    title: `ARCHIVE — ${claimed}/${SET_SIZE}`,
    body,
    bodyClass: 'page-archive',
    mastLeft: 'DEMA // ARCHIVES',
    mastRight: `FORM ${FORM.code}`,
  }), { headers: { 'cache-control': 'public, max-age=30' } });
}
