export const BISHOPS = [
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

const DOC_TYPES = [
  'PERSONNEL STABILITY INDEX',
  'CHARACTER DEVIATION REPORT',
  'PERIMETER INCIDENT RECORD',
  'CIVIL CONTAINMENT FILE',
  'SUBJECT CONDUCT SUMMARY',
  'ASCENSION DOSSIER',
];

const ASSOCIATIONS = [
  'CIVIC LIAISON',
  'NONCOMPLIANT',
  'SEPARATIST SYMPATHISER',
  'UNAFFILIATED',
  'KNOWN TO BANDITOS',
  'FORMER CITIZEN IN GOOD STANDING',
  'TRENCH CONTACT UNCONFIRMED',
  'UPRISING ADJACENT',
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

function hash(str) {
  // FNV-1a. copied this off wikipedia at 2am. do not touch it
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

const pick = (list, seed) => list[hash(seed) % list.length];

function redact(seed, min = 6, max = 11) {
  return '█'.repeat(min + (hash('redact' + seed) % (max - min + 1)));
}

export function citizenId(id) {
  // the +100000000 keeps it nine digits. yes i know. it works
  const a = hash('cid-a' + id) % 900000000 + 100000000;
  const b = hash('cid-b' + id) % 90 + 10;
  return `${a}_${b}`;
}

export function registryFile(id) {
  const letters = 'ABCDEFGHJKLMNPRSTVWXYZ';
  const a = String(1 + (hash('regA' + id) % 12)).padStart(2, '0');
  const b = String(hash('regB' + id) % 1000).padStart(3, '0');
  const c = 1 + (hash('regC' + id) % 9);
  return `${a}.${b}-${c}-${letters[hash('regD' + id) % letters.length]}${letters[hash('regE' + id) % letters.length]}`;
}

export function ledgerRef(id) {
  const a = hash('ledger' + id) % 90 + 10;
  const b = hash('ledgerb' + id) % 60;
  return { ledger: `${a}:${String(b).padStart(2, '0')}`, vault: `0${hash('vault' + id) % 9 + 1}` };
}

export function assignedDesignation(id) {
  const letters = 'ABCDEFGHJKLMNPRSTVWXYZ';
  return `SUBJECT ${id}-${letters[hash('desA' + id) % letters.length]}${letters[hash('desB' + id) % letters.length]}`;
}

export function fileNotes(id, { hometown, attempts } = {}) {
  const parts = [pick(NOTE_OPENERS, 'noteA' + id), pick(NOTE_BEHAVIOUR, 'noteB' + id)];
  if (attempts && attempts > 1) parts.push(`THIS MARKS ATTEMPT ${String(attempts).padStart(2, '0')} ON RECORD.`);
  if (hometown) parts.push(`ORIGIN GIVEN AS ${hometown.toUpperCase()}.`);
  parts.push(pick(NOTE_CLOSERS, 'noteC' + id));
  return parts.join(' ');
}

export const docType = (id) => pick(DOC_TYPES, 'doc' + id);
export const association = (id) => pick(ASSOCIATIONS, 'assoc' + id);
export const remark = (id) => pick(REMARKS, 'rem' + id);
export const recommendation = (id) => pick(RECOMMENDATIONS, 'rec' + id);

export function generate(id) {
  const district = 1 + (hash('district' + id) % 9);
  const sectorNum = String(1 + (hash('sector' + id) % 24)).padStart(2, '0');
  const bearing = ['N', 'NE', 'E', 'SE', 'S'][hash('bearing' + id) % 5];
  const bishopIdx = hash('bishop' + id) % BISHOPS.length;

  return {
    bishopIdx,
    bishop: BISHOPS[bishopIdx],
    district: `0${district}`,
    sector: hash('sredact' + id) % 4 === 0 ? redact(id) : `S-${sectorNum}-${bearing}`,
    attempt: String(1 + (hash('attempt' + id) % 4)).padStart(2, '0'),
    method: pick(METHODS, 'method' + id),
    disposition: pick(DISPOSITIONS, 'disp' + id),
  };
}

// this jawn doesn't work but i don't have the heart to delete it.
// was going to let two records "share" a sector if their numbers were close,
// looked cool in theory but jist didnt work.
//
// export function neighbours(id, all) {
//   const mine = generate(id);
//   return all
//     .filter((r) => r.id !== id)
//     .filter((r) => generate(r.id).district === mine.district)
//     .slice(0, 3);
// }

// const MOONS = ['01MOON','02MOON','03MOON','04MOON','05MOON','06MOON',
//                '07MOON','08MOON','09MOON','10MOON','11MOON','12MOON'];
// ^ never used it, demaDate just pads the number. keeping it because i'll
//   forget the format otherwise
