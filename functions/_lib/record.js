import { h, raw, layout } from './html.js';
import {
  generate, assignedDesignation, ledgerRef,
  registryFile, docType, association, fileNotes, remark, recommendation, sighting, BISHOPS,
} from './lore.js';
import { renderCard, normalizeFaction, REDACTED } from './card.js';
import { EVENT, SET_SIZE, FORM, demaDate } from './config.js';
import { spread } from './html.js';

const padId = (n) => String(n).padStart(4, '0');

export function normalizeId(input) {
  if (input == null) return null;
  const v = String(input).trim().toUpperCase().replace(/^FPE[-_]?/, '');

  // made on demand rather than pre-seeded. X is somebody's first record, Y
  // their second, Z their third. there is no fourth. three digits until there
  // are more than 999 of them, then four, then five -- X001 and X0001 are the
  // same designation and both come back as X001
  const letter = v.match(/^([XYZ])(\d{3,6})$/);
  if (letter) {
    const n = parseInt(letter[2], 10);
    if (!(n >= 1 && n <= 99999)) return null;
    return `${letter[1]}${String(n).padStart(3, '0')}`;
  }

  const m = v.match(/^(\d{1,4})$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isInteger(n) || n < 1 || n > SET_SIZE) return null;
  return padId(n);
}

export const isSelfRegistered = (id) => /^[XYZ]\d{3,5}$/.test(String(id || ''));

function field(label, value) {
  return h`<div class="rf"><dt>${label}</dt><dd>${value}</dd></div>`;
}

const group = (rows) => `<div class="rf__group">${rows.filter(Boolean).join('')}</div>`;

function dossier(rec, rank) {
  // laid out like the character cards: label column, value column, rules
  // between the groups
  const g = generate(rec.id);
  const name = rec.name || assignedDesignation(rec.id);
  const faction = normalizeFaction(rec.faction);
  const bishop = rec.bishop && BISHOPS.indexOf(rec.bishop) !== -1 ? rec.bishop : g.bishop;

  const registry = group([
    field('REGISTRY FILE', registryFile(rec.id)),
    field('DESIGNATION', `FPE-${rec.id}`),
    field('DOCUMENT TYPE', docType(rec.id)),
  ]);

  const subject = group([
    field('NAME', name),
    field('CODE NAME', rec.handle ? `@${rec.handle}` : REDACTED),
    field('ASSOCIATION', `${faction} / ${association(rec.id)}`),
    field('ORIGIN', rec.hometown || REDACTED),
    field('FIRST BREACH', rec.first_show ? String(rec.first_show) : REDACTED),
    field('BISHOP', bishop),
  ]);

  // not used any more -- made the sheet way too long, and the venue and the
  // date are already printed on the card
  // const incident = group([
  //   field('DISTRICT', g.district),
  //   field('METHOD', g.method),
  //   field('LOCATION', `${rec.location || EVENT.venue}, ${rec.city || EVENT.city}`),
  //   field('DATE', showDate(rec.event_date)),
  //   rank ? field('ORDER OF FILING', `${ordinal(rank)} OF THE NIGHT`) : '',
  //   field('FILED', filedAt(rec.claimed_at)),
  //   field('DISPOSITION', g.disposition),
  // ]);

  const notes = rec.bio || fileNotes(rec.id, { hometown: rec.hometown, attempts: rec.attempts });
  const mark = rec.lyric || remark(rec.id);

  const notesBlock = h`<div class="rf__notes">
        <h3>FILE NOTES:</h3>
        <p>${notes}</p>
        <div class="rf"><dt class="rf__u">REMARK</dt><dd>${mark}</dd></div>
        <div class="rf"><dt class="rf__u">RECOMMENDATION</dt><dd>${recommendation(rec.id)}</dd></div>
      </div>`;

  // it used to be a <details> you had to tap open. it is the best half of
  // the record and half the people never found it, so it just sits open now
  //
  // return h`<details class="dossier">
  //     <summary class="dossier__head">ATTACHED FILE</summary>
  //     ...same innards...
  //   </details>`;

  return h`<section class="dossier dossier--open">
      <h2 class="dossier__head">ATTACHED FILE</h2>
      <div class="rf__sheet rf__sheet--${raw(faction.toLowerCase())}" data-sheet="${rec.id}">
        <span class="sheet__mark" aria-hidden="true"></span>
        ${raw(registry)}${raw(subject)}${raw(String(notesBlock))}
      </div>
      <p class="actions actions--sheet">
        <button class="button" type="button" data-action="save-sheet">SAVE ATTACHED FILE</button>
      </p>
    </section>`;
}

function ordinal(n) {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}TH`;
  return `${n}${['TH', 'ST', 'ND', 'RD'][n % 10] || 'TH'}`;
}

function showDate(stored) {
  if (stored && /^\d{4}-\d{2}-\d{2}/.test(stored)) return demaDate(stored);
  return EVENT.dateDisplay;
}

function filedAt(iso) {
  if (!iso) return '——';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '——';
  const p = (x) => String(x).padStart(2, '0');
  return `${demaDate(d)} · ${p(d.getUTCHours())}${p(d.getUTCMinutes())}`;
}

// same banner as the front page, dropped in above the back link
function restrictedBanner() {
  return h`<aside class="restricted restricted--inline">
      <img class="restricted__img" src="/images/restricted.webp"
           alt="RESTRICTED CONTENT. VIOLATION CODE ${FORM.violation}." width="1027" height="167">
      <p class="restricted__foot spread" data-plain="${FORM.benediction}">${raw(spread(FORM.benediction))}</p>
    </aside>`;
}

export function renderUnregistered(id, { claimingOpen = true, key = null, keyOk = false } = {}) {
  const card = renderCard({ id, status: 'UNREGISTERED' });
  let action;
  if (!claimingOpen) {
    action = raw('<p class="note">THE ARCHIVE IS NOT ACCEPTING SUBMISSIONS AT THIS TIME.</p>');
  } else if (keyOk) {
    action = h`<p class="actions"><a class="button button--primary button--flash" href="/f/${id}/register?k=${key}">REGISTER THIS ID</a></p>`;
  } else {
    action = raw('<p class="note">THIS DESIGNATION CAN ONLY BE REGISTERED FROM ITS OWN CARD. '
      + 'TAP THE CARD, OR ENTER THE FULL ADDRESS PRINTED ON IT.</p>');
  }

  // if this browser already holds a provisional record, offer to move it
  // onto the card instead of filing a second one. hidden until the script
  // finds a token, so it never flashes at somebody who has none
  const transfer = keyOk ? h`<section class="held" data-transfer data-target="${id}" data-key="${key}" hidden>
      <p class="held__head">LOOKS LIKE YOU ALREADY MADE A CARD.</p>
      <p class="held__body">EVERYTHING YOU WROTE BECOMES FPE-${id} AND THE PROVISIONAL
        RECORD GOES, SO YOU ARE IN THE REGISTER ONCE. PICK WHICH ONE MOVES.</p>
      <ul class="held__list held__list--pick" data-held-list></ul>
      <button class="button button--primary button--flash" type="button" data-action="transfer">TRANSFER TO THIS CARD</button>
      <button class="button button--quiet" type="button" data-action="anyway">START A NEW RECORD INSTEAD</button>
      <p class="form__status" role="status" aria-live="polite"></p>
    </section>` : '';

  const body = h`  <main class="stage">
    ${raw(card)}
    <p class="note">THIS DESIGNATION HAS NOT BEEN CLAIMED.<br>THE FIRST SUBJECT TO REGISTER HOLDS IT.</p>
    ${raw(String(transfer))}
    <div data-held-hide>${raw(String(action))}</div>
  </main>
  ${raw(keyOk ? '<script src="/held.js" defer></script><script src="/transfer.js" defer></script>' : '')}`;
  return layout({
    title: `FPE-${id} — UNREGISTERED`, body, bodyClass: 'page-record',
  });
}

function civilNotice(rec) {
  // tnotice
  const name = rec.name || assignedDesignation(rec.id);
  const ref = ledgerRef(rec.id);
  return h`<section class="notice">
      <p class="notice__body"><b>CIVIL NOTICE:</b> in accordance with Dema Law Sec. A-77.03: All
        persons found to be in possession of knowledge of the whereabouts,
        communication or prior contact with Subject ${name} must immediately submit
        form V-14-8 to their assigned congregation desk. Failure to comply constitutes
        civil treason.</p>

      <div class="notice__cols">
        <div class="notice__col">
          <h3>REPORT CLASSIFICATION:</h3>
          <p>PENDING ESCALATION &mdash; INTERNAL SECURITY COUNCIL REVIEW</p>
          <p>Filed by: UNITED VIALISTS / DIV, OF CIVIL ORDER AND RESTRAINT</p>
          <p>Archived In: Municipal Ledger ${ref.ledger} / Vault ${ref.vault}</p>
        </div>
        <div class="notice__col">
          <h3>DESIGNATED INCIDENT SENTIMENT</h3>
          <p class="notice__quote">&ldquo;All earthly honor unto the glorious gone. Let
            their ash mark the path of those who resain&rdquo;</p>
        </div>
      </div>
    </section>`;
}

// only when they gave an origin. the count is how many other subjects came
// out of the same town, which the route works out
function sightingLog(rec, others) {
  const line = sighting(rec.id, { hometown: rec.hometown, others });
  if (!line) return '';
  return h`<section class="seen">
      <h3 class="seen__head">SIGHTING LOG</h3>
      <p class="seen__body">${line}</p>
      <a class="sighting" href="/from-here?at=${rec.id}">BANDITO SIGHTINGS &mdash;&mdash;&mdash;&gt;</a>
    </section>`;
}

export function renderRecord(rec, { rank = null, others = 0 } = {}) {
  const name = rec.name || assignedDesignation(rec.id);
  const card = renderCard(rec);

  const assignedNote = rec.name_assigned
    ? '<p class="note">SUBJECT DECLINED TO IDENTIFY. DESIGNATION ASSIGNED.</p>'
    : '';

  const body = h`  <main class="stage" data-fpe="${rec.id}">
    ${raw(card)}
    ${raw(assignedNote)}
    <p class="actions">
      <button class="button button--primary" type="button" data-action="save">SAVE CARD</button>
      <a class="button" href="/f/${rec.id}/register" data-owner-only hidden>AMEND RECORD</a>
    </p>
    ${raw(civilNotice(rec))}
    ${raw(String(sightingLog(rec, others)))}
    ${raw(dossier(rec, rank))}
    ${raw(restrictedBanner())}
  </main>
  <script src="/record.js" defer></script>`;

  return layout({
    title: `FPE-${rec.id} — ${name}`, body, bodyClass: 'page-record',
  });
}

export function renderNotFound() { // same as dmaorg site
  const body = h`  <main class="stage void">
    <p class="void__code">404 ER_ROR</p>
    <p class="void__body">you are in violation. thEy mustn't know you were here. no one should ever find out About this. you can never tell anyone about thiS &mdash; for The sake of the others' survIval, you muSt keep this silent. we mUst keeP silent. no one can know. no one can know. no o&nbsp;ne c an kn ow_</p>
    <p class="void__ref">(Violation Code. ${FORM.statute})</p>
  </main>`;
  return layout({ title: '404 ER_ROR', body, bodyClass: 'page-void' });
}
