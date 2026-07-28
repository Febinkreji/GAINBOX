import { getPool } from '../../database/connection.js'

export class IdempotencyRepository {
  async findByKey(idempotencyKey, client = getPool()) {
    const result = await client.query(
      `SELECT id, idempotency_key, request_hash, response_snapshot, status, expires_at, created_at, updated_at
       FROM idempotency_keys
       WHERE idempotency_key = $1`,
      [idempotencyKey],
    )

    return result.rows[0] ?? null
  }

  async create({ idempotencyKey, requestHash, expiresAt }, client = getPool()) {
    const result = await client.query(
      `INSERT INTO idempotency_keys (idempotency_key, request_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id, idempotency_key, request_hash, response_snapshot, status, expires_at, created_at, updated_at`,
      [idempotencyKey, requestHash, expiresAt],
    )

    return result.rows[0]
  }

  // Not called yet — this is what replay logic will use once implemented
  // (see idempotency.service.js#replay) to persist the final response.
  async updateResponse(idempotencyKey, { status, responseSnapshot }, client = getPool()) {
    const result = await client.query(
      `UPDATE idempotency_keys
       SET status = $2, response_snapshot = $3
       WHERE idempotency_key = $1
       RETURNING id, idempotency_key, request_hash, response_snapshot, status, expires_at, created_at, updated_at`,
      [idempotencyKey, status, responseSnapshot],
    )

    return result.rows[0] ?? null
  }
}

export const idempotencyRepository = new IdempotencyRepository()
