import { randomUUID } from 'node:crypto'
import { surfboardConfig, assertSurfboardConfigured } from '../../../config/surfboard.config.js'
import { withRetry } from './surfboardRetry.js'
import { mapSurfboardError } from './surfboardError.js'
import { buildSurfboardUrl, buildSurfboardHeaders, parseSurfboardResponseBody } from './surfboardHttp.util.js'
import { logSurfboardCall } from './surfboardLogging.util.js'

/**
 * The one reusable HTTP client every Surfboard adapter (Merchant, Store,
 * Device, Payment) calls through — none of them should build their own
 * fetch/headers/retry logic. This module owns:
 *  - API-KEY/API-SECRET header attachment (buildSurfboardHeaders) —
 *    confirmed static partner credentials, not a fetched Bearer token; see
 *    surfboard.config.js's docstring for why Sprint 1's OAuth assumption
 *    (and the surfboardAuthService call this file used to make) was wrong
 *    and has been removed
 *  - Base URL handling (buildSurfboardUrl)
 *  - Per-request timeout (AbortController)
 *  - JSON parsing
 *  - Request/correlation ids
 *  - Retry-on-transient-failure (surfboardRetry.js)
 *  - Structured logging of every attempt (surfboardLogging.util.js)
 *  - Mapping any failure to an internal domain error (surfboardError.js)
 *    before it ever reaches a caller — a caller of `request()` only ever
 *    sees ExternalServiceError/UnauthorizedError/ValidationError, never a
 *    raw fetch error or Surfboard's own response shape.
 *
 * No business method (createMerchant, createStore, ...) lives here — those
 * stay in their own adapters (surfboardMerchantAdapter.js etc.).
 */
export const surfboardClient = {
  baseUrl: surfboardConfig.baseUrl,

  /**
   * @param {'GET'|'POST'|'PATCH'|'PUT'|'DELETE'} method
   * @param {string} path - e.g. '/partners/{partnerId}/merchants' — joined with baseUrl by buildSurfboardUrl.
   * @param {object} [options]
   * @param {object} [options.payload] - JSON-serialized as the request body, if provided.
   * @param {string} [options.correlationId] - Propagated to Surfboard and to our own logs, for tracing one business operation across multiple calls.
   * @param {object} [options.headers] - Extra headers merged on top of buildSurfboardHeaders()'s
   *   defaults (e.g. Create Order's confirmed `MERCHANT-ID` header) — additive only, since no
   *   confirmed endpoint so far needs to override a base header.
   */
  async request(method, path, { payload, correlationId, headers } = {}) {
    assertSurfboardConfigured()

    const requestId = randomUUID()
    const url = buildSurfboardUrl(path)
    const startedAt = performance.now()
    let retryCount = 0

    try {
      const result = await withRetry(async (attempt) => {
        retryCount = attempt - 1

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), surfboardConfig.requestTimeoutMs)

        try {
          const response = await fetch(url, {
            method,
            headers: { ...buildSurfboardHeaders({ requestId, correlationId }), ...(headers ?? {}) },
            body: payload !== undefined ? JSON.stringify(payload) : undefined,
            signal: controller.signal,
          })

          const text = await response.text()
          const body = parseSurfboardResponseBody(text)

          // TEMPORARY DEBUG LOGGING — remove once the envelope/response-
          // mapping investigation is closed. Pure observation: captured
          // before the existing ok/error branching below, so it reflects
          // every response Surfboard actually sent, regardless of which
          // branch it then takes. Does not alter retry or error handling.
          console.dir(
            {
              '[DEBUG-TEMP] Surfboard HTTP response': {
                url,
                method,
                httpStatus: response.status,
                headers: Object.fromEntries(response.headers.entries()),
                rawBody: text,
                parsedBody: body,
              },
            },
            { depth: null },
          )

          if (!response.ok) {
            const httpError = new Error(`Surfboard responded with ${response.status}`)
            httpError.statusCode = response.status
            httpError.body = body
            throw httpError
          }

          return body
        } finally {
          clearTimeout(timeout)
        }
      })

      logSurfboardCall({ requestId, correlationId, method, path, startedAt, statusCode: 200, retryCount })

      return result
    } catch (error) {
      logSurfboardCall({
        requestId,
        correlationId,
        method,
        path,
        startedAt,
        statusCode: error.statusCode ?? null,
        retryCount,
        error,
      })
      throw mapSurfboardError(error)
    }
  },
}
