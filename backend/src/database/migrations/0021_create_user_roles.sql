-- Up Migration

-- Global role grants, independent of any merchant — for roles like
-- Platform Admin that aren't scoped to a single merchant the way
-- merchant_staff assignments are. Merchant-scoped roles (Merchant Owner,
-- Merchant Staff, Viewer) are assigned via merchant_staff instead; this
-- table exists only for roles that apply platform-wide, so it deliberately
-- has no merchant_id column at all.
CREATE TABLE user_roles (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX user_roles_role_id_idx ON user_roles (role_id);

-- Down Migration

DROP TABLE IF EXISTS user_roles;
