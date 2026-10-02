import { FORM } from './config.js';

export function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Tagged template that escapes every interpolated value. */
export function h(strings, ...values) {
  return strings.reduce((out, str, i) => {
    if (i >= values.length) return out + str;
    const v = values[i];
    return out + str + (v && v.__safe ? String(v) : escapeHtml(v));
  }, '');
}

/** Marks a string as already-safe HTML so `h` leaves it alone. */
export function raw(html) {
  const s = new String(html);
  s.__safe = true;
  return s;
}

export function layout({ title, body, bodyClass = '', mastLeft = null, mastRight = null }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="dark">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="/styles.css">
<script>try{var t=localStorage.getItem('fpe:theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}</script>
</head>
<body class="${escapeHtml(bodyClass)}">
<div class="sheet">
  <header class="masthead">
    <a class="masthead__all" href="/archive">ALL RECORDS</a>
    <span class="bureau">${escapeHtml(mastLeft ?? FORM.bureau)}</span>
    <span class="formcode">${escapeHtml(mastRight ?? `FORM ${FORM.code} (${FORM.revision})`)}</span>
    <button class="masthead__theme" type="button" data-theme-toggle aria-label="Switch between light and dark">LIGHT / DARK</button>
  </header>
${body}
  <footer class="colophon">
    <p>UNOFFICIAL FAN-MADE RECORD. NOT AFFILIATED WITH ANY ARTIST OR LABEL.</p>
  </footer>
</div>
<script src="/theme.js" defer></script>
</body>
</html>`;
}

export function htmlResponse(markup, { status = 200, headers = {} } = {}) {
  return new Response(markup, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      ...headers,
    },
  });
}
