import { h, raw, layout, htmlResponse } from './_lib/html.js';
import { SET_SIZE, FORM } from './_lib/config.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const view = url.searchParams.get('view') === 'list' ? 'list' : 'grid';
  const town = (url.searchParams.get('town') || '').trim().toUpperCase();

  const { results } = await env.DB
    .prepare('SELECT id, status, faction, name, hometown, attempts FROM records ORDER BY n')
    .all();

  const all = results || [];
  const claimed = all.filter((r) => r.status === 'ESCAPED').length;

  // Filtering by hometown is the point of the list: it is how someone finds
  // the other people who came in from their town.
  const filtered = town
    ? all.filter((r) => (r.hometown || '').toUpperCase() === town)
    : all;

  const grid = all.map((r) => {
    const taken = r.status === 'ESCAPED';
    const bandito = r.faction === 'BANDITO';
    const cls = `cell${taken ? ' cell--taken' : ''}${taken && bandito ? ' cell--bandito' : ''}`;
    return h`<a class="${raw(cls)}" href="/f/${r.id}" title="${raw(taken ? h`${r.name || 'FILED'}` : 'UNREGISTERED')}"
      ><span class="cell__n">${r.id}</span><span class="cell__s">${raw(taken ? (bandito ? 'BND' : 'CTZ') : '—')}</span></a>`;
  }).join('');

  const list = filtered.filter((r) => r.status === 'ESCAPED').map((r) => {
    const bandito = r.faction === 'BANDITO';
    const sub = [
      r.hometown ? h`<a class="entry__town" href="/archive?view=list&town=${encodeURIComponent(r.hometown)}">${r.hometown}</a>` : null,
      r.attempts ? `ATTEMPT ${String(r.attempts).padStart(2, '0')}` : null,
    ].filter(Boolean).join(' · ');
    return h`<div class="entry${raw(bandito ? ' entry--bandito' : '')}">
      <a class="entry__n" href="/f/${r.id}">${r.id}</a>
      <span class="entry__name"><a href="/f/${r.id}">${r.name || 'DESIGNATION ASSIGNED'}</a>${raw(sub ? `<small>${sub}</small>` : '')}</span>
      <span class="entry__f">${raw(bandito ? 'BND' : 'CTZ')}</span>
    </div>`;
  }).join('');

  const body = h`  <main class="stage">
    <p class="kicker">REGISTER OF DESIGNATIONS</p>
    <p class="designation">${String(claimed).padStart(3, '0')}<span class="of">/${String(SET_SIZE).padStart(3, '0')}</span></p>
    <p class="note">${String(claimed)} OF ${String(SET_SIZE)} DESIGNATIONS ACCOUNTED FOR.
      ${raw(claimed === SET_SIZE ? 'THE PERIMETER IS FULLY BREACHED.' : `${SET_SIZE - claimed} REMAIN UNCLAIMED.`)}</p>

    <nav class="tabs">
      <a class="tab${raw(view === 'grid' ? ' tab--on' : '')}" href="/archive">THE SET</a>
      <a class="tab${raw(view === 'list' ? ' tab--on' : '')}" href="/archive?view=list">WHO CAME</a>
    </nav>

    ${raw(view === 'grid'
      ? h`<div class="grid">${raw(grid)}</div>
    <p class="legend">
      <span><b class="swatch swatch--ctz"></b> CITIZEN</span>
      <span><b class="swatch swatch--bnd"></b> BANDITO</span>
      <span><b class="swatch"></b> UNREGISTERED</span>
    </p>`
      : h`${raw(town ? h`<p class="filter">FILTERED TO <b>${town}</b> &middot; <a href="/archive?view=list">CLEAR</a></p>` : '')}
    <div class="entries">${raw(list || '<p class="note">NOTHING FILED UNDER THAT HEADING YET.</p>')}</div>`)}

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
