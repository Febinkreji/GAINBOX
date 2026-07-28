import { AppError } from './AppError.js'

/**
 * Thrown by every stub repository/service/adapter method in this foundation.
 * Mirrors the frontend's services/notImplemented.js so a developer hitting
 * an unfinished endpoint sees the same kind of message on both ends of the
 * stack, instead of a silent no-op or a generic 500.
 */
export class NotImplementedError extends AppError {
  constructor(feature) {
    super(`${feature} is not implemented yet.`, 501)
  }
}
