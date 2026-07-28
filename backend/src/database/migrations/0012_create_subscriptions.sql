-- Up Migration

-- No deleted_at: `status` already distinguishes "no longer applies"
-- (cancelled/expired) from active, and a cancelled subscription must stay
-- fully visible for billing history / dispute resolution — soft-deleting
-- it would hide exactly the record someone later needs.
CREATE TABLE subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- RESTRICT: can't delete a plan that has subscriptions against it.
  membership_plan_id  UUID NOT NULL REFERENCES membership_plans(id) ON DELETE RESTRICT,
  -- RESTRICT: can't delete a user who has subscription history.
  customer_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'cancelled', 'expired')),
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX subscriptions_membership_plan_id_idx ON subscriptions (membership_plan_id);
CREATE INDEX subscriptions_customer_id_idx ON subscriptions (customer_id);
CREATE INDEX subscriptions_status_idx ON subscriptions (status);

-- Down Migration

DROP TABLE IF EXISTS subscriptions;
