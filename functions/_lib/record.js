import { h, raw, layout } from './html.js';
import { generate, assignedDesignation, ledgerRef } from './lore.js';
import { renderCard, normalizeFaction, REDACTED } from './card.js';
import { EVENT, SET_SIZE, FORM, demaDate } from './config.js';
import { spread } from './html.js';

export const padId = (n) => String(n).padStart(4, '0');

/** '42', '0042', 'FPE-0042' -> '0042'. Returns null if not a valid designation. */
export function normalizeId(input) {
  if (input == null) return null;
  const m = String(input).trim().toUpperCase().match(/^(?:FPE[-_]?)?(\d{1,4})$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isInteger(n) || n < 1 || n > SET_SIZE) return null;
  return padId(n);
}

function field(label, value) {
  return h`<div class="field"><dd>${value}</dd><dt>${label}</dt></div>`;
}

/**
 * The attached file. Collapsed by default: the card is the thing people came
 * for, and this is the paperwork behind it.
 */
function dossier(rec, rank) {
  const g = generate(rec.id);
  const rows = [
    field('ALIAS', rec.handle ? `@${rec.handle}` : REDACTED),
    field('HOMETOWN', rec.hometown || REDACTED),
    field('FIRST BREACH', rec.first_show ? String(rec.first_show) : REDACTED),
    field('STATEMENT', rec.bio || REDACTED),
    field('DISTRICT', g.district),
    field('METHOD', g.method),
    field('ALLEGIANCE DECLARED', normalizeFaction(rec.faction)),
    field('ESCAPE LOCATION', `${rec.location || EVENT.venue}, ${rec.city || EVENT.city}`),
    field('ESCAPE DATE', rec.event_date || EVENT.dateDisplay),
    field('DISPOSITION', g.disposition),
    field('RECORD FILED', filedAt(rec.claimed_at)),
  ];
  if (rank) {
    rows.splice(7, 0, field('ORDER OF FILING', `${ordinal(rank)} OF THE NIGHT`));
  }
  return h`<details class="dossier">
      <summary class="dossier__head">ATTACHED FILE</summary>
      <dl class="fields">${raw(rows.join(''))}</dl>
    </details>`;
}

function ordinal(n) {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}TH`;
  return `${n}${['TH', 'ST', 'ND', 'RD'][n % 10] || 'TH'}`;
}

function filedAt(iso) {
  if (!iso) return '——';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '——';
  const p = (x) => String(x).padStart(2, '0');
  return `${demaDate(d)} · ${p(d.getUTCHours())}${p(d.getUTCMinutes())}`;
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
  </main>`;
  return layout({
    title: `FPE-${id} — UNREGISTERED`, body, bodyClass: 'page-record',
  });
}

/**
 * The paperwork that follows a filed record. Written in the register's own
 * degraded hand, the way the scans read.
 */
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
    ${raw(dossier(rec, rank))}
    ${raw(civilNotice(rec))}
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
