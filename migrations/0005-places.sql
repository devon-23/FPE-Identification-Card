-- Run once. "table already exists" means it already applied.
CREATE TABLE IF NOT EXISTS places (
  q      TEXT PRIMARY KEY,
  lat    REAL,
  lon    REAL,
  label  TEXT,
  tried  INTEGER NOT NULL DEFAULT 0
);
