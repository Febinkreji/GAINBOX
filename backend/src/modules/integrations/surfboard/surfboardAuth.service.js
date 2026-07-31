import { randomUUID } from 'node:crypto'
import { surfboardConfig, assertSurfboardConfigured } from '../../../config/surfboard.config.js'
import { withRetry } from './surfboardRetry.js'
import { mapSurfboardError } from './surfboardError.js'
import { buildSurfboardAuthHeaders, parseSurfboardResponseBody } from './surfboardHttp.util.js'
import { logSurfboardCall } from './surfboardLogging.util.js'

/**
 * NOT used by any confirmed partner/admin endpoint (Merchant Creation,
 * Merchant Functions, Multi Merchant Group) — those authenticate with a
 * static `API-KEY`/`API-SECRET` header pair instead (see
 * surfboard.config.js's docstring and surfboardHttp.util.js's
 * buildSurfboardHeaders()), confirmed directly against the Developer
 * Portal during Sprint 2B-1. surfboard.client.js no longer calls this
 * file at all.
 *
 * This was Sprint 1's unconfirmed OAuth client-credentials guess, written
 * before any real docs were available. Left in place, unused, rather than
 * deleted, because the Developer Portal *does* have a separate, genuinely
 * different "Client Auth Token" endpoint for customer-facing (not partner/
 * admin) requests — confirmed shape: `POST /partners/{partnerId}/token`
 * with a JSON body `{ providerId, providerCertificate, externalUserId }`,
 * explicitly documented as unusable for administrative tasks like creating
 * merchants. That is NOT what's implemented below (this still assumes a
 * form-encoded grant_type=client_credentials exchange at `/oauth/token`,
 * which is wrong for that endpoint too) — this file needs a full rewrite,
 * not a header fix, whenever that customer-facing flow is actually built.
 */
const TOKEN_PATH = '/oauth/token'

// Refresh a little before the token actually expires, so a request that
// starts using it doesn't race an expiry that happens mid-flight.
const EXPIRY_SAFETY_MARGIN_MS = 30_000

let cachedToken = null // { accessToken, expiresAt }
let refreshPromise = null // in-flight de-duplication

function isCacheValid() {
  return Boolean(cachedToken) && cachedToken.expiresAt - EXPIRY_SAFETY_MARGIN_MS > Date.now()
}

async function requestNewToken() {
  const requestId = randomUUID()
  const url = `${surfboardConfig.baseUrl.replace(/\/+$/, '')}${TOKEN_PATH}`
  const startedAt = performance.now()
  let retryCount = 0

  try {
    const body = await withRetry(async (attempt) => {
      retryCount = attempt - 1

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), surfboardConfig.requestTimeoutMs)

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: buildSurfboardAuthHeaders({ requestId }),
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: surfboardConfig.apiKey,
            client_secret: surfboardConfig.apiSecret,
          }),
          signal: controller.signal,
        })

        const text = await response.text()
        const parsed = parseSurfboardResponseBody(text)

        if (!response.ok) {
          const httpError = new Error(`Surfboard token request responded with ${response.status}`)
          httpError.statusCode = response.status
          httpError.body = parsed
          throw httpError
        }

        return parsed
      } finally {
        clearTimeout(timeout)
      }
    })

    logSurfboardCall({ requestId, method: 'POST', path: TOKEN_PATH, startedAt, statusCode: 200, retryCount })

    return {
      accessToken: body.access_token,
      expiresAt: Date.now() + (body.expires_in ?? 300) * 1000,
    }
  } catch (error) {
    logSurfboardCall({
      requestId,
      method: 'POST',
      path: TOKEN_PATH,
      startedAt,
      statusCode: error.statusCode ?? null,
      retryCount,
      error,
    })
    throw mapSurfboardError(error)
  }
}

export const surfboardAuthService = {
  /**
   * Returns a valid access token, refreshing it first if there is no
   * cached one or the cached one is at/near expiry. Concurrent callers
   * during a refresh share the same in-flight request rather than each
   * firing their own token request.
   */
  async getAccessToken() {
    assertSurfboardConfigured()

    if (isCacheValid()) {
      return cachedToken.accessToken
    }

    if (!refreshPromise) {
      refreshPromise = requestNewToken()
        .then((token) => {
          cachedToken = token
          return token.accessToken
        })
        .finally(() => {
          refreshPromise = null
        })
    }

    return refreshPromise
  },
}
