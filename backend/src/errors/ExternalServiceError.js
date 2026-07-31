import { AppError } from './AppError.js'

/**
 * A downstream integration (Surfboard, or any future external provider)
 * failed, timed out, or is unreachable — the caller's request was fine; the
 * problem is on the provider's side or the network between us and them.
 * 502 (Bad Gateway) reflects that distinction from a 500 (our own bug).
 *
 * `provider` identifies which integration failed (e.g. "surfboard"), never
 * the raw upstream response — error mappers (e.g. surfboardError.js) are
 * responsible for translating a provider's actual error body into a safe,
 * human-readable `message` before constructing this.
 */
export class ExternalServiceError extends AppError {
  constructor(message, provider, details) {
    super(message, 502)
    this.provider = provider
    this.details = details
  }
}
