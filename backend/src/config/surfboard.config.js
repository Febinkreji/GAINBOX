import { env } from './env.js'

/**
 * Credential shape only, consumed by surfboard.client.js. No HTTP calls are
 * made from this file or at import time — see
 * src/modules/integrations/surfboard for the (stubbed) client and adapters.
 */
export const surfboardConfig = {
  baseUrl: env.SURFBOARD_BASE_URL,
  apiKey: env.SURFBOARD_API_KEY,
  clientId: env.SURFBOARD_CLIENT_ID,
}
