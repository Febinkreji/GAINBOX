import { getPool } from '../../database/connection.js'

const SELECT_COLUMNS = `
  id, event_type, aggregate_type, aggregate_id, payload, status, retry_count, created_at, processed_at
`

/**
 * merchantSyncOutbox.worker.js (Sprint 2A) is the first real consumer of
 * this table — everything below `create`/`findPending` was added for it.
 * Kept generic (filtered by `eventType`, not "surfboard" anything) so a
 * future Store/Device sync worker reuses this same repository.
 */
export class OutboxRepository {
  async create({ eventType, aggregateType, aggregateId, payload }, client = getPool()) {
    const result = await client.query(
      `INSERT INTO outbox_events (event_type, aggregate_type, aggregate_id, payload)
       VALUES ($1, $2, $3, $4)
       RETURNING ${SELECT_COLUMNS}`,
      [eventType, aggregateType, aggregateId, payload],
    )

    return result.rows[0]
  }

  async findPending(limit = 50, client = getPool()) {
    const result = await client.query(
      `SELECT ${SELECT_COLUMNS}
       FROM outbox_events
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit],
    )

    return result.rows
  }

  /**
   * The shape every worker actually needs — `findPending` returns every
   * pending event regardless of type, which would make one worker
   * competing with another for the same LIMIT slots (and, worse, marking
   * an event it doesn't understand as processed). Each worker drains only
   * its own event type through this instead.
   */
  async findPendingByEventType(eventType, limit = 20, client = getPool()) {
    const result = await client.query(
      `SELECT ${SELECT_COLUMNS}
       FROM outbox_events
       WHERE status = 'pending' AND event_type = $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [eventType, limit],
    )

    return result.rows
  }

  async markProcessed(id, client = getPool()) {
    const result = await client.query(
      `UPDATE outbox_events SET status = 'processed', processed_at = now() WHERE id = $1
       RETURNING ${SELECT_COLUMNS}`,
      [id],
    )

    return result.rows[0] ?? null
  }

  /**
   * Only for a genuinely unexpected failure *processing* the event (e.g.
   * the DB write itself failed) — an expected business outcome (like
   * today's constant NotImplementedError from the Surfboard adapter) is
   * still a successfully *processed* event, handled by
   * merchantSyncService.attemptSync() internally, never surfaced here.
   */
  async markFailed(id, client = getPool()) {
    const result = await client.query(
      `UPDATE outbox_events SET status = 'failed', retry_count = retry_count + 1 WHERE id = $1
       RETURNING ${SELECT_COLUMNS}`,
      [id],
    )

    return result.rows[0] ?? null
  }

  /**
   * Backing "Pending Events" in the Sync Status view — how many
   * not-yet-processed events exist for this specific entity/event type,
   * so an admin can tell "queued, worker hasn't run yet" apart from
   * "nothing queued at all".
   */
  async countPendingForAggregate(aggregateType, aggregateId, eventType, client = getPool()) {
    const result = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM outbox_events
       WHERE status = 'pending' AND aggregate_type = $1 AND aggregate_id = $2 AND event_type = $3`,
      [aggregateType, aggregateId, eventType],
    )

    return result.rows[0].total
  }
}

export const outboxRepository = new OutboxRepository()
