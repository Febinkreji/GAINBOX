-- Up Migration

-- No deleted_at, ever: financial records are immutable for audit/compliance.
-- Lifecycle is expressed entirely through `status`.
CREATE TABLE payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- RESTRICT: financial history must not silently cascade-delete with its branch.
  branch_id        UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  -- Nullable + SET NULL: a device being deregistered shouldn't invalidate
  -- financial history, only orphan the reference.
  device_id        UUID REFERENCES devices(id) ON DELETE SET NULL,
  -- Nullable: not every payment is subscription-related (e.g. a one-time
  -- consultation fee).
  subscription_id  UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount           NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  currency         VARCHAR(3) NOT NULL DEFAULT 'INR',
  purpose          VARCHAR(30) NOT NULL
                     CHECK (purpose IN ('membership', 'meal-plan', 'consultation', 'other')),
  status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'paid', 'refunded', 'cancelled')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX payments_branch_id_idx ON payments (branch_id);
CREATE INDEX payments_device_id_idx ON payments (device_id);
CREATE INDEX payments_subscription_id_idx ON payments (subscription_id);
CREATE INDEX payments_status_idx ON payments (status);
-- Dashboard-shaped query: "recent transactions at this branch".
CREATE INDEX payments_branch_id_created_at_idx ON payments (branch_id, created_at DESC);
-- Supports future keyset pagination on the payments list.
CREATE INDEX payments_created_at_id_idx ON payments (created_at, id);

-- Down Migration

DROP TABLE IF EXISTS payments;
