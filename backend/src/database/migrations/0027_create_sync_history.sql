-- Up Migration

-- Persistent record of every external-provider synchronization attempt.
-- Generic on purpose (entity_type/entity_id/provider), matching
-- provider_links' polymorphic shape (migration 0016) — Sprint 2A only
-- populates this for entity_type='merchant', but Store/Device sync in a
-- later sprint reuses this same table instead of getting its own.
--
-- One row per attempt (not per merchant): a merchant that's synced once,
-- fails, and is manually re-synced has multiple rows, each independently
-- describing that one attempt's lifecycle. `status` is the attempt's own
-- lifecycle (pending -> running -> completed|failed|skipped); the
-- "current sync status" for an entity is *derived* by reading the most
-- recent row for it (see syncHistory.repository.js's findLatestForEntity),
-- not stored as a separate denormalized column anywhere.
CREATE TABLE sync_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type    VARCHAR(30) NOT NULL
                   CHECK (entity_type IN ('merchant', 'branch', 'device', 'payment')),
  entity_id      UUID NOT NULL,
  provider       VARCHAR(30) NOT NULL DEFAULT 'surfboard',
  status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  -- NULL while status='pending' (queued via the outbox, not yet picked up
  -- by the worker) — populated the moment an attempt actually begins.
  started_at     TIMESTAMPTZ,
  finished_at    TIMESTAMPTZ,
  duration_ms    INTEGER,
  -- Attempts made against the provider *within this one row* (internal
  -- retries via surfboardRetry.js, once the adapter is real) — not a count
  -- of separate sync_history rows. Always 0 until an attempt actually
  -- starts, then at least 1.
  attempts       INTEGER NOT NULL DEFAULT 0,
  error_message  TEXT,
  -- Matches surfboard.client.js's correlationId shape — a plain string,
  -- not assumed to be a UUID.
  correlation_id VARCHAR(100),
  triggered_by   VARCHAR(20) NOT NULL DEFAULT 'system'
                   CHECK (triggered_by IN ('system', 'manual')),
  actor_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON sync_history
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- "Most recent attempt for this entity" — the query every Sync Status view
-- runs, and the same shape provider_links already uses for its own lookup.
CREATE INDEX sync_history_entity_created_at_idx ON sync_history (entity_type, entity_id, created_at DESC);
-- Platform-wide history/filtering (GET .../merchants/history).
CREATE INDEX sync_history_provider_status_idx ON sync_history (provider, status);
-- Mirrors outbox_events' own "pending work, oldest first" index — useful
-- the moment a cleanup/stuck-row job is needed.
CREATE INDEX sync_history_status_created_at_idx ON sync_history (status, created_at);

-- Down Migration

DROP TABLE IF EXISTS sync_history;
