-- Up Migration

-- Confirmed required by Surfboard's Create Merchant API (organisation.corporateId)
-- via the official docs — see docs/architecture/SURFBOARD_INTEGRATION.md's Phase
-- 2B-1. No format CHECK constraint: registration-number formats vary by country
-- (Surfboard itself validates format per-country on its side, e.g. Swedish numbers
-- must be digits-only) — GainBox just stores what the merchant provides.
-- Nullable: existing merchants have no value yet, and not every merchant needs one
-- until Surfboard sync is attempted.
ALTER TABLE merchants
  ADD COLUMN corporate_id VARCHAR(50);

-- Down Migration

ALTER TABLE merchants
  DROP COLUMN IF EXISTS corporate_id;
