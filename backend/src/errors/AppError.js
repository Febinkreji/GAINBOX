/**
 * Base class for every error the app throws intentionally ("operational"
 * errors — a missing record, bad input, an expired token — as opposed to a
 * genuine bug). errorHandler.middleware.js checks `isOperational` to decide
 * whether to expose `message` to the client or hide it behind a generic
 * "Internal Server Error".
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.isOperational = isOperational
    Error.captureStackTrace(this, this.constructor)
  }
}
