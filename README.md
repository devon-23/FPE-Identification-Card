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

A record page is ~2 KB and makes one request. That is deliberate — it has to
load on one bar of signal inside a venue.

## Layout

```
schema.sql              database schema (safe to re-run)
seed.sql                generated; one row per designation
wrangler.toml           Cloudflare config
functions/
  f/[id].js             GET /f/0042 -- the record page
  fpe/[id].js           redirects /fpe/0042 -> /f/0042
  _lib/
    config.js           venue, date, set size, form furniture
    lore.js             deterministic generated fields
    record.js           id parsing + page rendering
    html.js             escaping, layout shell, responses
    db.js               database queries
public/
  index.html            landing page
  styles.css            all styling
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

## Status

- [x] Stage 1 — data model, URL contract, record page
- [ ] Stage 2 — NFC tag programming
- [ ] Stage 3 — claiming + edit tokens
- [ ] Stage 4 — visual design
- [ ] Stage 5 — photos
- [ ] Stage 6 — archive + admin
- [ ] Stage 7 — polish, docs, checklists
