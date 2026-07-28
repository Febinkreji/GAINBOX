-- Up Migration

-- Foundation only: no replay logic reads response_snapshot yet (see
-- idempotency.middleware.js) — the column exists so the shape is right
-- when that logic is built, without a further migration.
CREATE TABLE idempotency_keys (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key     VARCHAR(255) NOT NULL,
  request_hash        VARCHAR(64) NOT NULL,
  response_snapshot   JSONB,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'completed', 'failed')),
  expires_at          TIMESTAMPTZ NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT idempotency_keys_key_uq UNIQUE (idempotency_key)
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON idempotency_keys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Supports a future cleanup job that purges/ignores expired keys.
CREATE INDEX idempotency_keys_expires_at_idx ON idempotency_keys (expires_at);

-- Down Migration

DROP TABLE IF EXISTS idempotency_keys;
