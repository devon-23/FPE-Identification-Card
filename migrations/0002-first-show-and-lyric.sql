-- Run once. SQLite has no ADD COLUMN IF NOT EXISTS, so re-running this
-- fails with "duplicate column name" -- which means it already applied and
-- there is nothing to do. Check with:
--   wrangler d1 execute fpe --remote --command "SELECT name FROM pragma_table_info('records');"
-- Second wave of profile fields.
ALTER TABLE records ADD COLUMN first_show INTEGER;
ALTER TABLE records ADD COLUMN lyric      TEXT;
