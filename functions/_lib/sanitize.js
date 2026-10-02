export const NAME_MAX = 28;

// Codepoints that must never reach a public card: C0/C1 controls, zero-width
// and bidi-override characters (which can visually reorder a name), and BOM.
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

/**
 * Names are displayed on a public card, so: no control or direction-bending
 * characters, no runaway length, collapsed whitespace. Returns '' for an empty
 * submission, which the caller treats as "assign a designation".
 */
export function cleanName(input) {
  if (typeof input !== 'string') return '';
  let out = '';
  for (const ch of input) {
    if (!isForbidden(ch.codePointAt(0))) out += ch;
  }
  return out.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}
