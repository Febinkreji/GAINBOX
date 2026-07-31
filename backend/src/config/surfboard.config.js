import { env } from './env.js'

/**
 * Credential/config shape for the Surfboard integration (see
 * src/modules/integrations/surfboard). Every field a Surfboard API needs is
 * read from `env` exactly once, here, matching every other config module in
 * this codebase (database.config.js, firebase.config.js).
 *
 * Confirmed directly against the Surfboard Developer Portal (Merchant
 * Creation scenario, Headers tab) during Sprint 2B-1 — this replaces
 * Sprint 1's unconfirmed OAuth client-credentials assumption:
 *  - Authentication is two static headers, `API-KEY` and `API-SECRET` — not
 *    a Bearer token obtained via a grant exchange. See
 *    surfboardHttp.util.js's buildSurfboardHeaders().
 *  - Every confirmed endpoint (Merchant Creation, Merchant Functions, Multi
 *    Merchant Group, Client Auth Token) is scoped under
 *    `/api/partners/{partnerId}/...` — `partnerId` is an account-level
 *    identifier, not a per-request value, so it belongs here alongside the
 *    credentials rather than being threaded through every adapter call.
 *  - No version segment appears in any confirmed URL (`/api/partners/...`,
 *    never `/api/v1/partners/...`) — `apiVersion` has been removed rather
 *    than kept as a now-provably-wrong assumption. See
 *    surfboardHttp.util.js's buildSurfboardUrl().
 *
 * Unlike firebase.config.js, this file also owns the "is it usable" check
 * (isSurfboardConfigured/assertSurfboardConfigured): Surfboard has no
 * single adapter file the way Firebase has firebaseIdentityAdapter.js — the
 * HTTP client and the health check both need the same check, so it lives
 * once here rather than being duplicated in each.
 */
export const surfboardConfig = {
  baseUrl: env.SURFBOARD_BASE_URL,
  partnerId: env.SURFBOARD_PARTNER_ID,
  apiKey: env.SURFBOARD_API_KEY,
  apiSecret: env.SURFBOARD_API_SECRET,
  requestTimeoutMs: env.SURFBOARD_REQUEST_TIMEOUT_MS,
  // Account-level billing plan id (Create Merchant's
  // controlFields.transactionPricingPlan) — same "belongs in config, not
  // threaded per-request" reasoning as partnerId above.
  transactionPricingPlan: env.SURFBOARD_TRANSACTION_PRICING_PLAN,
}

export function isSurfboardConfigured() {
  return Boolean(
    surfboardConfig.baseUrl && surfboardConfig.partnerId && surfboardConfig.apiKey && surfboardConfig.apiSecret,
  )
}

/**
 * Lazy fail-fast: the server boots fine with Surfboard fully unconfigured
 * (same deliberate choice as Firebase — see firebaseIdentityAdapter.js's
 * isConfigured()), and this throws a clear, immediate error the moment
 * anything actually tries to use the integration, rather than surfacing as
 * a confusing timeout or a generic 500 deep inside a fetch call. A plain
 * Error, not an AppError: missing config is a deployment mistake (ours),
 * not a caller's fault, so it should surface as a 500 if it ever escapes
 * to an HTTP response, not any client-facing status code.
 */
export function assertSurfboardConfigured() {
  if (!isSurfboardConfigured()) {
    throw new Error(
      'Surfboard integration is not configured — set SURFBOARD_BASE_URL, SURFBOARD_PARTNER_ID, SURFBOARD_API_KEY, and SURFBOARD_API_SECRET.',
    )
  }
}
