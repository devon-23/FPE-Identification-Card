// Admin sessions: a signed, HttpOnly cookie. No session table, no user
// accounts -- one password, held in a Cloudflare environment variable and
// never in the repository or in any frontend file.

import { safeEqual } from './auth.js';

const COOKIE = 'fpe_admin';
const TTL_SECONDS = 60 * 60 * 8;   // one long shift

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
}

export async function issueCookie(secret, { secure }) {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const sig = await hmac(secret, `admin:${exp}`);
  const attrs = [
    `${COOKIE}=${exp}.${sig}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/admin',
    `Max-Age=${TTL_SECONDS}`,
  ];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

export function clearCookie({ secure }) {
  const attrs = [`${COOKIE}=`, 'HttpOnly', 'SameSite=Strict', 'Path=/admin', 'Max-Age=0'];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

function readCookie(request) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === COOKIE) return rest.join('=');
  }
  return null;
}

export async function hasSession(request, secret) {
  const raw = readCookie(request);
  if (!raw) return false;
  const dot = raw.lastIndexOf('.');
  if (dot < 1) return false;

  const exp = parseInt(raw.slice(0, dot), 10);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;

  return safeEqual(raw.slice(dot + 1), await hmac(secret, `admin:${exp}`));
}
export async function ipHash(request, secret) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  return (await hmac(secret, `ip:${ip}`)).slice(0, 32);
}
