/**
 * Wraps an async Express handler so a rejected promise is forwarded to
 * `next(error)` instead of crashing the process. Every controller method
 * should be wrapped with this rather than using try/catch individually.
 */
export function asyncHandler(handler) {
  return function wrapped(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}
