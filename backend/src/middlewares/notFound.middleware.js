import { NotFoundError } from '../errors/index.js'

/**
 * Catches any request that matched no route. Placed after all mounted
 * routers, before the error handler.
 */
export function notFound(req, _res, next) {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`))
}
