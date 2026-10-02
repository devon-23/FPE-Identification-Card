// Event constants. These are frozen into each record at claim time, so editing
// them later only affects records claimed after the change.

export const EVENT = {
  venue: 'OHIO STATE UNIVERSITY',
  city: 'COLUMBUS, OH',
  date: '2026-10-17',            // ISO, used for comparisons
  dateDisplay: '17 OCT 2026',    // shown on the record
};

// Total number of FPE designations in the set.
export const SET_SIZE = 100;

// Form furniture -- the bureaucratic noise in the page margins.
export const FORM = {
  code: 'D-17',
  statute: '15398642_14',
  revision: 'REV. 4',
  bureau: 'DEMA // ARCHIVES',
};
