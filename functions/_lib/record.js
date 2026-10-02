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
  const m = String(input).trim().toUpperCase().match(/^(?:FPE[-_]?)?(\d{1,4})$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isInteger(n) || n < 1 || n > SET_SIZE) return null;
  return padId(n);
}

function field(label, value) {
  return h`<div class="rf"><dt>${label}</dt><dd>${value}</dd></div>`;
}

const group = (rows) => `<div class="rf__group">${rows.filter(Boolean).join('')}</div>`;

function dossier(rec, rank) {
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

  const incident = group([
    field('DISTRICT', g.district),
    field('METHOD', g.method),
    field('LOCATION', `${rec.location || EVENT.venue}, ${rec.city || EVENT.city}`),
    field('DATE', showDate(rec.event_date)),
    rank ? field('ORDER OF FILING', `${ordinal(rank)} OF THE NIGHT`) : '',
    field('FILED', filedAt(rec.claimed_at)),
    field('DISPOSITION', g.disposition),
  ]);

  // their own words if they gave any, otherwise the registry writes its own
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
      <div class="rf__sheet">
        ${raw(registry)}${raw(subject)}${raw(incident)}${raw(String(notesBlock))}
      </div>
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

function returnLink() {
  return h`<p class="backlink"><a href="/">&larr; INCIDENT REPORT ${FORM.statute}</a></p>`;
}

export function renderUnregistered(id, { claimingOpen = true } = {}) {
  const card = renderCard({ id, status: 'UNREGISTERED' });
  const action = claimingOpen
    ? h`<p class="actions"><a class="button button--primary" href="/f/${id}/register">REGISTER THIS ID</a></p>`
    : raw('<p class="note">THE ARCHIVE IS NOT ACCEPTING SUBMISSIONS AT THIS TIME.</p>');

  const body = h`  <main class="stage">
    ${raw(card)}
    <p class="note">THIS DESIGNATION HAS NOT BEEN CLAIMED.<br>THE FIRST SUBJECT TO REGISTER HOLDS IT.</p>
    ${raw(String(action))}
    ${raw(returnLink())}
  </main>`;
  return layout({
    title: `FPE-${id} — UNREGISTERED`, body, bodyClass: 'page-record',
  });
}

function civilNotice(rec) {
  const name = rec.name || assignedDesignation(rec.id);
  const ref = ledgerRef(rec.id);
  return h`<section class="notice">
      <p class="notice__body"><b>CIVIL NOTICE:</b> in mcordance wh Dema Lew Sec. A-77.03
        persons found to be in possession of knowindne reseroine the whereabouts,
        communication or prior contact with Subject ${name} must immediately subeil
        form V-14-8 el their assigned congreggion desk. Falure to comply constitutes
        civil treason.</p>

      <div class="notice__cols">
        <div class="notice__col">
          <h3>REPORT CLASSIFICATION:</h3>
          <p>PENDING ESCALATION &mdash; INTERNAL SECURITY COUNCIL REVIEV</p>
          <p>Filed by: UNITED VIALISTS / OIV, OF CIVIL ORDER AND RESTRAIKT</p>
          <p>Archived In: Municioal Ledger ${ref.ledger} / Vault ${ref.vault}</p>
        </div>
        <div class="notice__col">
          <h3>DESIGNATED INCIDENT SENTIMENT</h3>
          <p class="notice__quote">&ldquo;All eactely honor unto the glorious gone. Let
            their ash mark the path of those who resain&rdquo;</p>
        </div>
      </div>

      <p class="notice__tag spread" data-plain="${FORM.benediction}">${raw(spread(FORM.benediction))}</p>
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
    ${raw(returnLink())}
  </main>
  <script src="/record.js" defer></script>`;

  return layout({
    title: `FPE-${rec.id} — ${name}`, body, bodyClass: 'page-record',
  });
}

export function renderNotFound(label) {
  const body = h`  <main class="stage">
    <p class="kicker">ARCHIVE QUERY</p>
    <p class="designation">${label || '————'}</p>
    <p class="note">THE REQUESTED DESIGNATION IS NOT HELD IN THIS ARCHIVE.</p>
  </main>`;
  return layout({ title: 'NO SUCH RECORD', body, bodyClass: 'page-record' });
}
