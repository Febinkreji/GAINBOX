-- Up Migration

CREATE TABLE permissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Convention: "<resource>:<action>", e.g. 'branch:create', 'payment:refund'.
  name         VARCHAR(100) NOT NULL,
  description  VARCHAR(255),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ,

  CONSTRAINT permissions_name_uq UNIQUE (name)
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON permissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Down Migration

DROP TABLE IF EXISTS permissions;
