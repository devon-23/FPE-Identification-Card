import { h, raw, layout, htmlResponse, spread } from './_lib/html.js';
import { FORM, EVENT, demaDate } from './_lib/config.js';
import { cityMark } from './_lib/glyph.js';
import { ABOUT } from './_lib/about.js';

const SILHOUETTE = `<svg class="card__silhouette" viewBox="0 0 100 125" aria-hidden="true">
        <path d="M50 30c8.6 0 15.5 7 15.5 15.7S58.6 61.4 50 61.4s-15.5-7-15.5-15.7S41.4 30 50 30Zm0 38.5c17.7 0 32 11.4 32 25.5V125H18V94c0-14.1 14.3-25.5 32-25.5Z"/>
      </svg>`;

function fact(label, value, href) {
  const shown = href
    ? h`<a href="${href}" rel="noopener noreferrer" target="_blank">${value}</a>`
    : h`${value}`;
  return `<div class="fact"><dd>${shown}</dd><dt>${label}</dt></div>`;
}

export function onRequestGet() {
  const a = ABOUT;
  const plate = a.photo
    ? h`<img class="card__photo" src="${a.photo}" alt="">`
    : raw(SILHOUETTE);

  const rows = [
    a.designation ? fact('DESIGNATION', h`${a.designation}`) : '',
    a.hometown ? fact('HOMETOWN', h`${a.hometown}`) : '',
  ].filter(Boolean).join('');

  const links = (a.links || [])
    .filter((l) => l && l.value)
    .map((l) => fact(l.label, h`${l.value}`, l.href))
    .join('');

  const support = a.support && a.support.value
    ? h`<section class="support">
      <dl class="support__line">${raw(fact(a.support.label, h`${a.support.value}`, a.support.href))}</dl>
      ${raw(a.support.note ? h`<p class="support__note">${a.support.note}</p>` : '')}
    </section>`
    : '';

  const body = h`  <main class="stage">
    <article class="card card--about">
      <p class="card__letterhead spread" data-plain="${FORM.letterhead}">${raw(spread(FORM.letterhead))}</p>
      <div class="card__seal">${raw(cityMark(0, { allLit: true }))}</div>

      <header class="card__head">
        <p class="card__charge">
          <span>RECORD MAINTAINED BY</span>
          <b>${a.station}</b>
          <span>${demaDate(`${EVENT.date}T00:00:00Z`)}</span>
        </p>
      </header>

      <div class="card__body">
        <div class="card__plate">${raw(String(plate))}</div>
        <dl class="card__facts">
          ${raw(`<div class="fact fact--name"><dd>${h`${a.name}`}</dd><dt>NAME</dt></div>`)}
          ${raw(rows)}
        </dl>
      </div>

      ${raw(a.bio ? h`<p class="card__bio">${a.bio}</p>` : '')}

      <dl class="card__contact">${raw(links)}</dl>

      ${raw(String(support))}

      <p class="card__foot spread" data-plain="${FORM.benediction}">${raw(spread(FORM.benediction))}</p>
    </article>

    <p class="backlink"><a href="/">&larr; INCIDENT REPORT ${FORM.statute}</a></p>
  </main>`;

  return htmlResponse(layout({
    title: `${a.name} — DEMA ARCHIVES`,
    body,
    bodyClass: 'page-about',
  }), // Short, because this is the page you will be editing.
  { headers: { 'cache-control': 'public, max-age=60' } });
}
