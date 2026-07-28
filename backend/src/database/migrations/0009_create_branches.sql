-- Up Migration

-- Surfboard calls this concept a "Store" — GainBox calls it a "Branch".
-- The rename happens at the integration boundary (surfboardStoreAdapter),
-- not in this table.
CREATE TABLE branches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id  UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  address      VARCHAR(500),
  city         VARCHAR(100) NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'inactive')),
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX branches_merchant_id_idx ON branches (merchant_id);
CREATE INDEX branches_created_by_idx ON branches (created_by);
CREATE INDEX branches_updated_by_idx ON branches (updated_by);
-- One active branch name per merchant; a soft-deleted branch's name can be reused.
CREATE UNIQUE INDEX branches_merchant_name_uq
  ON branches (merchant_id, name) WHERE deleted_at IS NULL;
CREATE INDEX branches_created_at_id_idx ON branches (created_at, id);

-- Down Migration

DROP TABLE IF EXISTS branches;
