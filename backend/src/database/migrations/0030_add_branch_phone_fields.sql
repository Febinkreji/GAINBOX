-- Up Migration

-- Confirmed required by Surfboard's Create Store API (phoneNumber.code /
-- phoneNumber.number) via the official docs — see Phase 2's Store & Device
-- Integration plan. Split into two columns (not one JSONB "phone" blob)
-- to match how the rest of this table already models scalar fields, and
-- because Surfboard's own shape is exactly this pair, nothing richer.
-- Nullable, same reasoning as merchants.corporate_id (migration 0029):
-- existing branches have no value yet, and a branch doesn't need one until
-- Surfboard Store sync is actually attempted.
ALTER TABLE branches
  ADD COLUMN phone_code VARCHAR(10),
  ADD COLUMN phone_number VARCHAR(20);

-- Down Migration

ALTER TABLE branches
  DROP COLUMN IF EXISTS phone_code,
  DROP COLUMN IF EXISTS phone_number;
