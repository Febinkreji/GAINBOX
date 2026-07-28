import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPool, closePool } from '../src/database/connection.js'
import { logger } from '../src/logger/logger.js'

/**
 * Runs every .sql file in src/database/seeds, in filename order. Each seed
 * is written to be idempotent (ON CONFLICT DO NOTHING), so re-running this
 * script is always safe. Separate from migrations on purpose: migrations
 * define schema, seeds populate foundational reference data — different
 * concerns, different tools (node-pg-migrate has no seed feature).
 *
 * Not executed as part of this task — see task constraints ("Do NOT connect
 * PostgreSQL"). Run manually later with `npm run seed` once DATABASE_URL
 * points at a real database.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SEEDS_DIR = path.resolve(__dirname, '../src/database/seeds')

async function runSeeds() {
  const pool = getPool()
  const files = (await readdir(SEEDS_DIR)).filter((file) => file.endsWith('.sql')).sort()

  for (const file of files) {
    const sql = await readFile(path.join(SEEDS_DIR, file), 'utf-8')
    logger.info(`Running seed: ${file}`)
    await pool.query(sql)
  }

  logger.info(`Seeding complete (${files.length} file(s))`)
}

runSeeds()
  .catch((error) => {
    logger.error({ err: error }, 'Seeding failed')
    process.exitCode = 1
  })
  .finally(closePool)
