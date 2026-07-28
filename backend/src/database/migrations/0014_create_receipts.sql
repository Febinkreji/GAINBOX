-- Up Migration

-- No updated_at, no deleted_at: a receipt is issued once and never edited.
-- 1:1 with payment via the UNIQUE constraint on payment_id.
CREATE TABLE receipts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id  UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  issued_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Line items / provider-specific receipt payload — flexible on purpose,
  -- same reasoning as devices.branding_config.
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT receipts_payment_id_uq UNIQUE (payment_id)
);

-- Down Migration

DROP TABLE IF EXISTS receipts;
