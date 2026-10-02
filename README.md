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
    glyph.js            the nine-section city mark
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

Order matters: the Pages project has to exist before secrets can be attached
to it.

**1. Sign in.** Free account at <https://cloudflare.com>, then:

```bash
npm install && npx wrangler login
```

**2. Create the database.** Copy the `database_id` it prints into
`wrangler.toml`, replacing `REPLACE_ME`:

```bash
npx wrangler d1 create fpe
```

**3. Create the photo bucket.** R2 must be switched on once before the API
will accept anything — otherwise this fails with *"Please enable R2 through
the Cloudflare Dashboard" [code: 10042]*. In the dashboard go to
**Storage & databases > R2 > Overview** and complete the checkout flow, then:

```bash
npx wrangler r2 bucket create fpe-photos
```

Free tier is 10 GB-month and 1M writes. A hundred photos at ~20 KB is about
2 MB, so roughly 0.02% of it.

**R2 is optional.** Comment out the `[[r2_buckets]]` block in `wrangler.toml`
and everything still works — the maker drops the consent box, says the photo
is held on the device only, and claiming, the archive and admin are
unaffected. Enable R2 later and uncomment to turn server-stored photos on.

**4. Load the schema and the 100 designations:**

```bash
node scripts/generate-seed.mjs 100 && npm run db:init:remote
```

**5. Deploy.** This creates the Pages project and prints your URL:

```bash
npx wrangler pages deploy
```

**6. Set the two secrets.** Each prompts for a value that is sent straight to
Cloudflare -- never written to disk, never in the repo:

```bash
npx wrangler pages secret put ADMIN_PASSWORD --project-name=fpe-archive
```

```bash
npx wrangler pages secret put SESSION_SECRET --project-name=fpe-archive
```

**7. Generate the tag list** using the URL from step 5:

```bash
node scripts/generate-urls.mjs https://fpe-archive.pages.dev 100
```

**8. Open `/admin`**, confirm the counts, and leave claiming **closed** until
you are at the venue.

### Choosing the two secrets

They do different jobs:

- `ADMIN_PASSWORD` is **typed by you, on a phone, in a dark and loud room**.
  Favour something you can thumb in quickly: four lowercase words beat a short
  cryptic string, and symbols will cost you real time at the venue.
- `SESSION_SECRET` is only ever read by the server to sign the admin cookie.
  Make it long and random; you will never type it again.

Generate them on your own machine so they exist nowhere else:

```bash
awk 'length($0)>=4 && length($0)<=7 && $0 !~ /[^a-z]/' /usr/share/dict/words | sort -R | head -4 | paste -sd- -
```

```bash
openssl rand -base64 32
```

Changing either one later is just re-running `wrangler pages secret put`.
Changing `SESSION_SECRET` signs you out of `/admin` everywhere, which is the
quickest way to revoke a session if you ever lose a phone.

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

## The card

Reads as a charge sheet: *IDENTIFIED AS / FAILED PERIMETER ESCAPE / BY DEMA
COUNCIL*, the statute, the designation, then the subject.

The mark at the foot is the city seen from above -- **nine sections, one per
bishop**, with the section belonging to the record's assigned bishop lit. It is
drawn from geometry rather than traced, and the lit section is a pure function
of the designation, so two people comparing cards see consistent results.

Four fields are the claimant's and all are optional:

| Field | Blank becomes |
|---|---|
| Shows attended | `ESCAPE ATTEMPT 01` |
| Handle | `[REDACTED]` |
| Hometown | `[REDACTED]` |
| Statement | `[REDACTED]` |

`[REDACTED]` is the point -- an unanswered field on a state record is in
character, so nobody is penalised for skipping one.

Handles are stored bare, without the `@`, and restricted to the characters the
major platforms allow. **They are rendered as plain text and never linked:**
we cannot verify that someone owns the handle they typed, and turning
unverified input into an outbound link invites misuse.

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
- **Photos** are re-encoded through a canvas on the device, so no original
  file and no GPS ever leaves the phone. The encoders on Apple platforms then
  write their *own* APP1/Exif and APP13/Photoshop blocks into that output --
  no user data in them, but no business being published either -- so the
  server rewrites every upload to keep only the segments a decoder needs.
  Verified pixel-identical before and after. Uploads are also checked for
  real JPEG structure (not just magic bytes) and capped at 400 KB, and are
  served through the Worker so the bucket stays private.
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

Outstanding input needed: the live `*.pages.dev` URL once deployed.

Event is set to **17 OCT 2026, Ohio State University, Columbus OH** in
`functions/_lib/config.js`. These are frozen into each record as it is
claimed, so a change after the show starts only affects later claims.
