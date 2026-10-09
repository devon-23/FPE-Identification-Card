import { h, raw, layout, htmlResponse } from '../_lib/html.js';
import { SET_SIZE, EVENT } from '../_lib/config.js';
import { getSetting } from '../_lib/db.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const filter = url.searchParams.get('show') || 'all';
  const q = (url.searchParams.get('q') || '').trim().toUpperCase();
  const notice = url.searchParams.get('ok');

  const { results } = await env.DB.prepare(
    'SELECT id, n, status, name, name_assigned, faction, photo_key, claimed_at FROM records ORDER BY n'
  ).all();

  const all = results || [];
  const cards = all.filter((r) => r.n <= SET_SIZE);
  const claimed = cards.filter((r) => r.status === 'ESCAPED').length;
  const withPhoto = all.filter((r) => r.photo_key).length;
  const open = (await getSetting(env.DB, 'claiming_open', '0')) === '1';
  const throttled = (await getSetting(env.DB, 'surrender_throttle', '1')) === '1';

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
    // provisional rows have no card behind them, so they can go entirely.
    // resetting one would only leave a number nobody can ever claim
    const provisional = r.n > SET_SIZE;

    const acts = [
      taken && r.photo_key ? h`<form method="POST" action="/admin/act"><input type="hidden" name="do" value="unphoto"><input type="hidden" name="id" value="${r.id}"><button class="mini">DEL IMG</button></form>` : '',
      taken && !provisional ? h`<form method="POST" action="/admin/act" onsubmit="return confirm('Reset FPE-${r.id} to unregistered? This cannot be undone.')"><input type="hidden" name="do" value="reset"><input type="hidden" name="id" value="${r.id}"><button class="mini mini--warn">RESET</button></form>` : '',
      provisional ? h`<form method="POST" action="/admin/act" onsubmit="return confirm('Delete ${r.id} for good? This cannot be undone.')"><input type="hidden" name="do" value="drop"><input type="hidden" name="id" value="${r.id}"><button class="mini mini--warn">DELETE</button></form>` : '',
    ].filter(Boolean).join('');

    return h`<div class="arow">
      <div class="arow__id"><a href="/f/${r.id}">${r.id}</a></div>
      <div class="arow__name">${name}${raw(r.photo_key ? ' <span class="tag">IMG</span>' : '')}${raw(taken ? h` <span class="tag">${r.faction}</span>` : '')}</div>
      <div class="arow__act">${raw(acts || '<span class="dim">unclaimed</span>')}</div>
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

    <form class="switch" method="POST" action="/admin/act">
      <input type="hidden" name="do" value="throttle">
      <span>SURRENDER LIMIT IS <b>${raw(throttled ? 'ON' : 'OFF')}</b></span>
      <button class="button">${raw(throttled ? 'TURN IT OFF' : 'TURN IT ON')}</button>
    </form>
    <p class="note">THE LIMIT IS THREE PROVISIONAL DESIGNATIONS AN HOUR PER ADDRESS.
      TURN IT OFF TO TEST, BACK ON BEFORE THE DOORS.</p>

    <div class="purge">
      <h2 class="purge__head">BEFORE THE KEYS GO OUT</h2>

      <form class="purge__form" method="POST" action="/admin/act"
            onsubmit="return confirm('Release every issued card? All ${String(claimed)} claimed numbered records go back to unregistered and their photos are deleted. This cannot be undone.')">
        <input type="hidden" name="do" value="release">
        <input class="form__input" name="confirm" placeholder="TYPE RELEASE" aria-label="Type RELEASE to confirm"
               autocapitalize="characters" autocomplete="off" spellcheck="false">
        <button class="button button--danger">RELEASE ${String(claimed)} CARD${raw(claimed === 1 ? '' : 'S')}</button>
      </form>
      <p class="note">EVERY NUMBERED CARD GOES BACK TO UNREGISTERED: THE EDIT TOKEN ON THE ROW
        DIES, THE PHOTO GOES, AND THE TAG WORKS AGAIN FOR WHOEVER TAPS IT NEXT. RUN THIS AFTER
        TESTING THE TAGS AND BEFORE HANDING THEM OUT. THE SELF-FILED X/Y/Z RECORDS ARE LEFT ALONE.</p>

      <button class="button button--quiet" type="button" data-forget>FORGET THIS DEVICE
        (<span data-forget-n>0</span>)</button>
      <p class="note">THE LOCK IS NOT A COOKIE THE SERVER CAN CLEAR — IT IS AN EDIT TOKEN SITTING
        IN THE TAPPER&rsquo;S OWN BROWSER, MATCHED AGAINST A HASH ON THE ROW. RELEASING THE CARDS
        ABOVE KILLS THE HASHES; THIS CLEARS THE TOKENS THIS PHONE IS STILL CARRYING.</p>
    </div>

    <form class="switch" method="POST" action="/admin/act">
      <input type="hidden" name="do" value="pins">
      <span>TOWNS WITH NO PIN YET</span>
      <button class="button">PLACE THEM</button>
    </form>
    <p class="note">A TOWN ONLY GETS LOOKED UP ONCE, AND A BUSY NIGHT CAN MEAN THE LOOKUP
      NEVER LANDED. THIS RETRIES TEN AT A TIME. SAFE TO RUN OVER AND OVER.</p>

    <p class="note">VENUE: ${EVENT.venue}, ${EVENT.city} &middot; ${EVENT.dateDisplay}</p>

    <form class="search" method="GET" action="/admin">
      <input type="hidden" name="show" value="${filter}">
      <input class="form__input" name="q" value="${q}" placeholder="SEARCH NUMBER OR NAME"
             autocapitalize="characters" autocomplete="off" spellcheck="false" enterkeyhint="search">
    </form>

    <nav class="tabs">${raw(tabs)}</nav>

    <div class="alist">${raw(list || '<p class="note">NOTHING MATCHES.</p>')}</div>

    <form method="POST" action="/admin/logout"><button class="button button--quiet">LOG OUT</button></form>
  </main>
  <script src="/forget.js" defer></script>`;

  return htmlResponse(layout({
    title: `ADMIN — ${claimed}/${SET_SIZE}`,
    body, bodyClass: 'page-admin',
  }), { headers: { 'cache-control': 'no-store' } });
}
