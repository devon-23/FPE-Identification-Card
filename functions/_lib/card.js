// The card itself. Rendered server-side for the record page and cloned by
// public/claim.js for the live preview, so both share one markup contract.

import { h, raw } from './html.js';
import { generate, assignedDesignation } from './lore.js';
import { EVENT, FORM } from './config.js';

export const FACTIONS = ['CITIZEN', 'BANDITO'];
export const normalizeFaction = (f) =>
  FACTIONS.includes(String(f || '').toUpperCase()) ? String(f).toUpperCase() : 'CITIZEN';

/** Head-and-shoulders placeholder for records with no photo on file. */
const SILHOUETTE = `<svg class="card__silhouette" viewBox="0 0 100 125" aria-hidden="true">
      <path d="M50 28c9 0 16 7.4 16 16.5S59 61 50 61s-16-7.4-16-16.5S41 28 50 28Zm0 40c18.8 0 34 12.2 34 27.2V125H16V95.2C16 80.2 31.2 68 50 68Z"/>
    </svg>
    <p class="card__nofile">NO IMAGE ON FILE</p>`;

/**
 * @param rec   record row (or a plain object for previews)
 * @param opts  photoSrc overrides the stored photo (used by the live preview)
 */
export function renderCard(rec, { photoSrc = null, preview = false } = {}) {
  const id = rec.id;
  const g = generate(id);
  const faction = normalizeFaction(rec.faction);
  const claimed = rec.status === 'ESCAPED';

  const name = claimed
    ? (rec.name || assignedDesignation(id))
    : 'UNREGISTERED';

  const src = photoSrc || (rec.photo_key ? `/p/${id}.jpg` : null);
  const photo = src
    ? h`<img class="card__photo" src="${src}" alt="">`
    : raw(SILHOUETTE);

  const venue = rec.location || EVENT.venue;
  const city = rec.city || EVENT.city;
  const date = rec.event_date || EVENT.dateDisplay;

  return h`<article class="card card--${raw(faction.toLowerCase())}${raw(claimed ? '' : ' card--blank')}${raw(preview ? ' card--preview' : '')}" data-fpe="${id}">
    <div class="card__strip card__strip--top">
      <span>${FORM.bureau}</span>
      <span>${FORM.code}</span>
    </div>
    <p class="card__name" data-slot="name">${name}</p>
    <p class="card__pill"><span>BISHOP</span> ${g.bishop}</p>
    <div class="card__frame">
      <div class="card__plate">
        ${raw(String(photo))}
        <div class="card__scrim"></div>
        <p class="card__designation">FPE-${id}</p>
      </div>
    </div>
    <p class="card__meta">
      <span>SECTOR ${g.sector}</span>
      <span>ATTEMPT ${g.attempt}</span>
      <span class="card__faction" data-slot="faction">${faction}</span>
    </p>
    <div class="card__strip card__strip--bottom">
      <span>FAILED PERIMETER ESCAPE</span>
      <span>${date} · ${venue}, ${city}</span>
    </div>
  </article>`;
}
