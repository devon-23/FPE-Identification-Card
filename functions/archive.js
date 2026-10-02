import { h, raw, layout, htmlResponse } from './_lib/html.js';
import { SET_SIZE, FORM, EVENT } from './_lib/config.js';

export async function onRequestGet({ request, env }) {
  // Names are deliberately not listed here. The archive answers "which
  // designations are taken", which is what makes the set feel finite; who
  // holds one is a tap away rather than aggregated onto a single page.
  const { results } = await env.DB
    .prepare('SELECT id, status, faction, name, hometown, attempts FROM records ORDER BY n')
    .all();

  const all = results || [];
  const claimed = all.filter((r) => r.status === 'ESCAPED').length;

  // Default to the claimed records: wading through ninety-odd blanks to find
  // the handful of people who registered is nobody's idea of browsing.
  const show = new URL(request.url).searchParams.get('show') === 'all' ? 'all' : 'filed';
  const rows = show === 'all' ? all : all.filter((r) => r.status === 'ESCAPED');

  const entries = rows.map((r) => {
    const taken = r.status === 'ESCAPED';
    const bandito = r.faction === 'BANDITO';
    const name = taken ? (r.name || 'DESIGNATION ASSIGNED') : 'UNREGISTERED';
    const cls = `entry${taken ? ' entry--taken' : ''}${taken && bandito ? ' entry--bandito' : ''}`;
    const sub = taken
      ? [r.hometown, r.attempts ? `ATTEMPT ${String(r.attempts).padStart(2, '0')}` : null]
          .filter(Boolean).join(' \u00b7 ')
      : '';
    return h`<a class="${raw(cls)}" href="/f/${r.id}">
      <span class="entry__n">${r.id}</span>
      <span class="entry__name">${name}${raw(sub ? h`<small>${sub}</small>` : '')}</span>
      <span class="entry__f">${raw(taken ? (bandito ? 'BND' : 'CTZ') : '\u2014')}</span>
    </a>`;
  }).join('');

  const body = h`  <main class="stage">
    <p class="kicker">REGISTER OF DESIGNATIONS</p>
    <p class="designation">${String(claimed).padStart(3, '0')}<span class="of">/${String(SET_SIZE).padStart(3, '0')}</span></p>
    <p class="note">${String(claimed)} OF ${String(SET_SIZE)} DESIGNATIONS ACCOUNTED FOR.
      ${raw(claimed === SET_SIZE ? 'THE PERIMETER IS FULLY BREACHED.' : `${SET_SIZE - claimed} REMAIN UNCLAIMED.`)}</p>

    <nav class="tabs">
      <a class="tab${raw(show === 'filed' ? ' tab--on' : '')}" href="/archive">FILED &middot; ${String(claimed)}</a>
      <a class="tab${raw(show === 'all' ? ' tab--on' : '')}" href="/archive?show=all">ALL &middot; ${String(SET_SIZE)}</a>
    </nav>

    <div class="entries">${raw(entries || '<p class="note">NO RECORDS HAVE BEEN FILED YET.</p>')}</div>

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
