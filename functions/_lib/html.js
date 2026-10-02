import { FORM } from './config.js';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function h(strings, ...values) {
  return strings.reduce((out, str, i) => {
    if (i >= values.length) return out + str;
    const v = values[i];
    return out + str + (v && v.__safe ? String(v) : escapeHtml(v));
  }, '');
}

export function raw(html) {
  const s = new String(html);
  s.__safe = true;
  return s;
}

export function spread(text) {
  // spaces become empty <i> so flex can stretch them. that means textContent
  // loses the spaces, which is why the callers also set data-plain
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
    <p>UNOFFICIAL FAN-MADE - NOT AFFILIATED WITH TWENTY ONE PILOTS. MARK PLEASE DON'T BE MAD (again).</p><p class="colophon__who"><a href="/about">WHO FILED THIS &mdash;&mdash;&mdash;&gt;</a></p>
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
