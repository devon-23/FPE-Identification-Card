// which continent a pin sits on, worked out from the coordinates.
//
// not from the country name: nominatim answers in the local language, so the
// register holds Brasil, Россия, Deutschland and 中国, and no lookup table
// survives that. boxes are rough at the edges but a pin is a town, and towns
// are not generally on a border.

const BOXES = [
  // checked in order, first hit wins
  ['ANTARCTICA',    -90,  -60, -180,  180],
  ['SOUTH AMERICA',  -2,    2,  -92,  -88],  // galápagos, which is ecuador
  ['SOUTH AMERICA', -56,   13,  -82,  -34],
  ['NORTH AMERICA',   7,   84, -170,  -52],
  ['OCEANIA',       -50,    0,  110,  180],
  ['OCEANIA',       -50,    0, -180,  -95],  // the pacific, out as far as easter island
  ['EUROPE',         36,   72,  -25,   40],
  // the middle east before africa, or the africa box swallows the levant
  // and the gulf -- israel, jordan, syria and qatar all sit inside it
  ['ASIA',           29,   43,   34,   63],   // levant, iraq, iran
  ['ASIA',           12,   32,   42,   63],   // arabian peninsula
  ['AFRICA',        -35,   37,  -18,   58],
  ['ASIA',          -11,   82,   25,  180],
];

export function continentOf(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  for (const [name, s, n, w, e] of BOXES) {
    if (lat >= s && lat <= n && lon >= w && lon <= e) return name;
  }
  return null;
}
