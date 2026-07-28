-- Up Migration

-- Pure many-to-many join. No surrogate id, no soft delete, no updated_at —
-- this table only ever reflects *current* authorization state; there's no
-- product need to know when a permission was revoked from a role, so a
-- plain hard-delete join table is the right (simpler) choice here, unlike
-- merchant_staff which needs history.
CREATE TABLE role_permissions (
  role_id        UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id  UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX role_permissions_permission_id_idx ON role_permissions (permission_id);

-- Down Migration

DROP TABLE IF EXISTS role_permissions;
