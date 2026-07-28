import { env } from './env.js'

/**
 * Shape only — consumed by src/database/connection.js to build a `pg` Pool.
 * DATABASE_URL is optional at this foundation stage so the server can boot
 * before Postgres is provisioned; the connection module itself will refuse
 * to connect without it (see database/connection.js).
 */
export const databaseConfig = {
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_POOL_MAX,
}
