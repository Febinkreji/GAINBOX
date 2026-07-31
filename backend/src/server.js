import { createApp } from './app.js'
import { env } from './config/env.js'
import { logger } from './logger/logger.js'
import { closePool } from './database/connection.js'
import { runPlatformAdminBootstrap } from './bootstrap/platformAdminBootstrap.js'
import { startMerchantSyncWorker, stopMerchantSyncWorker } from './modules/merchantSync/merchantSyncOutbox.worker.js'

const app = createApp()

// Runs before the server accepts traffic, but never blocks it from
// starting — see platformAdminBootstrap.js's own try/catch for why a
// bootstrap failure is always logged, never thrown.
await runPlatformAdminBootstrap()

const server = app.listen(env.PORT, () => {
  logger.info(`GainBox API listening on port ${env.PORT} (${env.NODE_ENV})`)
})

// The Merchant Integration Framework's outbox drain (Sprint 2A) — runs
// regardless of whether Surfboard is configured, since draining an event
// just means recording that the (stub) adapter was called, not that
// Surfboard was actually reached.
startMerchantSyncWorker()

async function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully`)
  stopMerchantSyncWorker()
  server.close(async () => {
    await closePool()
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
