-- Up Migration

-- Shared by every table that has an `updated_at` column. Attaching this via
-- trigger (rather than relying on application code to set updated_at)
-- guarantees correctness regardless of which repository/service writes the
-- row, or whether the write happens through a future admin tool or a
-- one-off SQL fix.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Down Migration

DROP FUNCTION IF EXISTS set_updated_at();
