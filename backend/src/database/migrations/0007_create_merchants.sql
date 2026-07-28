-- Up Migration

-- The business using GainBox. No `surfboard_merchant_id` column here by
-- design — the mapping to an external provider's id lives in
-- provider_links so this entity stays provider-agnostic (see 0016).
CREATE TABLE merchants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name  VARCHAR(255) NOT NULL,
  business_type  VARCHAR(30) NOT NULL
                   CHECK (business_type IN (
                     'gym', 'meal-provider', 'wellness-center', 'yoga-studio',
                     'physio-clinic', 'nutrition-center', 'fitness-chain', 'other'
                   )),
  status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'active', 'suspended')),
  contact_email  CITEXT,
  contact_phone  VARCHAR(20),
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON merchants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX merchants_created_by_idx ON merchants (created_by);
CREATE INDEX merchants_updated_by_idx ON merchants (updated_by);
CREATE INDEX merchants_status_idx ON merchants (status) WHERE deleted_at IS NULL;
-- Supports future keyset pagination on the merchant list.
CREATE INDEX merchants_created_at_id_idx ON merchants (created_at, id);

-- Down Migration

DROP TABLE IF EXISTS merchants;
