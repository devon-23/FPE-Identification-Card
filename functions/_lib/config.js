// Event constants. These are frozen into each record at claim time, so editing
// them later only affects records claimed after the change.

/**
 * Dates are written the way the archive writes them: the last three digits of
 * the year, the month as a numbered moon, then the day. 17 Oct 2026 becomes
 * "026 10MOON 17".
 */
export function demaDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '--- --MOON --';
  const p = (n) => String(n).padStart(2, '0');
  return `${String(d.getUTCFullYear()).slice(-3)} ${p(d.getUTCMonth() + 1)}MOON ${p(d.getUTCDate())}`;
}

export const EVENT = {
  venue: 'OHIO STATE UNIVERSITY',
  city: 'COLUMBUS, OH',
  date: '2026-10-17',            // ISO, used for comparisons
  get dateDisplay() { return demaDate(`${this.date}T00:00:00Z`); },
};

// Total number of FPE designations in the set.
export const SET_SIZE = 100;

// Letterhead and the bureaucratic furniture in the margins.
export const FORM = {
  code: 'D-17',
  statute: '15398642_14',
  revision: 'REV. 4',
  letterhead: 'SACRED MUNICIPALITY OF DEMA \u00b7 UNITED VIALISTS',
  bureau: 'DEMA ARCHIVES',
};
