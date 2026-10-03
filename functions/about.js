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
  const plate = a.photo ? h`<img class="card__photo" src="${a.photo}" alt="">` : raw(SILHOUETTE);

  const rows = [
    a.designation ? fact('DESIGNATION', h`${a.designation}`) : '',
    a.hometown ? fact('HOMETOWN', h`${a.hometown}`) : '',
  ].filter(Boolean).join('');

  const links = (a.links || [])
    .filter((l) => l && l.value)
    .map((l) => fact(l.label, h`${l.value}`, l.href))
    .join('');

  const sources = (a.sources || []).filter((s) => s && s.label).map((s) => {
    const name = s.href
      ? h`<a href="${s.href}" rel="noopener noreferrer" target="_blank">${s.label}</a>`
      : h`${s.label}`;
    return h`<li>${raw(String(name))}${raw(s.note ? h` &mdash; ${s.note}` : '')}</li>`;
  }).join('');

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

      ${raw((a.howto || []).length ? h`<section class="sources">
        <h2>HOW THIS WORKS</h2>
        <ol class="steps">${raw((a.howto || []).map((t) => h`<li>${t}</li>`).join(''))}</ol>
      </section>` : '')}

      ${raw(a.contact && a.contact.handle ? h`<section class="sources">
        <h2>AMENDMENTS &middot; REMOVAL &middot; QUESTIONS</h2>
        <p class="sources__note">Want something changed, or your record taken down
          altogether? Ask and it is done &mdash; no reason needed. Same address for
          anything that looks broken, or if you just want to say something.</p>
        ${raw(fact(a.contact.label, h`${a.contact.handle}`, a.contact.href))}
      </section>` : '')}

      ${raw(sources ? h`<section class="sources">
        <h2>SITES USED &middot; CREDIT &middot; INSPIRATION</h2>
        <ul>${raw(sources)}</ul>
      </section>` : '')}

      <p class="disclaimer">UNOFFICIAL FAN-MADE &mdash; NOT AFFILIATED WITH TWENTY ONE PILOTS,
        FUELED BY RAMEN OR ANYONE ELSE. MARK PLEASE DON'T BE MAD (again).</p>

      <p class="card__foot spread" data-plain="${FORM.benediction}">${raw(spread(FORM.benediction))}</p>
    </article>

  </main>`;

  return htmlResponse(layout({
    title: `${a.name} — DEMA ARCHIVES`,
    body,
    bodyClass: 'page-about',
  }), { headers: { 'cache-control': 'public, max-age=60' } });
}
