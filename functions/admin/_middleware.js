
import { layout, htmlResponse, h, raw } from '../_lib/html.js';
import { safeEqual } from '../_lib/auth.js';
import { hasSession, issueCookie, clearCookie, ipHash } from '../_lib/session.js';
import { sameOrigin } from '../_lib/origin.js';

const MAX_ATTEMPTS = 10;
const WINDOW_SECONDS = 5 * 60;

function loginPage(message, status = 200, extraHeaders = {}) {
  const body = h`  <main class="stage">
    <p class="kicker">RESTRICTED</p>
    <p class="designation">ADMIN</p>
    ${raw(message ? h`<p class="form__status">${message}</p>` : '')}
    <form class="form" method="POST" action="/admin/login">
      <div class="form__row">
        <label class="form__label" for="pw">PASSPHRASE</label>
        <input class="form__input" id="pw" name="password" type="password"
               autocomplete="current-password" required
               autocapitalize="off" spellcheck="false">
      </div>
      <button class="button button--primary" type="submit">AUTHENTICATE</button>
    </form>
  </main>`;
  return htmlResponse(
    layout({ title: 'ADMIN', body, bodyClass: 'page-admin' }),
    { status, headers: { 'cache-control': 'no-store', ...extraHeaders } }
  );
}

function misconfigured(missing) {
  const body = h`  <main class="stage">
    <p class="kicker">NOT CONFIGURED</p>
    <p class="designation">ADMIN</p>
    <p class="note">MISSING SERVER SECRET: ${missing}.<br><br>
      SET IT WITH:<br><code>npx wrangler pages secret put ${missing}</code></p>
  </main>`;
  return htmlResponse(layout({ title: 'ADMIN — NOT CONFIGURED', body, bodyClass: 'page-admin' }), { status: 503 });
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const secure = url.protocol === 'https:';

  if (!env.ADMIN_PASSWORD) return misconfigured('ADMIN_PASSWORD');
  if (!env.SESSION_SECRET) return misconfigured('SESSION_SECRET');

  if (url.pathname === '/admin/logout') {
    return new Response(null, {
      status: 303,
      headers: { location: '/admin', 'set-cookie': clearCookie({ secure }) },
    });
  }

  if (url.pathname === '/admin/login') {
    if (request.method !== 'POST') return Response.redirect(new URL('/admin', request.url).toString(), 303);

    if (!sameOrigin(request)) return loginPage('REJECTED.', 403);

    const key = await ipHash(request, env.SESSION_SECRET);
    const now = Math.floor(Date.now() / 1000);
    const row = await env.DB.prepare('SELECT n, first FROM login_attempts WHERE ip_hash = ?')
      .bind(key).first();

    if (row && row.n >= MAX_ATTEMPTS && now - row.first < WINDOW_SECONDS) {
      const mins = Math.ceil((WINDOW_SECONDS - (now - row.first)) / 60);
      return loginPage(`TOO MANY ATTEMPTS. WAIT ${mins} MINUTE(S).`, 429);
    }

    let form;
    try { form = await request.formData(); }
    catch { return loginPage('MALFORMED SUBMISSION.', 400); }

    const supplied = String(form.get('password') || '');
    if (safeEqual(supplied, env.ADMIN_PASSWORD)) {
      await env.DB.prepare('DELETE FROM login_attempts WHERE ip_hash = ?').bind(key).run();
      return new Response(null, {
        status: 303,
        headers: {
          location: '/admin',
          'set-cookie': await issueCookie(env.SESSION_SECRET, { secure }),
        },
      });
    }

    const fresh = !row || now - row.first >= WINDOW_SECONDS;
    await env.DB.prepare(`
      INSERT INTO login_attempts (ip_hash, n, first) VALUES (?, 1, ?)
      ON CONFLICT(ip_hash) DO UPDATE SET
        n = CASE WHEN ? THEN 1 ELSE n + 1 END,
        first = CASE WHEN ? THEN ? ELSE first END
    `).bind(key, now, fresh ? 1 : 0, fresh ? 1 : 0, now).run();

    return loginPage('INCORRECT.', 401);
  }

  if (!(await hasSession(request, env.SESSION_SECRET))) return loginPage(null, 401);

  return next();
}
