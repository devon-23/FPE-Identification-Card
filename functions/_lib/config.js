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

function eastern() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (t) => (parts.find((p) => p.type === t) || {}).value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) };
}

export function showTense() {
  const { date } = eastern();
  if (date < EVENT.date) return 'before';
  if (date > EVENT.date) return 'after';
  return 'during';
}

const nextDay = (iso) => new Date(Date.parse(`${iso}T12:00:00Z`) + 86400000)
  .toISOString().slice(0, 10);

// the show ends near eleven and half of this gets filled in on the bus home,
// by which point the date has rolled over. so the window runs past midnight
export function duringShowWindow() {
  const { date, hour } = eastern();
  if (date === EVENT.date) return true;
  return date === nextDay(EVENT.date) && hour < 6;
}

// what the checkbox calls itself, in whichever tense is true today
export function showPledge() {
  const t = showTense();
  if (t === 'before') return 'I\u2019M GOING TO THE OSU SHOW.';
  if (t === 'during') return 'I\u2019M AT THE OSU SHOW.';
  return 'I WAS AT THE OSU SHOW.';
}

// no leading hashes, the share sheet adds them back
export const SHARE_TAGS = ['FPECard'];

// og:image has to be absolute, and the request origin would leak preview urls
export const SITE = 'https://fpe-archive.pages.dev';

export const SET_SIZE = 100;

export const FORM = {
  code: 'D-17',
  statute: '15398642_14',
  revision: 'REV. 4',
  letterhead: 'SACRED MUNICIPALITY OF DEMA · UNITED VIALISTS',
  benediction: 'ALL EARTHLY HONOR UNTO THE GLORIOUS GONE',
  violation: 'DMA-8325',
};
