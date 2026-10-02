// Event constants. These are frozen into each record at claim time, so editing
// them later only affects records claimed after the change.

export const EVENT = {
  venue: 'VENUE PENDING',        // <-- TODO: set before the show
  city: 'CITY PENDING',          // <-- TODO: set before the show
  date: '2026-10-16',            // ISO, used for comparisons
  dateDisplay: '16 OCT 2026',    // shown on the record
};

// Total number of FPE designations in the set.
export const SET_SIZE = 100;

// Form furniture -- the bureaucratic noise in the page margins.
export const FORM = {
  code: 'D-17',
  revision: 'REV. 4',
  bureau: 'DEMA // ARCHIVES',
};
