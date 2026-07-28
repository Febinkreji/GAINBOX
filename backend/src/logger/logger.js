import pino from 'pino'
import { env, isDevelopment } from '../config/env.js'

/**
 * Structured JSON logging in production (for log aggregators), pretty-printed
 * in development (for humans). Every other module should import this
 * singleton rather than instantiating its own logger.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
      }
    : undefined,
})
