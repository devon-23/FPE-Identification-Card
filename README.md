# FPE Identification Record

NFC cards I handed out at a Twenty One Pilots show at Ohio State University on October 17 2026. Each card has an ID number —
`FPE-0001` to `FPE-0100` — and tapping it opens that number's record. First
person to tap an unclaimed one gets to register it. After that, anyone who
taps the same card sees whoever claimed it.

Fan project. Not affiliated with anyone.

Live at https://fpe-archive.pages.dev

## How it works

The tag holds one URL:

```
FPE-0042  ->  https://fpe-archive.pages.dev/f/0042?k=PWPF63XX
```

The `?k=` is that card's key. Anyone can read any record; only a request
carrying the right key can register one, so nobody can sit at home walking
`/f/0001` through `/f/0100` and claiming the set. Keys are made once with
`scripts/generate-keys.mjs`, which writes `urls.csv` (the only copy) and
`keys.sql` (the hashes, for the database).

`/f/42`, `/f/FPE-0042` and `/fpe/0042` all redirect to `/f/0042`. Numbers
outside the set return NO SUCH RECORD.

Everything about the person lives in the database, not on the tag. That's the
whole point — the card is just a pointer to a number.

## Stack

Cloudflare Pages for hosting, Pages Functions for anything server-side, D1 for
the database, R2 for photos. No framework, no build step. A record page is
about 2 KB, which matters when a few thousand people are on the venue wifi.

```
schema.sql          tables
migrations/         run these in order against an existing db
functions/
  index.js          /            the incident report + the whole set
  about.js          /about       me
  f/[id].js         /f/0042      a record
  f/[id]/register   the form
  f/[id]/claim      first registration
  f/[id]/amend      edits, token required
  p/[file].js       photos out of R2
  admin/            dashboard, behind a password
  _lib/             shared bits
  from-here.js      /from-here   the landscape plot
public/             css, client js, fonts, images, 404
assets/fonts/       the ttf originals, not served
scripts/            seed + url list generators
```

## Running it locally

```bash
npm install
node scripts/generate-seed.mjs 100
npm run db:init:local
npm run dev
```

Then http://localhost:8788/f/0042.

## Deploying

Order matters — secrets can only be attached after the project exists.

```bash
npx wrangler login
npx wrangler d1 create fpe          # paste the id into wrangler.toml
npx wrangler r2 bucket create fpe-photos
node scripts/generate-seed.mjs 100 && npm run db:init:remote
npx wrangler pages deploy
npx wrangler pages secret put ADMIN_PASSWORD --project-name=fpe-archive
npx wrangler pages secret put SESSION_SECRET --project-name=fpe-archive
```

R2 has to be switched on once in the dashboard first (Storage & databases →
R2 → Overview) or the bucket command fails with code 10042.

For the admin password: you'll be typing it on a phone in a dark room, so
four lowercase words beats something clever with symbols. `SESSION_SECRET`
just signs the cookie — make it long and random, you'll never type it again.

Migrations fail with "duplicate column name" if they already ran. That's fine,
it means there's nothing to do. Check what's there with:

```bash
npx wrangler d1 execute fpe --remote --command "SELECT name FROM pragma_table_info('records');"
```

## Fonts

Two faces, both self-hosted as woff2 out of `public/fonts`. `assets/fonts`
holds the ttf originals they were built from; that folder is outside the Pages
output directory, so it never ships.

- **Dema Gothic** (Bank Gothic Medium) is the engraved face the documents are
  set in. `--display`.
- **Alfredino Semimono** is the condensed mono off the FROM HERE merch, used
  on `/from-here` and nowhere else. `--mono-display`.

Rebuild either one after swapping the ttf:

```bash
python3 -c "from fontTools.ttLib import TTFont; f=TTFont('assets/fonts/Main.ttf'); f.flavor='woff2'; f.save('public/fonts/alfredino.woff2')"
```

The system gothics are still listed behind them, so the page is readable in
the moment before the font lands.

## The design

Black on white, pulled from the look of the dmaorg material — letterhead,
oxblood ink, a seal, filled-in fields with the label printed under the line.
Nothing is copied; the mark is drawn from geometry and the only canon phrases
are the letterhead and the benediction.

The card is framed in the glyph border (`public/images/frame.webp`), set as a
`border-image`. `cardimage.js` draws the same frame into the saved PNG by hand,
since canvas has no nine-slice -- if you change the border width or the slice
in the CSS, change `FRAME_W` and `FRAME_SLICE` there to match or the png and
the screen drift apart.

Allegiance picks the colour everywhere it shows: citizen black, escapee red,
bandito yellow.

The mark is the city from above: nine sections, one per bishop, with the
record's bishop lit. Section one sits at twelve o'clock and they run clockwise
— Lisden, Keons, Reisdro, Sacarver, Listo, Vetomo, Nills, Nico, Andre.

Dates are written the way the archive writes them: `026 10MOON 17`.

## People without a card

`/turn-yourself-in` issues a provisional designation -- X001, X002 and so on,
numbered from 1001 so they never collide with the hundred issued cards -- then
drops you into the same registration form. There is no second claim path: the
page allocates a record with a one-time key and redirects you to it, so
everything after that is the ordinary flow.

Someone who opens that form and backs out leaves the designation sitting
unregistered. After twenty minutes the next person through gets handed that
number instead of a new one, re-keyed, so cancelling does not eat its way up
the register. The reuse is a single `UPDATE ... WHERE id = (SELECT ...)`, so
two people arriving together cannot both be given the same row.

They show on the front page under UNIDENTIFIED PERSONNEL and on the map like
anyone else. Capped at three per address per hour, since it is the one form
nobody needs a card to reach.

## The map

`/map` plots every claimant's hometown, with Columbus ringed as the one place
they all ended up. Pins open the record, and two people from the same town
share one pin rather than stacking.

The page also carries a one-field form. Filling in a whole file on a phone in
a crowd is a lot to ask, so this takes a town and nothing else: it issues a
Y-series designation (Y0001 up, numbered from 2001), files the record as a
bandito under a generated two-word callsign, and leaves every other field
[REDACTED]. It posts to the same endpoint and is subject to the same rate
limit and the same claiming switch, and it only shows while claiming is open.

That path geocodes **before** replying rather than in `waitUntil`, which is
the opposite of the ordinary claim -- the pin is the entire point of the form,
so it is worth the second. It then sends you back to `/map` with the edit
token in the URL fragment, so the page redraws with your marker on it and you
can still finish the record later.

## /from-here

The landscape one, for a laptop: the title, the whole plot, and what the plot
adds up to -- biggest origin, furthest travelled, countries on file, total
distance covered. Yellow on red, set in Alfredino, after the FROM HERE merch.
Countries are read off the tail of the `display_name` Nominatim cached in
`places`, so a town that never resolved counts for nothing.

Hometowns are geocoded through Nominatim (OpenStreetMap, free, no key) and
cached in a `places` table, so a town typed by twenty people is looked up
once. The lookup runs in `waitUntil` **after** the claim response goes out —
a slow geocoder must never hold up someone registering at the venue. A town
that fails to resolve just gets no pin; the record is unaffected.

Leaflet comes from a CDN and loads on this page only. Everything else is
still dependency-free.

## Editing your own details

`functions/_lib/about.js`. That's the only file `/about` reads — name, bio,
links, credits. Blank anything you don't want shown.
