import { getPool } from '../../database/connection.js'

/**
 * No worker reads `findPending` yet — it exists so the repository's shape
 * is already right for whichever future process drains this table. This
 * repository only executes SQL.
 */
export class OutboxRepository {
  async create({ eventType, aggregateType, aggregateId, payload }, client = getPool()) {
    const result = await client.query(
      `INSERT INTO outbox_events (event_type, aggregate_type, aggregate_id, payload)
       VALUES ($1, $2, $3, $4)
       RETURNING id, event_type, aggregate_type, aggregate_id, payload, status, retry_count, created_at, processed_at`,
      [eventType, aggregateType, aggregateId, payload],
    )

    return result.rows[0]
  }

  async findPending(limit = 50, client = getPool()) {
    const result = await client.query(
      `SELECT id, event_type, aggregate_type, aggregate_id, payload, status, retry_count, created_at, processed_at
       FROM outbox_events
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit],
    )

    return result.rows
  }
}

export const outboxRepository = new OutboxRepository()
