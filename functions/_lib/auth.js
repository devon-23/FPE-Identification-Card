
const B64URL = (bytes) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function newToken() {
  // 32 bytes. we hand this out once and never store it, only its hash
  return B64URL(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export function safeEqual(a, b) {
  // compares every byte even after a mismatch, so timing gives nothing away
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
export async function keyMatches(rec, key) {
  if (!rec || !rec.claim_key_hash || !key) return false;
  return safeEqual(await hashToken(String(key)), rec.claim_key_hash);
}

export async function ownsRecord(rec, token) {
  if (!rec || !rec.token_hash || !token) return false;
  return safeEqual(await hashToken(token), rec.token_hash);
}
