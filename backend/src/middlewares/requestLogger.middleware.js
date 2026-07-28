import pinoHttp from 'pino-http'
import { logger } from '../logger/logger.js'

/**
 * Logs every request/response with a correlation id, using the shared
 * logger instance so request logs and application logs share one format.
 */
export const requestLogger = pinoHttp({ logger })
