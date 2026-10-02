import { h, raw, layout, htmlResponse } from '../../_lib/html.js';
import { normalizeId } from '../../_lib/record.js';
import { renderCard } from '../../_lib/card.js';
import { getRecord, getSetting } from '../../_lib/db.js';
import { NAME_MAX } from '../../_lib/sanitize.js';
import { SET_SIZE, FORM } from '../../_lib/config.js';

export async function onRequestGet({ request, params, env }) {
  const id = normalizeId(params.id);
  if (!id) return Response.redirect(new URL('/', request.url).toString(), 302);

  const rec = await getRecord(env.DB, id);
  if (!rec) return Response.redirect(new URL('/', request.url).toString(), 302);

  const claimed = rec.status === 'ESCAPED';
  const claimingOpen = (await getSetting(env.DB, 'claiming_open', '0')) === '1';

  // A closed archive still shows claimed records; it just refuses new ones.
  if (!claimed && !claimingOpen) {
    return Response.redirect(new URL(`/f/${id}`, request.url).toString(), 302);
  }

  // On a claimed record this page is the amend form. Whether the visitor may
  // actually use it is settled by the token, which only the client can read --
  // so the page renders and claim.js locks it down. Nothing here is secret:
  // the record is public either way, and every write is re-checked server-side.
  const card = renderCard(claimed ? rec : { id, status: 'UNREGISTERED' }, { preview: true });

  // Without an R2 binding there is nowhere to publish an image, so the form
  // must not offer a consent box that could not be honoured.
  const canPublishPhotos = !!env.PHOTOS;

  const body = h`  <main class="stage maker" data-fpe="${id}" data-mode="${raw(claimed ? 'amend' : 'claim')}" data-photos="${raw(canPublishPhotos ? 'server' : 'device')}">
    ${raw(card)}

    <noscript><p class="note">THIS FORM REQUIRES SCRIPTING. THE RECORD ITSELF DOES NOT —
      RETURN TO <a href="/f/${id}">FPE-${id}</a> TO READ IT.</p></noscript>

    <form class="form" id="maker" novalidate hidden>
      <h2 class="form__head">${raw(claimed ? 'AMEND RECORD' : 'IDENTIFICATION')}</h2>

      <div class="form__row">
        <label class="form__label" for="name">NAME OR ALIAS <span>OPTIONAL</span></label>
        <input class="form__input" id="name" name="name" type="text"
               maxlength="${String(NAME_MAX)}" autocomplete="off" autocapitalize="characters"
               spellcheck="false" enterkeyhint="done" placeholder="LEAVE BLANK TO BE ASSIGNED ONE">
      </div>

      <fieldset class="form__row form__fieldset">
        <legend class="form__label">ALLEGIANCE DECLARED</legend>
        <div class="toggle">
          <input type="radio" name="faction" id="f-citizen" value="CITIZEN" checked>
          <label for="f-citizen">CITIZEN</label>
          <input type="radio" name="faction" id="f-bandito" value="BANDITO">
          <label for="f-bandito">BANDITO</label>
        </div>
      </fieldset>

      <div class="form__row">
        <span class="form__label">PHOTOGRAPH <span>OPTIONAL</span></span>
        <input type="file" id="photo" accept="image/*" hidden>
        <button type="button" class="button" data-action="pick">TAKE OR CHOOSE PHOTO</button>
        <button type="button" class="button button--quiet" data-action="drop" hidden>REMOVE PHOTO</button>

        <div class="consent" hidden>
          ${raw(canPublishPhotos ? `
          <label class="consent__box">
            <input type="checkbox" id="consent">
            <span>I CONSENT TO PUBLICATION OF THIS IMAGE IN THE PUBLIC ARCHIVE.</span>
          </label>
          <p class="consent__note">IF UNCHECKED, THE IMAGE IS HELD ON THIS DEVICE ONLY AND IS
            NEVER TRANSMITTED. IT WILL BE LOST IF YOU CLEAR YOUR BROWSER DATA, AND IOS DISCARDS
            IT AFTER ABOUT A WEEK WITHOUT A VISIT.</p>` : `
          <p class="consent__note">THIS IMAGE IS HELD ON THIS DEVICE ONLY AND IS NEVER
            TRANSMITTED. OTHERS WHO TAP THIS CARD WILL NOT SEE IT. IT WILL BE LOST IF YOU
            CLEAR YOUR BROWSER DATA.</p>`)}
        </div>
      </div>

      <p class="warning">THIS RECORD IS PUBLIC. ANYONE WHO TAPS THIS CARD — OR TYPES ITS
        NUMBER — WILL SEE WHAT YOU ENTER HERE. USE AN ALIAS IF YOU PREFER.</p>

      <p class="form__status" role="status" aria-live="polite"></p>

      <button type="submit" class="button button--primary" data-action="submit">${raw(claimed ? 'SAVE AMENDMENTS' : 'FILE THIS RECORD')}</button>
      <a class="button button--quiet" href="/f/${id}">CANCEL</a>
    </form>
  </main>
  <script src="/claim.js" defer></script>`;

  return htmlResponse(layout({
    title: `FPE-${id} — ${claimed ? 'AMEND' : 'REGISTER'}`,
    body,
    bodyClass: 'page-maker',
    mastLeft: `RECORD ${id} / ${String(SET_SIZE).padStart(4, '0')}`,
    mastRight: `FORM ${FORM.code}`,
  }), { headers: { 'cache-control': 'no-store' } });
}
