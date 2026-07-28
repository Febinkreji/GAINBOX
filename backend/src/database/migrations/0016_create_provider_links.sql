-- Up Migration

-- The anti-corruption layer: maps a GainBox entity to its id in an external
-- provider (Surfboard today), so core domain tables (merchants, branches,
-- devices, payments) never carry a provider-specific column. This is what
-- makes "replace Surfboard later" a data-model-level guarantee, not just a
-- code-level one.
--
-- Trade-off, stated plainly: `entity_id` is a polymorphic reference (it can
-- point at merchants.id, branches.id, devices.id, or payments.id depending
-- on `entity_type`) and therefore CANNOT be a real foreign key — Postgres
-- has no "FK to one of several tables" construct. Referential integrity for
-- entity_id is enforced at the application layer (in the repository, once
-- implemented), not the database. The alternative — four near-identical
-- tables (merchant_provider_links, branch_provider_links, ...) — would keep
-- FK integrity but duplicate this concern four times; given GainBox's
-- stated goal of a single, clear integration boundary, one polymorphic
-- table was chosen deliberately.
CREATE TABLE provider_links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type  VARCHAR(30) NOT NULL
                 CHECK (entity_type IN ('merchant', 'branch', 'device', 'payment')),
  entity_id    UUID NOT NULL,
  provider     VARCHAR(30) NOT NULL DEFAULT 'surfboard',
  external_id  VARCHAR(255) NOT NULL,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON provider_links
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- One active mapping per entity per provider.
CREATE UNIQUE INDEX provider_links_entity_provider_uq
  ON provider_links (entity_type, entity_id, provider) WHERE deleted_at IS NULL;
-- Reverse lookup: "which GainBox entity does this Surfboard id belong to".
CREATE INDEX provider_links_external_id_idx ON provider_links (provider, external_id);

-- Down Migration

DROP TABLE IF EXISTS provider_links;
