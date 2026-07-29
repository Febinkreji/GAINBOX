-- Up Migration

-- Platform Control Center's Incident Management foundation: Incident,
-- Runbook, and Recommendation (the link between them). All three are new,
-- platform-admin-only operational entities — no existing table owns this
-- concept, unlike Audit Explorer (reuses audit_logs) or System Health (no
-- table at all).

CREATE TABLE incidents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  severity       VARCHAR(20) NOT NULL DEFAULT 'medium'
                   CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status         VARCHAR(20) NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'investigating', 'resolved', 'closed', 'cancelled')),
  -- Free text, not an enum: incident categories ("payment", "device",
  -- "network", "provider-outage", ...) are an open, evolving vocabulary,
  -- unlike severity/status which this task gave a fixed set of values for.
  category       VARCHAR(100),
  -- All three scope references are nullable: a platform-wide incident
  -- (e.g. "Surfboard API degraded") has none of them; a device-level
  -- incident may have all three. ON DELETE SET NULL, not CASCADE — an
  -- incident's own record must survive its scope being removed later.
  merchant_id    UUID REFERENCES merchants(id) ON DELETE SET NULL,
  branch_id      UUID REFERENCES branches(id) ON DELETE SET NULL,
  device_id      UUID REFERENCES devices(id) ON DELETE SET NULL,
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX incidents_status_idx ON incidents (status) WHERE deleted_at IS NULL;
CREATE INDEX incidents_severity_idx ON incidents (severity) WHERE deleted_at IS NULL;
CREATE INDEX incidents_merchant_id_idx ON incidents (merchant_id);
CREATE INDEX incidents_branch_id_idx ON incidents (branch_id);
CREATE INDEX incidents_device_id_idx ON incidents (device_id);
CREATE INDEX incidents_assigned_to_idx ON incidents (assigned_to);
CREATE INDEX incidents_created_at_idx ON incidents (created_at DESC);

-- A runbook is a versioned procedure document, not tied to one incident —
-- many incidents of the same category can reuse the same runbook.
CREATE TABLE runbooks (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                  VARCHAR(255) NOT NULL,
  category               VARCHAR(100),
  description            TEXT,
  -- Ordered procedure content — free-form (each step's shape isn't fixed
  -- by this schema), same reasoning as devices.branding_config/tip_config.
  steps                  JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Which incident categories this runbook applies to — a flat list of
  -- strings, so a native Postgres array (queryable via `= ANY(...)`, the
  -- same pattern already used for role_permissions/merchant scoping
  -- lookups) fits better here than JSONB.
  related_incident_types TEXT[] NOT NULL DEFAULT '{}',
  -- Bumped by the application on every update (see runbook.service.js) —
  -- not client-settable, so it reliably reflects "how many times has this
  -- procedure been revised".
  version                INTEGER NOT NULL DEFAULT 1,
  -- Distinct from deleted_at: an inactive runbook is superseded/deprecated
  -- but still worth keeping visible for history; a deleted one is hidden
  -- entirely. Same "status vs deleted_at" separation as every other module.
  active                 BOOLEAN NOT NULL DEFAULT true,
  created_by             UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by             UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at             TIMESTAMPTZ
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON runbooks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX runbooks_category_idx ON runbooks (category) WHERE deleted_at IS NULL;
CREATE INDEX runbooks_active_idx ON runbooks (active) WHERE deleted_at IS NULL;
CREATE INDEX runbooks_related_incident_types_idx ON runbooks USING GIN (related_incident_types);
CREATE INDEX runbooks_created_at_idx ON runbooks (created_at DESC);

-- The link in Incident -> Recommendation -> Runbook: "for this incident,
-- this runbook is recommended". Both FKs NOT NULL — a recommendation
-- always connects a real incident to a real runbook, never floats free of
-- either end of the chain.
CREATE TABLE recommendations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id  UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  runbook_id   UUID NOT NULL REFERENCES runbooks(id) ON DELETE RESTRICT,
  description  TEXT,
  status       VARCHAR(20) NOT NULL DEFAULT 'suggested'
                 CHECK (status IN ('suggested', 'applied', 'dismissed')),
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON recommendations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX recommendations_incident_id_idx ON recommendations (incident_id);
CREATE INDEX recommendations_runbook_id_idx ON recommendations (runbook_id);
CREATE INDEX recommendations_status_idx ON recommendations (status) WHERE deleted_at IS NULL;

-- Audit Explorer (Phase 3) reads audit_logs broadly (date range, no
-- required entity_type filter) — the existing index is
-- (entity_type, entity_id, created_at DESC), which doesn't help a query
-- that isn't scoped to one entity. This is purely additive: it changes
-- nothing about how audit entries are written, only how a broad,
-- unscoped browse of them performs.
CREATE INDEX audit_logs_created_at_idx ON audit_logs (created_at DESC);

-- Down Migration

DROP INDEX IF EXISTS audit_logs_created_at_idx;
DROP TABLE IF EXISTS recommendations;
DROP TABLE IF EXISTS runbooks;
DROP TABLE IF EXISTS incidents;
