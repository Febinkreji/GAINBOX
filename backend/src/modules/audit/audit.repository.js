import { getPool } from '../../database/connection.js'

/**
 * `record` is the only write path — audit_logs has no update/delete, and
 * this file never gains one; Platform Control Center's Audit Explorer
 * (Phase 3) only ADDS read methods below. The decision of *when* to write
 * still lives entirely in audit.service.js/domain services; nothing about
 * that path changes here.
 */

const LIST_WHERE_CLAUSE = `
  ($1::varchar IS NULL OR al.entity_type = $1)
  AND ($2::uuid IS NULL OR al.entity_id = $2)
  AND ($3::uuid IS NULL OR al.actor_user_id = $3)
  AND ($4::varchar IS NULL OR al.action = $4)
  -- audit_logs has no severity column (see migration 0017) — this reads
  -- metadata->>'severity' instead, so it costs nothing for current data
  -- (which never sets it) while being ready if a future audit.record()
  -- call ever starts including one.
  AND ($5::varchar IS NULL OR al.metadata->>'severity' = $5)
  AND ($6::timestamptz IS NULL OR al.created_at >= $6)
  AND ($7::timestamptz IS NULL OR al.created_at <= $7)
  AND (
    $8::text IS NULL
    OR al.action ILIKE '%' || $8 || '%'
    OR al.entity_type ILIKE '%' || $8 || '%'
    OR al.metadata::text ILIKE '%' || $8 || '%'
  )
`

function mapRow(row) {
  if (!row) return null

  return {
    id: row.id,
    timestamp: row.created_at,
    actor: row.actor_user_id ? { id: row.actor_user_id, displayName: row.actor_display_name, email: row.actor_email } : null,
    entity: { type: row.entity_type, id: row.entity_id },
    action: row.action,
    metadata: row.metadata,
    // audit_logs' write path (record(), untouched by this task) only ever
    // captures one snapshot per entry — never a paired before/after state
    // (an update entry stores `{changes: data}`, not the row's prior
    // values). `before` is therefore always null here: an honest
    // reflection of what's actually recorded, not a fabricated distinction.
    before: null,
    after: row.metadata,
  }
}

export class AuditRepository {
  async record({ entityType, entityId, action, actorUserId, metadata }, client = getPool()) {
    const result = await client.query(
      `INSERT INTO audit_logs (entity_type, entity_id, action, actor_user_id, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, entity_type, entity_id, action, actor_user_id, metadata, created_at`,
      [entityType, entityId, action, actorUserId ?? null, metadata ?? null],
    )

    return result.rows[0]
  }

  async findById(id, client = getPool()) {
    const result = await client.query(
      `SELECT al.id, al.entity_type, al.entity_id, al.action, al.actor_user_id, al.metadata, al.created_at,
              u.display_name AS actor_display_name, u.email AS actor_email
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_user_id
       WHERE al.id = $1`,
      [id],
    )

    return mapRow(result.rows[0])
  }

  async findAll(filters, pagination, client = getPool()) {
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC'

    const result = await client.query(
      `SELECT al.id, al.entity_type, al.entity_id, al.action, al.actor_user_id, al.metadata, al.created_at,
              u.display_name AS actor_display_name, u.email AS actor_email
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_user_id
       WHERE ${LIST_WHERE_CLAUSE}
       ORDER BY al.created_at ${sortOrder}
       LIMIT $9 OFFSET $10`,
      [
        filters.entityType ?? null,
        filters.entityId ?? null,
        filters.actorUserId ?? null,
        filters.action ?? null,
        filters.severity ?? null,
        filters.dateFrom ?? null,
        filters.dateTo ?? null,
        filters.search ?? null,
        pagination.pageSize,
        pagination.offset,
      ],
    )

    return result.rows.map(mapRow)
  }

  async count(filters, client = getPool()) {
    const result = await client.query(
      `SELECT COUNT(*)::int AS total FROM audit_logs al WHERE ${LIST_WHERE_CLAUSE}`,
      [
        filters.entityType ?? null,
        filters.entityId ?? null,
        filters.actorUserId ?? null,
        filters.action ?? null,
        filters.severity ?? null,
        filters.dateFrom ?? null,
        filters.dateTo ?? null,
        filters.search ?? null,
      ],
    )

    return result.rows[0].total
  }
}

export const auditRepository = new AuditRepository()
