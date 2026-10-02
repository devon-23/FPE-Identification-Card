export const NAME_MAX     = 28;
export const HANDLE_MAX   = 30;
export const HOMETOWN_MAX = 28;
export const BIO_MAX      = 90;
export const ATTEMPTS_MAX = 99;
export const LYRIC_MAX    = 60;
export const FIRST_SHOW_MIN = 2009;   // the first album year
export const FIRST_SHOW_MAX = 2030;

// Codepoints that must never reach a public card: C0/C1 controls, zero-width
// and bidi-override characters (which can visually reorder text), and BOM.
function isForbidden(cp) {
  return (
    cp < 0x20 ||
    (cp >= 0x7f && cp <= 0x9f) ||
    (cp >= 0x200b && cp <= 0x200f) ||
    (cp >= 0x202a && cp <= 0x202e) ||
    (cp >= 0x2066 && cp <= 0x2069) ||
    cp === 0x2028 || cp === 0x2029 || cp === 0xfeff
  );
}

function clean(input, max) {
  if (typeof input !== 'string') return '';
  let out = '';
  for (const ch of input) {
    if (!isForbidden(ch.codePointAt(0))) out += ch;
  }
  return out.replace(/\s+/g, ' ').trim().slice(0, max);
}
export const cleanName     = (v) => clean(v, NAME_MAX);
export const cleanHometown = (v) => clean(v, HOMETOWN_MAX);
export const cleanBio      = (v) => clean(v, BIO_MAX);
export const cleanLyric    = (v) => clean(v, LYRIC_MAX);
export function cleanHandle(input) {
  const bare = clean(input, HANDLE_MAX + 1).replace(/^@+/, '');
  const kept = bare.replace(/[^A-Za-z0-9._]/g, '');
  return kept.slice(0, HANDLE_MAX);
}
export function cleanBishop(input, bishops) {
  const v = String(input == null ? '' : input).trim().toUpperCase();
  return bishops.indexOf(v) === -1 ? null : v;
}
export function cleanFirstShow(input) {
  const n = parseInt(String(input == null ? '' : input).trim(), 10);
  if (!Number.isFinite(n) || n < FIRST_SHOW_MIN || n > FIRST_SHOW_MAX) return null;
  return n;
}
export function cleanAttempts(input) {
  const n = parseInt(String(input == null ? '' : input).trim(), 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(n, ATTEMPTS_MAX);
}
