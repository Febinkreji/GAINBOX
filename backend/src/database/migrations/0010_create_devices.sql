-- Up Migration

-- branding_config/tip_config are JSONB, not individual columns: they hold
-- provider-specific configuration (Surfboard's Configure Branding / Configure
-- Tips capabilities) whose exact shape is Surfboard's to define and may
-- evolve — JSONB stores it without forcing a migration every time Surfboard
-- adds a field, while keeping the *rest* of this table provider-agnostic.
CREATE TABLE devices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  label           VARCHAR(255) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'registered'
                    CHECK (status IN ('registered', 'active', 'offline', 'deactivated')),
  branding_config JSONB,
  tip_config      JSONB,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX devices_branch_id_idx ON devices (branch_id);
CREATE INDEX devices_created_by_idx ON devices (created_by);
CREATE INDEX devices_updated_by_idx ON devices (updated_by);
CREATE INDEX devices_status_idx ON devices (status) WHERE deleted_at IS NULL;

-- Down Migration

DROP TABLE IF EXISTS devices;
