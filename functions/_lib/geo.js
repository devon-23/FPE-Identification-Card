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
  // did nominatim actually answer? a 429 or a dropped connection is not the
  // same as "no such town", and writing it down as one strands the pin for
  // good -- nothing ever looks a cached town up again
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

  // a miss it actually gave us is worth remembering, so a nonsense town is
  // not looked up again on every claim. a failure is not -- leave no row at
  // all and the next claim for that town, or the admin sweep, tries again
  if (answered) {
    await db.prepare(
      'INSERT OR REPLACE INTO places (q, lat, lon, label, tried) VALUES (?, ?, ?, ?, 1)'
    ).bind(q, lat, lon, label).run();
  }

  return lat == null ? null : { lat, lon };
}
