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

const DOC_TYPES = [
  'PERSONNEL STABILITY INDEX',
  'CHARACTER DEVIATION REPORT',
  'PERIMETER INCIDENT RECORD',
  'CIVIL CONTAINMENT FILE',
  'SUBJECT CONDUCT SUMMARY',
];

const REMARKS = [
  'A LIGHT THAT DOES NOT DIM',
  'UNACCOUNTED FOR',
  'VERIFIED DEPARTURE',
  'NO LONGER WITHIN THE WALL',
  'SINGS WHERE SINGING IS NOT PERMITTED',
  'KNOWN TO OTHERS',
  'SPEAKS OF THE EAST',
];

const RECOMMENDATIONS = [
  'MONITOR. DO NOT OBSTRUCT.',
  'OBSERVE CLOSELY. SANCTION UNADVISED.',
  'NO FURTHER PURSUIT AUTHORISED.',
  'RECORD AND RELEASE.',
  'CONTAINMENT IMPRACTICAL. FILE RETAINED.',
  'REFER TO DISTRICT COUNCIL.',
];

const NOTE_OPENERS = [
  'SUBJECT DEPARTED THE PERIMETER WITHOUT SANCTION AND HAS NOT RETURNED.',
  'SUBJECT WAS RECORDED OUTSIDE THE BOUNDARY AND DECLINED RECOVERY.',
  'SUBJECT CROSSED DURING ASSEMBLY AND WAS NOT INTERCEPTED.',
  'SUBJECT IS KNOWN TO HAVE LEFT BY MEANS NOT YET ESTABLISHED.',
];

const NOTE_BEHAVIOUR = [
  'DISPLAYS NO SIGNS OF DEVIATION FROM OBJECTIVE.',
  'MAINTAINS CONTACT WITH PARTIES OUTSIDE THE WALL.',
  'SHOWS NO INTENTION OF RETURNING TO ASSIGNED DISTRICT.',
  'OBSERVED IN COORDINATED VOCALISATION OF PROHIBITED MATERIAL.',
  'CONSIDERED HARMLESS BY VIALIST STANDARDS, YET PERSISTENTLY INFLUENTIAL.',
];

const NOTE_CLOSERS = [
  'RECOVERY IS NOT EXPECTED.',
  'PRESENCE MAY INVOKE REBELLION IN ADJACENT SECTORS.',
  'FILE REMAINS OPEN AT THE DISCRETION OF THE COUNCIL.',
  'FURTHER OBSERVATION ADVISED.',
  'THE WALL IS UNCHANGED. THE SUBJECT IS NOT.',
];

/** The registry reference printed at the head of the attached file. */
export function registryFile(id) {
  const letters = 'ABCDEFGHJKLMNPRSTVWXYZ';
  const a = String(1 + (hash('regA' + id) % 12)).padStart(2, '0');
  const b = String(hash('regB' + id) % 1000).padStart(3, '0');
  const c = 1 + (hash('regC' + id) % 9);
  const d = letters[hash('regD' + id) % letters.length];
  const e = letters[hash('regE' + id) % letters.length];
  return `${a}.${b}-${c}-${d}${e}`;
}

/** A dossier paragraph assembled from fixed parts, stable per designation. */
export function fileNotes(id, { hometown, attempts } = {}) {
  const parts = [
    pick(NOTE_OPENERS, 'noteA' + id),
    pick(NOTE_BEHAVIOUR, 'noteB' + id),
  ];
  if (attempts && attempts > 1) {
    parts.push(`THIS MARKS ATTEMPT ${String(attempts).padStart(2, '0')} ON RECORD.`);
  }
  if (hometown) parts.push(`ORIGIN GIVEN AS ${hometown.toUpperCase()}.`);
  parts.push(pick(NOTE_CLOSERS, 'noteC' + id));
  return parts.join(' ');
}

export const docType = (id) => pick(DOC_TYPES, 'doc' + id);
export const remark = (id) => pick(REMARKS, 'rem' + id);
export const recommendation = (id) => pick(RECOMMENDATIONS, 'rec' + id);

/** Filing references for the civil notice. Derived, so they never move. */
export function ledgerRef(id) {
  const a = hash('ledger' + id) % 90 + 10;
  const b = hash('ledgerb' + id) % 60;
  const v = hash('vault' + id) % 9 + 1;
  return { ledger: `${a}:${String(b).padStart(2, '0')}`, vault: `0${v}` };
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
