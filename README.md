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
FPE-0042  ->  https://fpe-archive.pages.dev/f/0042
```

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

Type is Banknote Gothic if you have it, Copperplate otherwise. It's a licensed
font so it can't be served from here.

## What a person fills in

Name, how many shows they've been to, what year their first was, their bishop,
handle, hometown, a line that means something, and a statement. All optional —
blank fields come out as `[REDACTED]`, which honestly looks better.

Their statement becomes the FILE NOTES on the attached file and their line
becomes the REMARK. If they skip both, the registry writes its own, pulled
from the designation so it's stable and different per record.

The citizen ID, registry reference, document type, association, district,
method and disposition are all derived from the number — same every time, no
columns to store.

## Security

The URLs are public and guessable on purpose. Anyone can read any record.
Writing is what's defended:

- Claiming is one atomic `UPDATE ... WHERE status = 'UNREGISTERED'`. Twelve
  simultaneous claims on the same number produce one winner and eleven 409s.
- Editing needs a 256-bit token minted at claim time. The server only keeps
  its SHA-256 and compares in constant time. No token, no write.
- Lose the token (cleared data, different phone) and the record goes read-only
  for you. Recovery is an admin reset. That's the trade.
- Photos get re-encoded through a canvas on the device, so no original and no
  GPS leaves the phone. The server then strips the APP segments the encoder
  writes back in, verifies the JPEG structure and caps it at 400 KB.
- Photos nobody consented to publish are never sent. The box is unchecked by
  default and the file is only attached if it's ticked.
- Cross-site writes are refused on all four write endpoints.
- Secrets live in Cloudflare env vars. Nothing in the repo, nothing in the
  frontend.

No rate limiting on claims — with 100 records, an atomic claim and a master
on/off switch, it'd just add a database write to every request. Admin login is
throttled though, 10 tries per 5 minutes.

## Admin

`/admin`, one password. Counts, search, filters, reset a record, delete a
photo, and the claiming switch.

**Claiming ships closed.** Nobody can sweep the set before the show, but it
also means you have to remember to open it when you get there. Everyone sees
"THE ARCHIVE IS NOT ACCEPTING SUBMISSIONS" until you do.

## Tags

`NFC-GUIDE.md` covers writing them, testing them, why I wouldn't permanently
lock them, what each kind of phone actually does when someone taps, and the
checklists for before and after the show.

## Editing your own details

`functions/_lib/about.js`. That's the only file `/about` reads — name, bio,
links, credits. Blank anything you don't want shown.
