import { h, raw, layout, htmlResponse } from '../../_lib/html.js';
import { normalizeId } from '../../_lib/record.js';
import { renderCard, normalizeFaction } from '../../_lib/card.js';
import { BISHOPS, generate } from '../../_lib/lore.js';
import { getRecord, getSetting } from '../../_lib/db.js';
import { keyMatches } from '../../_lib/auth.js';
import { NAME_MAX, HANDLE_MAX, HOMETOWN_MAX, BIO_MAX, ATTEMPTS_MAX, LYRIC_MAX, FIRST_SHOW_MIN, FIRST_SHOW_MAX } from '../../_lib/sanitize.js';
import { SET_SIZE, FORM } from '../../_lib/config.js';

export async function onRequestGet({ request, params, env }) {
  const id = normalizeId(params.id);
  if (!id) return Response.redirect(new URL('/', request.url).toString(), 302);

  const rec = await getRecord(env.DB, id);
  if (!rec) return Response.redirect(new URL('/', request.url).toString(), 302);

  const claimed = rec.status === 'ESCAPED';
  const claimingOpen = (await getSetting(env.DB, 'claiming_open', '0')) === '1';

  if (!claimed && !claimingOpen) {
    return Response.redirect(new URL(`/f/${id}`, request.url).toString(), 302);
  }

  const key = new URL(request.url).searchParams.get('k') || '';
  if (!claimed && !(await keyMatches(rec, key))) {
    return Response.redirect(new URL(`/f/${id}`, request.url).toString(), 302);
  }

  const card = renderCard(claimed ? rec : { id, status: 'UNREGISTERED' }, { preview: true });

  const canPublishPhotos = !!env.PHOTOS;

  const v = claimed ? rec : {};
  const val = (x) => (x === null || x === undefined ? '' : String(x));

  const assigned = generate(id).bishop;
  const chosen = (claimed && rec.bishop) || assigned;

  const body = h`  <main class="stage maker" data-fpe="${id}" data-mode="${raw(claimed ? 'amend' : 'claim')}" data-photos="${raw(canPublishPhotos ? 'server' : 'device')}">
    ${raw(card)}

    <noscript><p class="note">THIS FORM REQUIRES SCRIPTING. THE RECORD ITSELF DOES NOT —
      RETURN TO <a href="/f/${id}">FPE-${id}</a> TO READ IT.</p></noscript>

    <form class="form" id="maker" novalidate hidden data-key="${key}">
      <h2 class="form__head">${raw(claimed ? 'AMEND RECORD' : 'IDENTIFICATION')}</h2>

      <div class="form__row">
        <label class="form__label" for="name">NAME OR ALIAS <span>OPTIONAL</span></label>
        <input class="form__input" id="name" name="name" type="text"
               maxlength="${String(NAME_MAX)}" autocomplete="off" autocapitalize="characters"
               spellcheck="false" enterkeyhint="done" placeholder="LEAVE BLANK TO BE ASSIGNED ONE"
               value="${val(v.name)}">
      </div>

      <div class="form__row">
        <label class="form__label" for="attempts">HOW MANY SHOWS HAVE YOU ATTENDED? <span>OPTIONAL</span></label>
        <input class="form__input" id="attempts" name="attempts" type="number"
               inputmode="numeric" min="1" max="${String(ATTEMPTS_MAX)}" step="1"
               autocomplete="off" placeholder="1" value="${val(v.attempts)}">
      </div>

      <div class="form__row">
        <label class="form__label" for="firstShow">WHAT YEAR WAS YOUR FIRST SHOW? <span>OPTIONAL</span></label>
        <input class="form__input" id="firstShow" name="firstShow" type="number"
               inputmode="numeric" min="${String(FIRST_SHOW_MIN)}" max="${String(FIRST_SHOW_MAX)}" step="1"
               autocomplete="off" placeholder="2019" value="${val(v.first_show)}">
      </div>

      <div class="form__row">
        <label class="form__label" for="bishop">BISHOP ASSIGNED</label>
        <select class="form__input form__select" id="bishop" name="bishop">
          ${raw(BISHOPS.map((b) => `<option value="${b}"${b === chosen ? ' selected' : ''}>${b}</option>`).join(''))}
        </select>
      </div>

      <div class="form__row">
        <label class="form__label" for="handle">HANDLE <span>OPTIONAL &middot; INSTAGRAM, X, ANYWHERE</span></label>
        <input class="form__input form__input--plain" id="handle" name="handle" type="text"
               maxlength="${String(HANDLE_MAX)}" autocomplete="off" autocapitalize="off"
               spellcheck="false" placeholder="@YOURHANDLE" value="${val(v.handle)}">
      </div>

      <div class="form__row">
        <label class="form__label" for="hometown">HOMETOWN <span>OPTIONAL</span></label>
        <input class="form__input" id="hometown" name="hometown" type="text"
               maxlength="${String(HOMETOWN_MAX)}" autocomplete="off" autocapitalize="characters"
               placeholder="CITY, STATE" value="${val(v.hometown)}">
      </div>

      <div class="form__row">
        <label class="form__label" for="lyric">A LINE THAT MEANS SOMETHING <span>OPTIONAL</span></label>
        <input class="form__input form__input--plain" id="lyric" name="lyric" type="text"
               maxlength="${String(LYRIC_MAX)}" autocomplete="off"
               placeholder="PRINTED ON THE CARD" value="${val(v.lyric)}">
      </div>

      <div class="form__row">
        <label class="form__label" for="bio">STATEMENT <span>OPTIONAL &middot; ${String(BIO_MAX)} CHARACTERS</span></label>
        <textarea class="form__input form__area" id="bio" name="bio" rows="2"
                  maxlength="${String(BIO_MAX)}" autocomplete="off"
                  placeholder="ANYTHING YOU WANT ON THE RECORD">${val(v.bio)}</textarea>
      </div>

      <fieldset class="form__row form__fieldset">
        <legend class="form__label">ALLEGIANCE DECLARED</legend>
        <div class="toggle">
          <input type="radio" name="faction" id="f-citizen" value="CITIZEN"${raw(normalizeFaction(v.faction) === 'BANDITO' ? '' : ' checked')}>
          <label for="f-citizen">CITIZEN</label>
          <input type="radio" name="faction" id="f-bandito" value="BANDITO"${raw(normalizeFaction(v.faction) === 'BANDITO' ? ' checked' : '')}>
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

      <p class="note">ANYTHING YOU LEAVE BLANK IS FILED AS [REDACTED].</p>

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
  }), { headers: { 'cache-control': 'no-store' } });
}
