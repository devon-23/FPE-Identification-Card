-- Run once. "duplicate column name" means it already applied.
ALTER TABLE records ADD COLUMN claim_key_hash TEXT;
