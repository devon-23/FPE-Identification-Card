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

// the link goes out weeks before the doors and stays up for good, so the
// box cannot read "i was there" the whole time. columbus keeps us eastern,
// and the show day itself is the one that matters -- not utc, which rolls
// over while the encore is still going
function showDay() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

export function showTense() {
  const today = showDay();
  if (today < EVENT.date) return 'before';
  if (today > EVENT.date) return 'after';
  return 'during';
}

// what the checkbox calls itself, in whichever tense is true today
export function showPledge() {
  const t = showTense();
  if (t === 'before') return 'I\u2019M GOING TO THE OSU SHOW.';
  if (t === 'during') return 'I\u2019M AT THE OSU SHOW.';
  return 'I WAS AT THE OSU SHOW.';
}

// what rides along on a share. no leading hashes -- the intent link wants
// them bare and the share sheet gets them added back
export const SHARE_TAGS = ['IdentificationCard', 'osuTOP', 'TwentyOnePilots'];

export const SET_SIZE = 100;

export const FORM = {
  code: 'D-17',
  statute: '15398642_14',
  revision: 'REV. 4',
  letterhead: 'SACRED MUNICIPALITY OF DEMA · UNITED VIALISTS',
  benediction: 'ALL EARTHLY HONOR UNTO THE GLORIOUS GONE',
  violation: 'DMA-8325',
};
