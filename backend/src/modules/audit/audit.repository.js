import { getPool } from '../../database/connection.js'

/**
 * Write-only by design: audit_logs has no update/delete, and nothing reads
 * it yet — there is no UI or public API for audit history. This repository
 * only executes SQL; the decision of *when* to call it lives in
 * audit.service.js.
 */
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
}

export const auditRepository = new AuditRepository()
