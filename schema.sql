-- FPE ARCHIVE -- D1 (SQLite) schema
-- Safe to re-run: every statement is IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS records (
  id            TEXT PRIMARY KEY,       -- zero-padded designation, e.g. '0042'
  n             INTEGER NOT NULL,       -- numeric form, e.g. 42
  status        TEXT NOT NULL DEFAULT 'UNREGISTERED',  -- UNREGISTERED | ESCAPED
  name          TEXT,                   -- claimant-supplied name or alias
  name_assigned INTEGER NOT NULL DEFAULT 0,  -- 1 = system assigned a designation
  photo_key     TEXT,                   -- R2 object key; NULL = no public photo
  token_hash    TEXT,                   -- SHA-256 of the edit token (never the token itself)
  claimed_at    TEXT,                   -- ISO 8601 UTC
  updated_at    TEXT,                   -- ISO 8601 UTC
  location      TEXT,                   -- venue, frozen at claim time
  city          TEXT,                   -- city/state, frozen at claim time
  event_date    TEXT                    -- show date, frozen at claim time
);

CREATE UNIQUE INDEX IF NOT EXISTS records_n_idx ON records(n);
CREATE INDEX IF NOT EXISTS records_status_idx ON records(status);

-- Simple key/value for runtime switches (e.g. claiming_open).
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('claiming_open', '0');
