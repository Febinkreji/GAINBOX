-- Up Migration

-- Pure GainBox domain concept — Surfboard has no notion of a membership
-- plan. price is NUMERIC, never FLOAT/DOUBLE: money must never be subject
-- to floating-point rounding error.
CREATE TABLE membership_plans (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id    UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name           VARCHAR(255) NOT NULL,
  description    TEXT,
  price          NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  -- ISO 4217 currency code. Not CHECK-constrained to a fixed list — that
  -- standard is external and evolving; validate it at the application layer.
  currency       VARCHAR(3) NOT NULL DEFAULT 'INR',
  billing_cycle  VARCHAR(20) NOT NULL
                   CHECK (billing_cycle IN ('one-time', 'monthly', 'quarterly', 'yearly')),
  status         VARCHAR(20) NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'archived')),
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON membership_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX membership_plans_merchant_id_idx ON membership_plans (merchant_id);
CREATE INDEX membership_plans_created_by_idx ON membership_plans (created_by);
CREATE INDEX membership_plans_updated_by_idx ON membership_plans (updated_by);
CREATE INDEX membership_plans_status_idx ON membership_plans (status) WHERE deleted_at IS NULL;

-- Down Migration

DROP TABLE IF EXISTS membership_plans;
