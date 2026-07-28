-- Up Migration

-- Transactional outbox: written in the same DB transaction as the business
-- change it describes, so "the write succeeded but no event was recorded"
-- can't happen. No worker reads/processes this table yet (see
-- outbox.service.js) — this migration only lays the table down.
CREATE TABLE outbox_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type       VARCHAR(100) NOT NULL,
  aggregate_type   VARCHAR(50) NOT NULL,
  aggregate_id     UUID NOT NULL,
  payload          JSONB NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'processed', 'failed')),
  retry_count      INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at     TIMESTAMPTZ
);

-- Worker query shape: "pending events, oldest first".
CREATE INDEX outbox_events_status_created_at_idx ON outbox_events (status, created_at);
CREATE INDEX outbox_events_aggregate_idx ON outbox_events (aggregate_type, aggregate_id);

-- Down Migration

DROP TABLE IF EXISTS outbox_events;
