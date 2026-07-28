import { isProduction } from '../config/env.js'
import { logger } from '../logger/logger.js'

/**
 * Single place every thrown/forwarded error ends up. Operational errors
 * (AppError and its subclasses) expose their own message; anything else is
 * logged in full but returned to the client as a generic 500 so internal
 * details never leak.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  const isOperational = error.isOperational === true
  const statusCode = isOperational ? error.statusCode : 500
  const message = isOperational ? error.message : 'Internal server error'

  logger.error({ err: error, statusCode }, message)

  res.status(statusCode).json({
    success: false,
    message,
    ...(error.details ? { details: error.details } : {}),
    ...(!isProduction && !isOperational ? { stack: error.stack } : {}),
  })
}
