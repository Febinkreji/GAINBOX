import { ExternalServiceError, UnauthorizedError, ValidationError } from '../../../errors/index.js'

/**
 * Translates a raw failure from surfboard.client.js's request() (an HTTP
 * error with `.statusCode`/`.body`, or a network-level Error from fetch
 * itself) into one of this codebase's existing domain error classes. Every
 * Surfboard adapter should let its errors pass through this mapper rather
 * than throwing raw fetch/HTTP errors — so a caller (e.g.
 * merchantSync.service.js) only ever has to handle the same AppError
 * subclasses it already handles everywhere else.
 *
 * `providerMessage()` is confirmed against a real sandbox response
 * (Merchant Creation, 400): `{ "status": "ERROR", "message": "Cannot
 * create merchant application with error - Partner has none or more than
 * one plan. Please provide transaction pricing plan." }`. That `message`
 * is a caller-facing business explanation (Surfboard's own docs describe
 * it as "a message that describes the status of the request"), not a
 * secret — surfacing it is strictly more useful than the generic string
 * Sprint 1 threw away. `details` still deliberately excludes the rest of
 * the raw provider body (errorHandler.middleware.js exposes `details` to
 * the client) — only the upstream status code and this one message field.
 */
function providerMessage(error, fallback) {
  return error?.body?.message || fallback
}

export function mapSurfboardError(error) {
  if (error?.name === 'AbortError') {
    return new ExternalServiceError('Surfboard request timed out', 'surfboard')
  }

  const statusCode = error?.statusCode

  if (typeof statusCode !== 'number') {
    // No HTTP response at all — DNS failure, connection refused/reset, or
    // any other network-layer error withRetry gave up on.
    return new ExternalServiceError('Could not reach Surfboard', 'surfboard')
  }

  if (statusCode === 401 || statusCode === 403) {
    return new UnauthorizedError(providerMessage(error, 'Surfboard rejected our credentials'))
  }

  if (statusCode === 400 || statusCode === 422) {
    return new ValidationError(providerMessage(error, 'Surfboard rejected the request as invalid'), {
      upstreamStatus: statusCode,
    })
  }

  if (statusCode === 429) {
    return new ExternalServiceError(providerMessage(error, 'Surfboard rate limit exceeded'), 'surfboard', {
      upstreamStatus: statusCode,
    })
  }

  if (statusCode >= 500) {
    return new ExternalServiceError(providerMessage(error, 'Surfboard is temporarily unavailable'), 'surfboard', {
      upstreamStatus: statusCode,
    })
  }

  return new ExternalServiceError(providerMessage(error, 'Surfboard request failed'), 'surfboard', {
    upstreamStatus: statusCode,
  })
}
