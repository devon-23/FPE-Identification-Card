// pulling a state out of what nominatim hands back. the labels run
// "City, County, State, United States", sometimes with a zip wedged in
// before the country, so walking back from the end beats splitting on commas

export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine',
  'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia',
  'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
];

const BY_LOWER = new Map(US_STATES.map((s) => [s.toLowerCase(), s]));

export function usState(label) {
  if (!label || !/United States/i.test(label)) return null;
  // longest first, so "West Virginia" is not read as "Virginia"
  const parts = String(label).split(',').map((p) => p.trim());
  for (let i = parts.length - 1; i >= 0; i--) {
    const hit = BY_LOWER.get(parts[i].toLowerCase());
    if (hit) return hit;
  }
  return null;
}

// nominatim hands back "Toronto, Golden Horseshoe, Ontario, Canada"
export function country(label) {
  if (!label) return null;
  const parts = String(label).split(',').map((x) => x.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1].toUpperCase() : null;
}

// nominatim labels run long -- "Columbus, Franklin County, Ohio, United
// States" is not a thing to put in a list. first part plus whatever places
// it, deduped so "Ohio, United States" does not come out as "Ohio, Ohio"
export function shortPlace(label) {
  const parts = String(label || '').split(',').map((x) => x.trim()).filter(Boolean);
  if (parts.length <= 1) return parts[0] || '';
  const where = usState(label) || parts[parts.length - 1];
  return parts[0] === where ? parts[0] : `${parts[0]}, ${where}`;
}
