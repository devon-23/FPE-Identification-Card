-- Run once. Re-running is harmless -- the second pass matches nothing.
--
-- The provisional blocks were a thousand apart, so each letter held 999
-- designations and the register stopped dead at the 999th person. They are
-- a hundred thousand apart now, which is 99,999 a letter.
--
-- `n` is only ever used for ordering and for working out which block a
-- designation belongs to, so moving it breaks nothing. The ids themselves --
-- X001, Y002 -- do not change.
UPDATE records SET n = n - 1000 + 100000 WHERE n > 1000 AND n <= 1999;
UPDATE records SET n = n - 2000 + 200000 WHERE n > 2000 AND n <= 2999;
UPDATE records SET n = n - 3000 + 300000 WHERE n > 3000 AND n <= 3999;
