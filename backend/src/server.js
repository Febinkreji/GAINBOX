import { createApp } from './app.js'
import { env } from './config/env.js'
import { logger } from './logger/logger.js'
import { closePool } from './database/connection.js'

const app = createApp()

const server = app.listen(env.PORT, () => {
  logger.info(`GainBox API listening on port ${env.PORT} (${env.NODE_ENV})`)
})

async function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully`)
  server.close(async () => {
    await closePool()
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
