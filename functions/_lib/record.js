import { h, raw, layout } from './html.js';
import { generate, assignedDesignation } from './lore.js';
import { EVENT, SET_SIZE } from './config.js';

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

function field(label, value, extraClass = '') {
  return h`<div class="field ${raw(extraClass)}">
      <dt>${label}</dt>
      <dd>${value}</dd>
    </div>`;
}

export function renderUnregistered(id) {
  const body = h`  <main class="record record--unregistered">
    <p class="kicker">FAILED PERIMETER ESCAPE</p>
    <p class="designation">FPE-${id}</p>
    <dl class="fields">
      ${raw(field('STATUS', 'UNREGISTERED', 'field--status'))}
    </dl>
    <p class="note">THIS RECORD HAS NOT YET BEEN CLAIMED.</p>
    <p class="actions"><a class="button" href="/f/${id}/register">REGISTER THIS ID</a></p>
  </main>`;
  return layout({ title: `FPE-${id} — UNREGISTERED`, body, bodyClass: 'page-record' });
}

export function renderRecord(rec) {
  const g = generate(rec.id);
  const name = rec.name || assignedDesignation(rec.id);

  const parts = [
    field('NAME', name, rec.name_assigned ? 'field--assigned' : ''),
    field('STATUS', 'ESCAPED', 'field--status'),
    field('DISTRICT', g.district),
    field('SECTOR', g.sector),
    field('ESCAPE ATTEMPT', g.attempt),
    field('METHOD', g.method),
    field('BISHOP ASSIGNED', g.bishop),
    field('ESCAPE LOCATION', rec.location || EVENT.venue),
    field('', rec.city || EVENT.city, 'field--cont'),
    field('ESCAPE DATE', rec.event_date || EVENT.dateDisplay),
    field('DISPOSITION', g.disposition),
    field('CLEARANCE', g.clearance),
  ];

  const assignedNote = rec.name_assigned
    ? '<p class="note">SUBJECT DECLINED TO IDENTIFY. DESIGNATION ASSIGNED.</p>'
    : '';

  const body = h`  <main class="record record--filed">
    <p class="kicker">FAILED PERIMETER ESCAPE</p>
    <p class="designation">FPE-${rec.id}</p>
    <dl class="fields">
      ${raw(parts.join('\n      '))}
    </dl>
    ${raw(assignedNote)}
    <p class="standing">IF FOUND, RETURN TO DEMA.<br>DO NOT TRUST THE BISHOPS.</p>
  </main>`;

  return layout({ title: `FPE-${rec.id} — ${name}`, body, bodyClass: 'page-record' });
}

export function renderNotFound(label) {
  const body = h`  <main class="record record--void">
    <p class="kicker">ARCHIVE QUERY</p>
    <p class="designation">${label || '————'}</p>
    <dl class="fields">
      ${raw(field('STATUS', 'NO SUCH RECORD', 'field--status'))}
    </dl>
    <p class="note">THE REQUESTED DESIGNATION IS NOT HELD IN THIS ARCHIVE.</p>
  </main>`;
  return layout({ title: 'NO SUCH RECORD', body, bodyClass: 'page-record' });
}
