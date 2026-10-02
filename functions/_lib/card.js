// The card. Rendered server-side for the record page and updated in place by
// public/claim.js for the live preview, so both share one markup contract.

import { h, raw } from './html.js';
import { generate, assignedDesignation } from './lore.js';
import { cityMark } from './glyph.js';
import { EVENT, FORM } from './config.js';

export const FACTIONS = ['CITIZEN', 'BANDITO'];
export const normalizeFaction = (f) =>
  FACTIONS.includes(String(f || '').toUpperCase()) ? String(f).toUpperCase() : 'CITIZEN';

export const REDACTED = '[REDACTED]';

const SILHOUETTE = `<svg class="card__silhouette" viewBox="0 0 100 125" aria-hidden="true">
        <path d="M50 30c8.6 0 15.5 7 15.5 15.7S58.6 61.4 50 61.4s-15.5-7-15.5-15.7S41.4 30 50 30Zm0 38.5c17.7 0 32 11.4 32 25.5V125H18V94c0-14.1 14.3-25.5 32-25.5Z"/>
      </svg>
      <span class="card__nofile">NO IMAGE</span>`;

function fact(label, value, slot, cls = '') {
  const attr = slot ? ` data-slot="${slot}"` : '';
  return `<div class="fact${cls ? ' ' + cls : ''}"><dt>${label}</dt><dd${attr}>${value}</dd></div>`;
}

/**
 * @param rec   record row, or a plain object for previews
 * @param opts  photoSrc overrides the stored photo (used by the live preview)
 */
export function renderCard(rec, { photoSrc = null, preview = false } = {}) {
  const id = rec.id;
  const g = generate(id);
  const faction = normalizeFaction(rec.faction);
  const claimed = rec.status === 'ESCAPED';

  const name = claimed ? (rec.name || assignedDesignation(id)) : 'UNREGISTERED';
  const src = photoSrc || (rec.photo_key ? `/p/${id}.jpg` : null);
  const plate = src ? h`<img class="card__photo" src="${src}" alt="">` : raw(SILHOUETTE);

  // Everything optional reads [REDACTED] rather than sitting empty -- an
  // unanswered field on a state record is itself in character.
  const attempts = rec.attempts ? String(rec.attempts).padStart(2, '0') : '01';
  const hometown = rec.hometown || REDACTED;
  const bio = rec.bio || REDACTED;
  const handle = rec.handle ? `@${rec.handle}` : REDACTED;

  const venue = rec.location || EVENT.venue;
  const city = rec.city || EVENT.city;
  const date = rec.event_date || EVENT.dateDisplay;

  const classes = [
    'card',
    `card--${faction.toLowerCase()}`,
    claimed ? '' : 'card--blank',
    preview ? 'card--preview' : '',
  ].filter(Boolean).join(' ');

  return h`<article class="${raw(classes)}" data-fpe="${id}" data-bishop="${raw(String(g.bishopIdx))}">
    <div class="card__strip">
      <span>${FORM.bureau}</span>
      <span>${FORM.code}</span>
    </div>

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

    <p class="card__designation">FPE-${id}</p>

    <div class="card__body">
      <div class="card__plate">${raw(String(plate))}</div>
      <dl class="card__facts">
        ${raw(`<div class="fact fact--name"><dt>NAME</dt><dd data-slot="name">${h`${name}`}</dd></div>`)}
        ${raw(fact('HANDLE', h`${handle}`, 'handle'))}
        ${raw(fact('BISHOP', h`${g.bishop}`))}
        ${raw(fact('ESCAPE ATTEMPT', h`${attempts}`, 'attempts'))}
        ${raw(fact('HOMETOWN', h`${hometown}`, 'hometown', 'fact--upper'))}
      </dl>
    </div>

    <p class="card__bio"><span>STATEMENT</span> <span data-slot="bio">${bio}</span></p>

    <p class="card__place">
      <b>${venue}</b>
      <span>${city} &middot; ${date}</span>
    </p>

    <div class="card__mark">${raw(cityMark(g.bishopIdx))}</div>

    <div class="card__strip card__strip--bottom">
      <span>IF FOUND, RETURN TO DEMA</span>
      <span class="card__faction" data-slot="faction">${faction}</span>
    </div>
  </article>`;
}
