import { h, raw, layout } from './html.js';
import {
  generate, assignedDesignation, ledgerRef,
  registryFile, docType, association, fileNotes, remark, recommendation, BISHOPS,
} from './lore.js';
import { renderCard, normalizeFaction, REDACTED } from './card.js';
import { EVENT, SET_SIZE, FORM, demaDate } from './config.js';
import { spread } from './html.js';

const padId = (n) => String(n).padStart(4, '0');

export function normalizeId(input) {
  if (input == null) return null;
  const v = String(input).trim().toUpperCase().replace(/^FPE[-_]?/, '');

  // self-registered: X001, X002... these are made on demand, not pre-seeded. all beginging with x
  const x = v.match(/^X(\d{3})$/);
  if (x) {
    const n = parseInt(x[1], 10);
    return n >= 1 && n <= 999 ? `X${x[1]}` : null;
  }

  // origin-only, off the map page. Y001 upwards, same shape as the X ones
  const y = v.match(/^Y(\d{3})$/);
  if (y) {
    const n = parseInt(y[1], 10);
    return n >= 1 && n <= 999 ? `Y${y[1]}` : null;
  }

  const m = v.match(/^(\d{1,4})$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isInteger(n) || n < 1 || n > SET_SIZE) return null;
  return padId(n);
}

export const isSelfRegistered = (id) => /^(?:X|Y)\d{3}$/.test(String(id || ''));

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

  return h`<details class="dossier">
      <summary class="dossier__head">ATTACHED FILE</summary>
      <div class="rf__sheet rf__sheet--${raw(faction.toLowerCase())}" data-sheet="${rec.id}">
        <span class="sheet__mark" aria-hidden="true"></span>
        ${raw(registry)}${raw(subject)}${raw(String(notesBlock))}
      </div>
      <p class="actions actions--sheet">
        <button class="button" type="button" data-action="save-sheet">SAVE ATTACHED FILE</button>
      </p>
    </details>`;
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

  const body = h`  <main class="stage">
    ${raw(card)}
    <p class="note">THIS DESIGNATION HAS NOT BEEN CLAIMED.<br>THE FIRST SUBJECT TO REGISTER HOLDS IT.</p>
    ${raw(String(action))}
  </main>`;
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

export function renderRecord(rec, { rank = null } = {}) {
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
