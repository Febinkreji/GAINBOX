import pg from 'pg'
import { databaseConfig } from '../config/database.config.js'
import { logger } from '../logger/logger.js'

const { Pool } = pg

let pool

/**
 * Lazily creates the shared connection pool on first use. No query is ever
 * issued from this module — repositories will import `getPool()` once they
 * have real SQL to run. Foundation stage only: this lets the server boot
 * without Postgres being provisioned yet, while still failing loudly the
 * moment something actually tries to query without DATABASE_URL configured.
 */
export function getPool() {
  if (!databaseConfig.connectionString) {
    throw new Error('DATABASE_URL is not configured — cannot open a Postgres connection pool.')
  }

  if (!pool) {
    pool = new Pool(databaseConfig)
    pool.on('error', (error) => {
      logger.error({ err: error }, 'Unexpected error on idle Postgres client')
    })
  }

  return pool
}

export async function closePool() {
  if (pool) {
    await pool.end()
    pool = undefined
  }
}

/**
 * Runs `callback` with a single client held for the duration of a
 * transaction (BEGIN/COMMIT/ROLLBACK). Needed anywhere a service writes to
 * more than one table and both writes must succeed or fail together —
 * e.g. creating a merchant alongside its audit log entry and outbox event.
 * `pool.query()` alone can't provide this: each call may be served by a
 * different pooled connection, which would break transaction semantics.
 */
export async function withTransaction(callback) {
  const client = await getPool().connect()

  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
