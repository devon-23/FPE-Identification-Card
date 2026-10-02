export function demaDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '--- --MOON --';
  const p = (n) => String(n).padStart(2, '0');
  return `${String(d.getUTCFullYear()).slice(-3)} ${p(d.getUTCMonth() + 1)}MOON ${p(d.getUTCDate())}`;
}

export const EVENT = {
  venue: 'OHIO STATE UNIVERSITY',
  city: 'COLUMBUS, OH',
  date: '2026-10-17',
  get dateDisplay() { return demaDate(`${this.date}T00:00:00Z`); },
};

export const SET_SIZE = 100;

export const FORM = {
  code: 'D-17',
  statute: '15398642_14',
  revision: 'REV. 4',
  letterhead: 'SACRED MUNICIPALITY OF DEMA · UNITED VIALISTS',
  benediction: 'ALL EARTHLY HONOR UNTO THE GLORIOUS GONE',
  violation: 'DMA-8325',
};
