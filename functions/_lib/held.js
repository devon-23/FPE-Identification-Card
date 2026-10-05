import { h, raw } from './html.js';
import { ABOUT } from './about.js';

export const MAX_HELD = 3;

// the same block on the surrender page and both plots: what this browser has
// already filed, with a way into each one, and the line about the limit.
// held.js fills the list in -- the server has no idea who is standing there
export function heldBlock({ anyway = 'FILE ANOTHER ANYWAY', cls = 'held' } = {}) {
  const contact = ABOUT.contact && ABOUT.contact.handle
    ? h` THINK THAT IS WRONG? <a href="${ABOUT.contact.href}" rel="noopener noreferrer" target="_blank">${ABOUT.contact.handle}</a>.`
    : '';

  return h`<section class="${raw(cls)}" data-held data-max="${String(MAX_HELD)}" hidden>
      <p class="held__head" data-held-head>THIS TERMINAL ALREADY HOLDS A FILE.</p>
      <ul class="held__list" data-held-list></ul>
      <p class="held__body" data-held-note hidden>${String(MAX_HELD)} IS THE LIMIT. AMEND ONE OF THOSE
        OR WITHDRAW IT, AND THE DESIGNATION GOES BACK.${raw(String(contact))}</p>
      <button class="button button--quiet" type="button" data-action="anyway">${anyway}</button>
    </section>`;
}
