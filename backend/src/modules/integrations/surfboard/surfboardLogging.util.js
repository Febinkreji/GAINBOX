import { logger } from '../../../logger/logger.js'

/**
 * Step 6: structured logging for every Surfboard interaction, reusing the
 * shared pino logger (see logger/logger.js) rather than a separate
 * transport — Surfboard logs show up in the exact same place and format as
 * every other module's logs.
 *
 * Deliberately takes no `accessToken`/`clientSecret`/`token` parameter at
 * all — there is no field in this function's signature a caller could even
 * accidentally pass a credential into, so "never log secrets" is enforced
 * by the shape of the function, not by remembering to redact one.
 */
export function logSurfboardCall({ requestId, correlationId, method, path, startedAt, statusCode, retryCount, error }) {
  const durationMs = Math.round(performance.now() - startedAt)

  const fields = {
    timestamp: new Date().toISOString(),
    requestId,
    correlationId: correlationId ?? null,
    endpoint: path,
    method,
    durationMs,
    statusCode: statusCode ?? null,
    retryCount,
  }

  if (error) {
    // Deliberately NOT `err: error` — pino's default error serializer walks
    // every enumerable own property of the Error, and the raw HTTP errors
    // this module throws internally carry `.body` (Surfboard's actual
    // response payload, attached for surfboardError.js's mapper to read) —
    // logging the error object as-is would print that raw provider body
    // straight into our own logs. Log only a minimal, safe summary instead.
    logger.warn({ ...fields, errorName: error.name, errorMessage: error.message }, 'Surfboard request failed')
    return
  }

  logger.info(fields, 'Surfboard request completed')
}
