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

/**
 * Letterspacing that fills the width exactly. CSS cannot justify between
 * characters reliably across browsers, so each one becomes a flex item.
 */
export function spread(text) {
  return [...String(text)]
    .map((ch) => (ch === ' ' ? '<i></i>' : `<span>${escapeHtml(ch)}</span>`))
    .join('');
}

export function layout({ title, body, bodyClass = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="dark">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="/styles.css">
</head>
<body class="${escapeHtml(bodyClass)}">
<div class="sheet">
${body}
  <footer class="colophon">
    <p>UNOFFICIAL FAN-MADE RECORD. NOT AFFILIATED WITH ANY ARTIST OR LABEL.</p>
    <p class="colophon__who"><a href="/about">WHO FILED THIS &mdash;&mdash;&mdash;&gt;</a></p>
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
