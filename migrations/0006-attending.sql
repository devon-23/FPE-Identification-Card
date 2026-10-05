-- Run once. "duplicate column name" means it already applied.
--
-- Who was actually in Columbus. The hundred issued cards were handed over by
-- hand so they default to yes; anybody coming in off a link they found has to
-- say so themselves. Only the ones marked 1 get a pin on the plot.
ALTER TABLE records ADD COLUMN attending INTEGER NOT NULL DEFAULT 1;
