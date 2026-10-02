-- Adds the profile columns to a database created before they existed.
ALTER TABLE records ADD COLUMN attempts INTEGER;
ALTER TABLE records ADD COLUMN handle   TEXT;
ALTER TABLE records ADD COLUMN hometown TEXT;
ALTER TABLE records ADD COLUMN bio      TEXT;
