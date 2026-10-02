// Deterministic record detail generation.
//
// Every generated field is a pure function of the designation, so FPE-0042
// always reports the same bishop, sector and method -- on every device, before
// and after it is claimed, forever. Nothing here touches the database.

// Listed in the order they sit around the city, starting with the section
// centred at the top and running clockwise. glyph.js lights by index, so this
// array *is* the map of the city.
const BISHOPS = [
  'LISDEN', 'KEONS', 'REISDRO', 'SACARVER', 'LISTO',
  'VETOMO', 'NILLS', 'NICO', 'ANDRE',
];

const METHODS = [
  'WALL BREACH — SECTION UNRECORDED',
  'CONCEALMENT IN OUTBOUND CARGO',
  'DEPARTURE DURING ASSEMBLY',
  'PURSUED ON FOOT INTO THE EAST',
  'ASSISTED — PARTIES UNIDENTIFIED',
  'DESCENT, UNSUPERVISED',
  'UNDOCUMENTED — SEE ATTACHED (ATTACHMENT MISSING)',
  'VEHICULAR, UNREGISTERED TRANSPORT',
  'METHOD NOT OBSERVED',
  'SUBJECT WAS SIMPLY NOT PRESENT',
];

const DISPOSITIONS = [
  'PERIMETER NOT RESTORED',
  'RECOVERY PENDING',
  'FILE RETAINED FOR REVIEW',
  'NO FURTHER ACTION RECORDED',
  'SUBJECT UNACCOUNTED FOR',
];

// FNV-1a. Small, fast, stable across runtimes -- which is the only property
// that matters here. Not used for anything security-related.
function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

const pick = (list, seed) => list[hash(seed) % list.length];

// A redaction block, sized deterministically so it looks hand-struck rather
// than uniform.
export function redact(seed, min = 6, max = 11) {
  return '█'.repeat(min + (hash('redact' + seed) % (max - min + 1)));
}

/**
 * The citizen number carried on the card. Derived from the designation rather
 * than stored: the same number every time, on every device, with no column.
 */
export function citizenId(id) {
  const a = hash('cid-a' + id) % 900000000 + 100000000;   // always nine digits
  const b = hash('cid-b' + id) % 90 + 10;                 // always two
  return `${a}_${b}`;
}

// Assigned when a claimant leaves the name field blank.
export function assignedDesignation(id) {
  const letters = 'ABCDEFGHJKLMNPRSTVWXYZ'; // no I/O/Q/U -- ambiguous in print
  const a = letters[hash('desA' + id) % letters.length];
  const b = letters[hash('desB' + id) % letters.length];
  return `SUBJECT ${id}-${a}${b}`;
}

export function generate(id) {
  const district = 1 + (hash('district' + id) % 9);
  const sectorNum = String(1 + (hash('sector' + id) % 24)).padStart(2, '0');
  const bearing = ['N', 'NE', 'E', 'SE', 'S'][hash('bearing' + id) % 5];

  // Roughly one record in four has its sector struck from the file.
  const sectorRedacted = hash('sredact' + id) % 4 === 0;

  const bishopIdx = hash('bishop' + id) % BISHOPS.length;

  return {
    bishopIdx,
    district: `0${district}`,
    sector: sectorRedacted ? redact(id) : `S-${sectorNum}-${bearing}`,
    bishop: BISHOPS[bishopIdx],
    attempt: String(1 + (hash('attempt' + id) % 4)).padStart(2, '0'),
    method: pick(METHODS, 'method' + id),
    disposition: pick(DISPOSITIONS, 'disp' + id),
  };
}

export { BISHOPS, METHODS, DISPOSITIONS };
