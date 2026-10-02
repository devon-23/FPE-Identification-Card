import { h, raw, layout } from './html.js';
import { generate, assignedDesignation } from './lore.js';
import { renderCard, normalizeFaction, REDACTED } from './card.js';
import { EVENT, SET_SIZE, FORM, demaDate } from './config.js';

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
  return h`<div class="field"><dt>${label}</dt><dd>${value}</dd></div>`;
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
    mastLeft: `RECORD ${id} / ${padId(SET_SIZE)}`, mastRight: `FORM ${FORM.code}`,
  });
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
  </main>
  <script src="/record.js" defer></script>`;

  return layout({
    title: `FPE-${rec.id} — ${name}`, body, bodyClass: 'page-record',
    mastLeft: `RECORD ${rec.id} / ${padId(SET_SIZE)}`, mastRight: `FORM ${FORM.code}`,
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
