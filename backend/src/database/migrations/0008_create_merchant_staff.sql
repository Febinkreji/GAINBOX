-- Up Migration

-- Which users work at which merchant, with what role. Has its own
-- surrogate id (unlike role_permissions) because the same user can be
-- added/removed/re-added to the same merchant over time, and each
-- assignment is a distinct historical record worth keeping — a plain
-- composite PK couldn't represent "removed, then re-hired" history.
CREATE TABLE merchant_staff (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id  UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- RESTRICT: a role that's actively assigned to staff can't be deleted
  -- out from under them.
  role_id      UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  invited_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'removed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON merchant_staff
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX merchant_staff_merchant_id_idx ON merchant_staff (merchant_id);
CREATE INDEX merchant_staff_user_id_idx ON merchant_staff (user_id);
CREATE INDEX merchant_staff_role_id_idx ON merchant_staff (role_id);
-- Only one *active* assignment per (merchant, user) at a time — historical
-- soft-deleted rows for the same pair are allowed to coexist.
CREATE UNIQUE INDEX merchant_staff_active_assignment_uq
  ON merchant_staff (merchant_id, user_id) WHERE deleted_at IS NULL;

-- Down Migration

DROP TABLE IF EXISTS merchant_staff;
