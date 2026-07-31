import { getPool } from '../../database/connection.js'

/**
 * @typedef {object} ProviderLink
 * @property {string} id
 * @property {string} entityType - "merchant" | "branch" | "device" | "payment"
 * @property {string} entityId
 * @property {string} provider - "surfboard" today (see migration 0016)
 * @property {string} externalId
 * @property {object|null} metadata
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string|null} deletedAt
 *
 * Pure SQL over the existing `provider_links` table (migration 0016) — no
 * new table, no new column on merchants. `entity_id` is polymorphic (see
 * that migration's own comment on why it can't be a real FK), so every
 * method here takes `entityType` explicitly rather than assuming which
 * table `entityId` belongs to.
 */

const SELECT_COLUMNS = `
  id, entity_type, entity_id, provider, external_id, metadata, created_at, updated_at, deleted_at
`

function mapRow(row) {
  if (!row) return null

  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    provider: row.provider,
    externalId: row.external_id,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }
}

export class ProviderLinkRepository {
  async create({ entityType, entityId, provider, externalId, metadata }, client = getPool()) {
    const result = await client.query(
      `INSERT INTO provider_links (entity_type, entity_id, provider, external_id, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${SELECT_COLUMNS}`,
      [entityType, entityId, provider, externalId, metadata ?? null],
    )

    return mapRow(result.rows[0])
  }

  async findById(id, client = getPool()) {
    const result = await client.query(
      `SELECT ${SELECT_COLUMNS} FROM provider_links WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    )

    return mapRow(result.rows[0])
  }

  /**
   * The one-active-mapping-per-entity-per-provider lookup — same shape the
   * unique index (`provider_links_entity_provider_uq`) enforces, so this
   * can never return more than one row.
   */
  async findByEntity(entityType, entityId, provider, client = getPool()) {
    const result = await client.query(
      `SELECT ${SELECT_COLUMNS}
       FROM provider_links
       WHERE entity_type = $1 AND entity_id = $2 AND provider = $3 AND deleted_at IS NULL`,
      [entityType, entityId, provider],
    )

    return mapRow(result.rows[0])
  }

  /**
   * Reverse lookup — "which GainBox entity does this provider's id belong
   * to" — using the same index the migration built specifically for this
   * (`provider_links_external_id_idx`). Not called by anything yet, but
   * this is exactly what a future inbound webhook handler will need.
   */
  async findByExternalId(provider, externalId, client = getPool()) {
    const result = await client.query(
      `SELECT ${SELECT_COLUMNS}
       FROM provider_links
       WHERE provider = $1 AND external_id = $2 AND deleted_at IS NULL`,
      [provider, externalId],
    )

    return mapRow(result.rows[0])
  }

  async findByProvider(provider, pagination, client = getPool()) {
    const result = await client.query(
      `SELECT ${SELECT_COLUMNS}
       FROM provider_links
       WHERE provider = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [provider, pagination.pageSize, pagination.offset],
    )

    return result.rows.map(mapRow)
  }

  async countByProvider(provider, client = getPool()) {
    const result = await client.query(
      `SELECT COUNT(*)::int AS total FROM provider_links WHERE provider = $1 AND deleted_at IS NULL`,
      [provider],
    )

    return result.rows[0].total
  }

  async update(id, { externalId, metadata }, client = getPool()) {
    const assignments = []
    const values = []
    let index = 1

    if (externalId !== undefined) {
      assignments.push(`external_id = $${index}`)
      values.push(externalId)
      index += 1
    }

    if (metadata !== undefined) {
      assignments.push(`metadata = $${index}`)
      values.push(metadata)
      index += 1
    }

    values.push(id)

    const result = await client.query(
      `UPDATE provider_links
       SET ${assignments.join(', ')}
       WHERE id = $${index} AND deleted_at IS NULL
       RETURNING ${SELECT_COLUMNS}`,
      values,
    )

    return mapRow(result.rows[0])
  }

  async softDelete(id, client = getPool()) {
    const result = await client.query(
      `UPDATE provider_links SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
      [id],
    )

    return result.rows[0] ?? null
  }
}

export const providerLinkRepository = new ProviderLinkRepository()
