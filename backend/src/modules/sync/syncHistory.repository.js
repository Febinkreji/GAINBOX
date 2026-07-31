import { getPool } from '../../database/connection.js'

/**
 * @typedef {object} SyncHistoryEntry
 * @property {string} id
 * @property {string} entityType - "merchant" | "branch" | "device" | "payment"
 * @property {string} entityId
 * @property {string} provider
 * @property {string} status - "pending" | "running" | "completed" | "failed" | "skipped"
 * @property {string|null} startedAt
 * @property {string|null} finishedAt
 * @property {number|null} durationMs
 * @property {number} attempts
 * @property {string|null} errorMessage
 * @property {string|null} correlationId
 * @property {string} triggeredBy - "system" | "manual"
 * @property {string|null} actorUserId
 * @property {string} createdAt
 * @property {string} updatedAt
 *
 * Pure SQL over `sync_history` (migration 0027). Entity-agnostic by design
 * — Sprint 2A only ever passes entityType='merchant', but nothing here
 * assumes that, so Store/Device sync in a later sprint reuses this
 * repository unchanged. See merchantSync.service.js for the one place
 * Sprint 2A actually calls this with merchant-specific values.
 */

const SELECT_COLUMNS = `
  id, entity_type, entity_id, provider, status, started_at, finished_at, duration_ms,
  attempts, error_message, correlation_id, triggered_by, actor_user_id, created_at, updated_at
`

function mapRow(row) {
  if (!row) return null

  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    provider: row.provider,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    durationMs: row.duration_ms,
    attempts: row.attempts,
    errorMessage: row.error_message,
    correlationId: row.correlation_id,
    triggeredBy: row.triggered_by,
    actorUserId: row.actor_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class SyncHistoryRepository {
  /**
   * @param {object} data
   * @param {'pending'|'running'|'skipped'} data.status - "completed"/"failed" are
   *   never the *initial* status of a row — they're only reached via
   *   markCompleted/markFailed on a row that already exists.
   */
  async create(
    { entityType, entityId, provider, status, correlationId, triggeredBy = 'system', actorUserId },
    client = getPool(),
  ) {
    const isTerminalOrRunning = status === 'running' || status === 'skipped'

    const result = await client.query(
      `INSERT INTO sync_history (
         entity_type, entity_id, provider, status, started_at, finished_at, duration_ms,
         attempts, correlation_id, triggered_by, actor_user_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING ${SELECT_COLUMNS}`,
      [
        entityType,
        entityId,
        provider,
        status,
        isTerminalOrRunning ? new Date() : null,
        status === 'skipped' ? new Date() : null,
        status === 'skipped' ? 0 : null,
        status === 'running' ? 1 : 0,
        correlationId ?? null,
        triggeredBy,
        actorUserId ?? null,
      ],
    )

    return mapRow(result.rows[0])
  }

  async findById(id, client = getPool()) {
    const result = await client.query(`SELECT ${SELECT_COLUMNS} FROM sync_history WHERE id = $1`, [id])

    return mapRow(result.rows[0])
  }

  /**
   * Transitions a `pending` row (created at merchant-creation time, before
   * the worker ever picks it up) into `running` — see
   * merchantSyncOutbox.worker.js. No-op guard via `WHERE status = 'pending'`
   * so calling this twice for the same row can't double-count `attempts`.
   */
  async markRunning(id, client = getPool()) {
    const result = await client.query(
      `UPDATE sync_history
       SET status = 'running', started_at = now(), attempts = attempts + 1
       WHERE id = $1 AND status = 'pending'
       RETURNING ${SELECT_COLUMNS}`,
      [id],
    )

    return mapRow(result.rows[0])
  }

  async markCompleted(id, { durationMs }, client = getPool()) {
    const result = await client.query(
      `UPDATE sync_history
       SET status = 'completed', finished_at = now(), duration_ms = $2
       WHERE id = $1
       RETURNING ${SELECT_COLUMNS}`,
      [id, durationMs ?? null],
    )

    return mapRow(result.rows[0])
  }

  async markFailed(id, { durationMs, errorMessage }, client = getPool()) {
    const result = await client.query(
      `UPDATE sync_history
       SET status = 'failed', finished_at = now(), duration_ms = $2, error_message = $3
       WHERE id = $1
       RETURNING ${SELECT_COLUMNS}`,
      [id, durationMs ?? null, errorMessage ?? null],
    )

    return mapRow(result.rows[0])
  }

  /**
   * `errorMessage` is reused to carry the skip reason (e.g. "provider
   * mapping already exists") — there's no separate free-text column for
   * non-error context, and a skip is still useful to explain in the same
   * place an admin would already look for why an attempt didn't complete.
   */
  async markSkipped(id, { reason }, client = getPool()) {
    const result = await client.query(
      `UPDATE sync_history
       SET status = 'skipped', started_at = COALESCE(started_at, now()), finished_at = now(),
           duration_ms = 0, error_message = $2
       WHERE id = $1
       RETURNING ${SELECT_COLUMNS}`,
      [id, reason ?? null],
    )

    return mapRow(result.rows[0])
  }

  /** The row every Sync Status view reads — "what happened last time". */
  async findLatestForEntity(entityType, entityId, provider, client = getPool()) {
    const result = await client.query(
      `SELECT ${SELECT_COLUMNS}
       FROM sync_history
       WHERE entity_type = $1 AND entity_id = $2 AND provider = $3
       ORDER BY created_at DESC
       LIMIT 1`,
      [entityType, entityId, provider],
    )

    return mapRow(result.rows[0])
  }

  async findByEntity(entityType, entityId, provider, pagination, client = getPool()) {
    const result = await client.query(
      `SELECT ${SELECT_COLUMNS}
       FROM sync_history
       WHERE entity_type = $1 AND entity_id = $2 AND provider = $3
       ORDER BY created_at DESC
       LIMIT $4 OFFSET $5`,
      [entityType, entityId, provider, pagination.pageSize, pagination.offset],
    )

    return result.rows.map(mapRow)
  }

  async countByEntity(entityType, entityId, provider, client = getPool()) {
    const result = await client.query(
      `SELECT COUNT(*)::int AS total FROM sync_history WHERE entity_type = $1 AND entity_id = $2 AND provider = $3`,
      [entityType, entityId, provider],
    )

    return result.rows[0].total
  }

  /**
   * Platform-wide listing (GET .../merchants/history) — every filter is
   * optional; `entityId` narrows it to one entity without needing a
   * different endpoint (see merchantSync.controller.js's `?merchantId=`).
   */
  async findAll(filters, pagination, client = getPool()) {
    const result = await client.query(
      `SELECT ${SELECT_COLUMNS}
       FROM sync_history
       WHERE ($1::varchar IS NULL OR entity_type = $1)
         AND ($2::uuid IS NULL OR entity_id = $2)
         AND ($3::varchar IS NULL OR provider = $3)
         AND ($4::varchar IS NULL OR status = $4)
       ORDER BY created_at DESC
       LIMIT $5 OFFSET $6`,
      [
        filters.entityType ?? null,
        filters.entityId ?? null,
        filters.provider ?? null,
        filters.status ?? null,
        pagination.pageSize,
        pagination.offset,
      ],
    )

    return result.rows.map(mapRow)
  }

  async count(filters, client = getPool()) {
    const result = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM sync_history
       WHERE ($1::varchar IS NULL OR entity_type = $1)
         AND ($2::uuid IS NULL OR entity_id = $2)
         AND ($3::varchar IS NULL OR provider = $3)
         AND ($4::varchar IS NULL OR status = $4)`,
      [filters.entityType ?? null, filters.entityId ?? null, filters.provider ?? null, filters.status ?? null],
    )

    return result.rows[0].total
  }
}

export const syncHistoryRepository = new SyncHistoryRepository()
