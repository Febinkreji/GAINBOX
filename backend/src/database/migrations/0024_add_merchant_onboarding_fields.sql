-- Up Migration

-- Merchant Onboarding (Platform Control Center) needs more merchant detail
-- than the original foundation captured. Additive only: existing rows,
-- business_name/business_type/status/contact_email/contact_phone, and
-- migrations 0001-0023 are untouched.
ALTER TABLE merchants
  ADD COLUMN legal_name VARCHAR(255),
  ADD COLUMN address VARCHAR(500),
  ADD COLUMN timezone VARCHAR(50),
  -- Same convention as membership_plans.currency (migration 0011): ISO
  -- 4217, not CHECK-constrained (external, evolving standard — validated
  -- at the application layer), defaulted so existing rows stay valid.
  ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  -- Free text, same convention as branches.country (migration 0020) — not
  -- an ISO alpha-2 code, for consistency with how this codebase already
  -- represents country elsewhere.
  ADD COLUMN country VARCHAR(100);

-- Down Migration

ALTER TABLE merchants
  DROP COLUMN IF EXISTS legal_name,
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS timezone,
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS country;
