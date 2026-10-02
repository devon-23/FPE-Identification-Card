// The card, as a document: paper, letterhead, a numbered box, a seal.
//
// Rendered server-side for the record page and updated in place by
// public/claim.js for the live preview, so both share one markup contract.

import { h, raw, spread } from './html.js';
import { generate, assignedDesignation, citizenId } from './lore.js';
import { cityMark } from './glyph.js';
import { EVENT, FORM, demaDate } from './config.js';

export const FACTIONS = ['CITIZEN', 'BANDITO'];
export const normalizeFaction = (f) =>
  FACTIONS.includes(String(f || '').toUpperCase()) ? String(f).toUpperCase() : 'CITIZEN';

export const REDACTED = '[REDACTED]';

const SILHOUETTE = `<svg class="card__silhouette" viewBox="0 0 100 125" aria-hidden="true">
        <path d="M50 30c8.6 0 15.5 7 15.5 15.7S58.6 61.4 50 61.4s-15.5-7-15.5-15.7S41.4 30 50 30Zm0 38.5c17.7 0 32 11.4 32 25.5V125H18V94c0-14.1 14.3-25.5 32-25.5Z"/>
      </svg>
      <span class="card__nofile">NO IMAGE ON FILE</span>`;

/**
 * A field as it appears on a form that was filled in by hand: the value
 * written on the line, the printed label underneath it.
 */
function fact(label, value, slot, cls = '') {
  const attr = slot ? ` data-slot="${slot}"` : '';
  return `<div class="fact${cls ? ' ' + cls : ''}"><dd${attr}>${value}</dd><dt>${label}</dt></div>`;
}

/** Legacy records stored a formatted date; newer ones store ISO. */
function showDate(stored) {
  if (!stored) return EVENT.dateDisplay;
  return /^\d{4}-\d{2}-\d{2}/.test(stored) ? demaDate(stored) : stored;
}

export function renderCard(rec, { photoSrc = null, preview = false } = {}) {
  const id = rec.id;
  const g = generate(id);
  const faction = normalizeFaction(rec.faction);
  const claimed = rec.status === 'ESCAPED';

  const name = claimed ? (rec.name || assignedDesignation(id)) : 'UNREGISTERED';
  const src = photoSrc || (rec.photo_key ? `/p/${id}.jpg` : null);
  const plate = src ? h`<img class="card__photo" src="${src}" alt="">` : raw(SILHOUETTE);

  const attempts = rec.attempts ? String(rec.attempts).padStart(2, '0') : '01';
  const lyric = rec.lyric || '';

  const venue = rec.location || EVENT.venue;
  const city = rec.city || EVENT.city;
  const date = showDate(rec.event_date);

  const classes = [
    'card',
    `card--${faction.toLowerCase()}`,
    claimed ? '' : 'card--blank',
    preview ? 'card--preview' : '',
  ].filter(Boolean).join(' ');

  return h`<article class="${raw(classes)}" data-fpe="${id}" data-bishop="${raw(String(g.bishopIdx))}">
    <p class="card__letterhead spread" data-plain="${FORM.letterhead}">${raw(spread(FORM.letterhead))}</p>

    <div class="card__seal">${raw(cityMark(g.bishopIdx))}</div>

    <header class="card__head">
      <p class="card__charge">
        <span>IDENTIFIED AS</span>
        <b>FAILED PERIMETER ESCAPE</b>
        <span>BY DEMA COUNCIL</span>
      </p>
      <p class="card__statute">
        <span>VIOLATION OF SECTION ${FORM.statute}</span>
        <span>OF VIALIST CODE OF CONDUCT</span>
      </p>
    </header>

    <div class="card__body">
      <div class="card__plate">${raw(String(plate))}</div>
      <dl class="card__facts">
        ${raw(`<div class="fact fact--name"><dd data-slot="name">${h`${name}`}</dd><dt>NAME</dt></div>`)}
        ${raw(fact('CITIZEN ID', h`${citizenId(id)}`, null, 'fact--id'))}
        ${raw(fact('BISHOP', h`${g.bishop}`))}
        ${raw(fact('ESCAPE ATTEMPT', h`${attempts}`, 'attempts'))}
      </dl>
    </div>

    <p class="card__lyric${raw(lyric ? '' : ' is-empty')}" data-slot="lyric">${lyric}</p>

    <p class="card__designation">FPE-${id}</p>

    <p class="card__place">
      <b>${venue}</b>
      <span>${city} &middot; ${date}</span>
    </p>

    <p class="card__foot spread" data-plain="${FORM.benediction}">${raw(spread(FORM.benediction))}</p>
    <span class="card__faction" data-slot="faction" hidden>${faction}</span>
  </article>`;
}
