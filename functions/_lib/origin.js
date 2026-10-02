/**
 * Is this request same-origin?
 *
 * Prefers Sec-Fetch-Site, which every current browser sends and which states
 * the answer directly. Origin is the fallback, and it must be parsed
 * defensively: a sandboxed or opaque context sends the literal string "null",
 * which `new URL()` throws on.
 *
 * A request carrying no signal at all is allowed -- that is an old or unusual
 * client, and every write behind this check has its own authorisation anyway
 * (an atomic claim, an edit token, or an admin session).
 */
export function sameOrigin(request) {
  const site = request.headers.get('sec-fetch-site');
  if (site) return site === 'same-origin' || site === 'none';

  const origin = request.headers.get('origin');
  if (!origin) return true;

  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}
