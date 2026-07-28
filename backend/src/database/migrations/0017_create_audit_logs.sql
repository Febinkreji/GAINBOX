-- Up Migration

-- Append-only compliance/audit trail. No updated_at (an audit entry is
-- never edited after the fact) and no deleted_at (audit history must never
-- be deletable, by design — that would defeat its purpose).
CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     VARCHAR(50) NOT NULL,
  entity_id       UUID NOT NULL,
  action          VARCHAR(100) NOT NULL,
  actor_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- "Audit trail for this entity, most recent first" — the primary read path.
CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX audit_logs_actor_user_id_idx ON audit_logs (actor_user_id);

-- Down Migration

DROP TABLE IF EXISTS audit_logs;
