import { h, raw, layout, htmlResponse } from '../_lib/html.js';
import { SET_SIZE, EVENT } from '../_lib/config.js';
import { getSetting } from '../_lib/db.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const filter = url.searchParams.get('show') || 'all';
  const q = (url.searchParams.get('q') || '').trim().toUpperCase();
  const notice = url.searchParams.get('ok');

  const { results } = await env.DB.prepare(
    'SELECT id, status, name, name_assigned, faction, photo_key, claimed_at FROM records ORDER BY n'
  ).all();

  const all = results || [];
  const claimed = all.filter((r) => r.status === 'ESCAPED').length;
  const withPhoto = all.filter((r) => r.photo_key).length;
  const open = (await getSetting(env.DB, 'claiming_open', '0')) === '1';

  let rows = all;
  if (filter === 'claimed') rows = rows.filter((r) => r.status === 'ESCAPED');
  if (filter === 'open') rows = rows.filter((r) => r.status !== 'ESCAPED');
  if (filter === 'photo') rows = rows.filter((r) => r.photo_key);
  if (q) rows = rows.filter((r) => r.id.includes(q) || (r.name || '').toUpperCase().includes(q));

  const tabs = [['all', 'ALL'], ['claimed', 'CLAIMED'], ['open', 'OPEN'], ['photo', 'PHOTOS']]
    .map(([key, label]) => h`<a class="tab${raw(filter === key ? ' tab--on' : '')}" href="/admin?show=${key}">${label}</a>`)
    .join('');

  const list = rows.map((r) => {
    const taken = r.status === 'ESCAPED';
    const name = taken ? (r.name || '(ASSIGNED)') : '—';
    return h`<div class="arow">
      <div class="arow__id"><a href="/f/${r.id}">${r.id}</a></div>
      <div class="arow__name">${name}${raw(r.photo_key ? ' <span class="tag">IMG</span>' : '')}${raw(taken ? h` <span class="tag">${r.faction}</span>` : '')}</div>
      <div class="arow__act">${raw(taken ? h`
        ${raw(r.photo_key ? h`<form method="POST" action="/admin/act"><input type="hidden" name="do" value="unphoto"><input type="hidden" name="id" value="${r.id}"><button class="mini">DEL IMG</button></form>` : '')}
        <form method="POST" action="/admin/act" onsubmit="return confirm('Reset FPE-${r.id} to unregistered? This cannot be undone.')"><input type="hidden" name="do" value="reset"><input type="hidden" name="id" value="${r.id}"><button class="mini mini--warn">RESET</button></form>` : '<span class="dim">unclaimed</span>')}</div>
    </div>`;
  }).join('');

  const body = h`  <main class="stage admin">
    ${raw(notice ? h`<p class="ok">${notice}</p>` : '')}

    <div class="stats">
      <div><b>${String(claimed)}</b><span>CLAIMED</span></div>
      <div><b>${String(SET_SIZE - claimed)}</b><span>OPEN</span></div>
      <div><b>${String(withPhoto)}</b><span>PHOTOS</span></div>
    </div>

    <form class="switch" method="POST" action="/admin/act">
      <input type="hidden" name="do" value="toggle">
      <span>CLAIMING IS <b>${raw(open ? 'OPEN' : 'CLOSED')}</b></span>
      <button class="button ${raw(open ? '' : 'button--primary')}">${raw(open ? 'CLOSE IT' : 'OPEN IT')}</button>
    </form>

    <p class="note">VENUE: ${EVENT.venue}, ${EVENT.city} &middot; ${EVENT.dateDisplay}</p>

    <form class="search" method="GET" action="/admin">
      <input type="hidden" name="show" value="${filter}">
      <input class="form__input" name="q" value="${q}" placeholder="SEARCH NUMBER OR NAME"
             autocapitalize="characters" autocomplete="off" spellcheck="false" enterkeyhint="search">
    </form>

    <nav class="tabs">${raw(tabs)}</nav>

    <div class="alist">${raw(list || '<p class="note">NOTHING MATCHES.</p>')}</div>

    <form method="POST" action="/admin/logout"><button class="button button--quiet">LOG OUT</button></form>
  </main>`;

  return htmlResponse(layout({
    title: `ADMIN — ${claimed}/${SET_SIZE}`,
    body, bodyClass: 'page-admin',
  }), { headers: { 'cache-control': 'no-store' } });
}
