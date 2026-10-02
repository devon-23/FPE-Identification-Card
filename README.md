# FPE IDENTIFICATION RECORD

An NFC-based collectible for a Twenty One Pilots show. Each physical card holds
one FPE designation (`FPE-0001`…`FPE-0100`). Tapping it opens that designation's
record; the first person to tap an unclaimed one can register it.

Unofficial fan project. Not affiliated with any artist or label.

## Architecture

| Piece | Choice |
|---|---|
| Hosting | Cloudflare Pages (free `*.pages.dev` subdomain) |
| Server logic | Pages Functions (`functions/`) |
| Database | Cloudflare D1 (SQLite) |
| Photos | Cloudflare R2 *(stage 5)* |
| Frontend | Server-rendered HTML + one stylesheet. No framework, no build step, no web fonts. |

Viewing a record uses **no JavaScript at all** — it is one request, ~4 KB, which
is the point when the venue's network is saturated. The card *maker* does need
scripting, because it processes the photo on the device.

A record page is ~2 KB and makes one request. That is deliberate — it has to
load on one bar of signal inside a venue.

## Layout

```
schema.sql              database schema (safe to re-run)
seed.sql                generated; one row per designation
wrangler.toml           Cloudflare config
functions/
  f/[id].js             GET  /f/0042            the record page
  f/[id]/register.js    GET  /f/0042/register   the card maker
  f/[id]/claim.js       POST /f/0042/claim      first registration
  f/[id]/amend.js       POST /f/0042/amend      owner edits (token required)
  p/[file].js           GET  /p/0042.jpg        photo, served from R2
  archive.js            GET  /archive           the public register
  admin/_middleware.js  guards everything under /admin
  admin/index.js        GET  /admin             dashboard
  admin/act.js          POST /admin/act         reset / delete image / toggle
  fpe/[id].js           redirects /fpe/0042 -> /f/0042
  _lib/
    config.js           venue, date, set size, form furniture
    lore.js             deterministic generated fields
    card.js             the card markup (shared by page and preview)
    record.js           id parsing + page rendering
    html.js             escaping, layout shell, responses
    auth.js             edit tokens
    sanitize.js         name cleaning
    photo.js            image validation + R2 writes
    session.js          admin session cookie, signed
    origin.js           same-origin check
    db.js               database queries
public/
  index.html            landing page
  404.html              unmatched paths
  styles.css            all styling
  claim.js              card maker: live preview, photo processing, submit
  record.js             record page: owner controls, device-only photo
  cardimage.js          canvas export, loaded only when SAVE CARD is tapped
scripts/
  generate-seed.mjs     writes seed.sql
  generate-urls.mjs     writes urls.csv for NFC programming
```

## URL contract

This is fixed — the NFC tags depend on it.

```
FPE-0042  ->  https://<site>/f/0042
```

`/f/42`, `/f/FPE-0042` and `/fpe/0042` all redirect to `/f/0042`. Designations
outside the set return `NO SUCH RECORD`.

## Local development

```bash
npm install
node scripts/generate-seed.mjs 100
npm run db:init:local
npm run dev            # http://localhost:8788/f/0042
```

## First deploy

1. Create a free account at <https://cloudflare.com>, then `npx wrangler login`.
2. Create the database and copy the printed `database_id` into `wrangler.toml`:
   ```bash
   npx wrangler d1 create fpe
   ```
3. Apply the schema and seed to the live database:
   ```bash
   npm run db:init:remote
   ```
4. Deploy:
   ```bash
   npx wrangler pages deploy
   ```
5. Note the `*.pages.dev` URL it prints, then generate the tag list:
   ```bash
   node scripts/generate-urls.mjs https://<your-site>.pages.dev 100
   ```

## Saving a card

`SAVE CARD` redraws the card onto a canvas at 3.3x and hands over a ~1082x1560
PNG. It reads the values back out of the rendered DOM, so the image cannot
drift from what is on screen, and it is fetched only when the button is
tapped -- a plain record view never loads it.

Three tiers, best first: the native share sheet via `navigator.share` (which on
a phone means straight into Instagram, Messages or Save to Photos), then a
normal download, then opening the image in a tab to long-press. The share path
needs a real device to exercise; it cannot be tested in a desktop browser.

No screenshot library is involved -- `html2canvas` is around 200 KB and renders
CSS unreliably on iOS Safari, which is the single most important browser here.

## Admin

`/admin`, behind one passphrase. Shows counts, a search, filters, and per
record a RESET (back to unclaimed, photo deleted, old edit token invalidated)
and a DELETE IMAGE. The master **claiming switch** lives here — it ships
**closed**, so nobody can sweep the set before you open it at the venue.

Two secrets, set once and never committed:

```bash
npx wrangler pages secret put ADMIN_PASSWORD
npx wrangler pages secret put SESSION_SECRET
```

For `SESSION_SECRET`, paste a long random string — `openssl rand -base64 32`.
Without either one `/admin` returns 503 and tells you which is missing.
Locally they come from `.dev.vars`, which is gitignored.

The session is a signed HttpOnly, SameSite=Strict cookie scoped to `/admin`:
no session table, no accounts. Login is throttled to 10 attempts per 5 minutes
per address, and addresses are stored only as a salted hash.

## Security model

The record URL is public and guessable on purpose — anyone may *read* any
designation. Writing is what is defended.

- **Claiming** is a single atomic `UPDATE ... WHERE status = 'UNREGISTERED'`.
  The `WHERE` clause is the lock: of twelve simultaneous claims on one
  designation, exactly one succeeds and eleven get a 409.
- **Editing** requires a 256-bit token minted once at claim time. The server
  stores only its SHA-256 hash and compares in length-constant time. Typing
  `/f/0043/register` by hand gets you a read-only page; posting to
  `/f/0043/amend` without the token gets you a 403.
- **Losing the token** (cleared browser data, a different phone) means the
  record becomes read-only for you. That is the accepted trade of the
  localStorage approach — recovery is an admin reset.
- **Photos** are re-encoded through a canvas on the device, which drops EXIF
  and GPS, then verified as real JPEG magic bytes server-side and capped at
  400 KB. They are served through the Worker, so the bucket stays private.
- **Unconsented photos are never transmitted.** The consent box is unchecked by
  default and the upload field is only attached to the request when it is
  ticked; otherwise the image is held in `localStorage` on that device alone.
- **Secrets** live in Cloudflare environment variables, never in the repo and
  never in frontend JavaScript.

- **Cross-site writes** are refused on all four write endpoints via a shared
  check that prefers `Sec-Fetch-Site` and parses `Origin` defensively — an
  opaque `Origin: null` is rejected rather than crashing the request.

Deliberately *not* implemented: per-IP rate limiting on claims. With a
hundred records, an atomic claim, and a master `claiming_open` switch you flip
when you arrive at the venue, it would add a database write to every request —
cost on a bad network — for very little. Admin login rate limiting is a
different matter and is coming with the admin panel.

## Status

- [x] Stage 1 — data model, URL contract, record page
- [x] Stage 2 — the card, and the card maker (live preview, allegiance, photo)
- [x] Stage 3 — claiming, edit tokens, consent-gated photo storage
- [x] Stage 4 — save-as-image, public archive
- [x] Stage 5 — admin panel
- [ ] Stage 6 — NFC programming + deployment docs, checklists

Outstanding input needed: **venue name and city** (`functions/_lib/config.js`),
and the live `*.pages.dev` URL once deployed.
