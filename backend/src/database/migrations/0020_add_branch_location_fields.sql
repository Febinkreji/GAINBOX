-- Up Migration

-- The Branch module requires validating/storing State, Country, and Postal
-- Code as distinct fields (migration 0009 only had address/city). Additive
-- only: existing columns, all other tables, and migrations 0001-0019 are
-- untouched. Nullable — existing rows have no value for them, and GainBox's
-- current India-only footprint means these aren't required to place an
-- order today.
ALTER TABLE branches
  ADD COLUMN state VARCHAR(100),
  ADD COLUMN country VARCHAR(100),
  ADD COLUMN postal_code VARCHAR(20);

-- Down Migration

ALTER TABLE branches
  DROP COLUMN IF EXISTS state,
  DROP COLUMN IF EXISTS country,
  DROP COLUMN IF EXISTS postal_code;
