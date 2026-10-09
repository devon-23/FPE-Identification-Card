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

// whether somebody filing right now is almost certainly in the room, or was
// an hour ago. the calendar day is not enough on its own -- the show ends
// near eleven and a lot of this gets filled in on the way home, by which
// point the date has already rolled over
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
