// hometown -> coordinates, via nominatim (openstreetmap). free, no key.
//
// their policy is roughly one request a second and a user agent that says who
// you are, so: never called from a page render, only after a claim lands, and
// every answer is cached in `places` forever. a town typed by twenty people
// gets looked up once.

const UA = 'fpe-archive/1.0 (fan project; https://fpe-archive.pages.dev)';

export const normalise = (s) => String(s || '').trim().toUpperCase().replace(/\s+/g, ' ');

export async function lookup(db, hometown) {
  const q = normalise(hometown);
  if (!q) return null;

  const cached = await db.prepare('SELECT lat, lon FROM places WHERE q = ?').bind(q).first();
  if (cached) return cached.lat == null ? null : cached;

  let lat = null; let lon = null; let label = null;
  // a 429 is not "no such town". cache that and the pin is gone for good,
  // because nothing ever looks a cached town up twice
  let answered = false;
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    // city level is as precise as this ever needs to be
    url.searchParams.set('featuretype', 'city');

    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
    if (res.ok) {
      answered = true;
      const hits = await res.json();
      if (Array.isArray(hits) && hits[0]) {
        lat = parseFloat(hits[0].lat);
        lon = parseFloat(hits[0].lon);
        label = hits[0].display_name || null;
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) { lat = null; lon = null; }
      }
    }
  } catch {
    // a town without a pin is fine. the record is not affected either way
  }

  // only remember a miss it actually gave us. a failure leaves no row, so
  // the next claim or the admin sweep can try again
  if (answered) {
    await db.prepare(
      'INSERT OR REPLACE INTO places (q, lat, lon, label, tried) VALUES (?, ?, ?, ?, 1)'
    ).bind(q, lat, lon, label).run();
  }

  return lat == null ? null : { lat, lon };
}
