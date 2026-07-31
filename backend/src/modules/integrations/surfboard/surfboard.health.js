import { isSurfboardConfigured } from '../../../config/surfboard.config.js'

/**
 * Exposed through the existing Platform health endpoint (see
 * platform.health.service.js's checkSurfboard(), which just calls this) —
 * no new route is added for this.
 *
 * This used to fetch an OAuth token as a cheap connectivity probe — that
 * assumption is now confirmed wrong (see surfboard.config.js's docstring:
 * real auth is a static API-KEY/API-SECRET header pair, not a token
 * exchange), so there is no side-effect-free Surfboard endpoint this
 * codebase can confirm connectivity against yet. Firing a real business
 * call (e.g. Merchant Creation) just to test health would have real side
 * effects — not acceptable for a health check. This honestly reports
 * "configured" without claiming to have verified live connectivity, rather
 * than silently calling something wrong or guessing at a ping endpoint.
 */
export async function checkSurfboardHealth() {
  if (!isSurfboardConfigured()) {
    return {
      status: 'not_configured',
      configured: false,
      authenticated: false,
      message: 'SURFBOARD_BASE_URL, SURFBOARD_PARTNER_ID, SURFBOARD_API_KEY, and SURFBOARD_API_SECRET are not all set',
    }
  }

  return {
    status: 'configured',
    configured: true,
    authenticated: null,
    message: 'Credentials are configured; live connectivity has not been verified — no confirmed side-effect-free endpoint exists yet to check it against',
  }
}
