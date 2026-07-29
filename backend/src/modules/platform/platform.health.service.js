import { createRequire } from 'node:module'
import { getPool } from '../../database/connection.js'
import { identityProvider } from '../auth/identityProvider.providers.js'
import { surfboardConfig } from '../../config/surfboard.config.js'
import { env } from '../../config/env.js'
import { logger } from '../../logger/logger.js'

const require = createRequire(import.meta.url)
const { version } = require('../../../package.json')

/**
 * "Expose current health information", not monitoring infrastructure — no
 * background polling, no alerting, no history. Every check below runs
 * fresh, synchronously with the request, and is independently wrapped so
 * one dependency being down never crashes the whole health response —
 * that would defeat the point of a health check.
 */

async function checkDatabase() {
  const startedAt = performance.now()

  try {
    await getPool().query('SELECT 1')
    return { status: 'ok', responseTimeMs: Math.round(performance.now() - startedAt) }
  } catch (error) {
    logger.warn({ err: error }, 'Database connectivity check failed')
    return { status: 'error', message: error.message, responseTimeMs: Math.round(performance.now() - startedAt) }
  }
}

async function checkFirebase() {
  const startedAt = performance.now()
  const result = await identityProvider.checkConnectivity()
  return { ...result, responseTimeMs: Math.round(performance.now() - startedAt) }
}

// Surfboard's HTTP client (surfboard.client.js) has no real request
// implementation yet (every call throws NotImplementedError) — there is
// nothing to actually reach over the network, so this reports that
// honestly instead of faking a real connectivity check.
function checkSurfboard() {
  const configured = Boolean(surfboardConfig.baseUrl && surfboardConfig.apiKey)
  return {
    status: 'not_implemented',
    configured,
    message: 'Surfboard integration has no working HTTP client yet — see surfboard.client.js',
  }
}

// Placeholders per this phase's explicit scope: no queue worker or storage
// service exists in this codebase yet (outbox_events has no consumer — see
// outbox.service.js's own comment to that effect).
function checkQueue() {
  return { status: 'not_implemented', message: 'No queue worker/consumer exists yet (see modules/outbox)' }
}

function checkStorage() {
  return { status: 'not_implemented', message: 'No storage service is configured in this codebase yet' }
}

export const platformHealthService = {
  async getHealth() {
    const startedAt = performance.now()

    const [database, firebase] = await Promise.all([checkDatabase(), checkFirebase()])

    return {
      api: { status: 'ok' },
      database,
      firebase,
      surfboard: checkSurfboard(),
      queue: checkQueue(),
      storage: checkStorage(),
      uptimeSeconds: Math.round(process.uptime()),
      version,
      environment: env.NODE_ENV,
      responseTimeMs: Math.round(performance.now() - startedAt),
    }
  },
}
