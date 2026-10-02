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

export function layout({ title, body, bodyClass = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="light">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="/styles.css">
</head>
<body class="${escapeHtml(bodyClass)}">
<div class="sheet">
  <header class="masthead">
    <span class="bureau">${escapeHtml(FORM.bureau)}</span>
    <span class="formcode">FORM ${escapeHtml(FORM.code)} (${escapeHtml(FORM.revision)})</span>
  </header>
${body}
  <footer class="colophon">
    <p>UNOFFICIAL FAN-MADE RECORD. NOT AFFILIATED WITH ANY ARTIST OR LABEL.</p>
  </footer>
</div>
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
