# FPE Identification Record

NFC cards I handed out at a Twenty One Pilots show. Each card has a number —
`FPE-0001` to `FPE-0100` — and tapping it opens that number's record. First
person to tap an unclaimed one gets to register it. After that, anyone who
taps the same card sees whoever claimed it.

Fan project. Not affiliated with anyone.

Live at https://fpe-archive.pages.dev

## How it works

The tag holds one URL and nothing else:

```
FPE-0042  ->  https://fpe-archive.pages.dev/f/0042?k=PWPF63D2
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
the database, R2 for photos. No framework, no build step, no web fonts. A
record page is about 2 KB, which matters when a few thousand people are on the
venue wifi.

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
public/             css, client js, 404
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

## The design

Black on white, pulled from the look of the dmaorg material — letterhead,
oxblood ink, a seal, filled-in fields with the label printed under the line.
Nothing is copied; the mark is drawn from geometry and the only canon phrases
are the letterhead and the benediction.

The mark is the city from above: nine sections, one per bishop, with the
record's bishop lit. Section one sits at twelve o'clock and they run clockwise
— Lisden, Keons, Reisdro, Sacarver, Listo, Vetomo, Nills, Nico, Andre.

Dates are written the way the archive writes them: `026 10MOON 17`.

## Editing your own details

`functions/_lib/about.js`. That's the only file `/about` reads — name, bio,
links, credits. Blank anything you don't want shown.
