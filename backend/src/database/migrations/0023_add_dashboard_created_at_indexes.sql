-- Up Migration

-- Platform Dashboard's "latest N" operational summaries (Phase 2) query
-- devices/membership_plans/subscriptions/users/merchant_staff/user_roles
-- ordered by created_at DESC, LIMIT 5 — a pattern merchants/branches
-- already had an index for (see migrations 0007/0009), these did not.
-- Purely additive: no existing query's behavior changes, only new
-- ORDER BY created_at DESC LIMIT N reads get to use an index instead of a
-- full sort.
CREATE INDEX devices_created_at_idx ON devices (created_at DESC);
CREATE INDEX membership_plans_created_at_idx ON membership_plans (created_at DESC);
CREATE INDEX subscriptions_created_at_idx ON subscriptions (created_at DESC);
CREATE INDEX users_created_at_idx ON users (created_at DESC);
CREATE INDEX merchant_staff_created_at_idx ON merchant_staff (created_at DESC);
CREATE INDEX user_roles_created_at_idx ON user_roles (created_at DESC);

-- Down Migration

DROP INDEX IF EXISTS devices_created_at_idx;
DROP INDEX IF EXISTS membership_plans_created_at_idx;
DROP INDEX IF EXISTS subscriptions_created_at_idx;
DROP INDEX IF EXISTS users_created_at_idx;
DROP INDEX IF EXISTS merchant_staff_created_at_idx;
DROP INDEX IF EXISTS user_roles_created_at_idx;
