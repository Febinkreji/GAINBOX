import { notImplemented } from '@/services/notImplemented'

/**
 * Auth domain service.
 *
 * Surfboard capability covered here:
 * - Client Authentication Token — secure authentication between the GainBox
 *   backend and Surfboard.
 *
 * This token exchange is a backend-to-Surfboard concern; the frontend never
 * requests or stores a raw Surfboard token. This service only exposes a
 * read of the merchant's current connection status, for display in Settings.
 * Every function is a stub — it returns `notImplemented()` and sketches the
 * eventual backend call in a comment. Once implemented, this will call the
 * GainBox backend via `apiClient` from './apiClient' — never Surfboard directly.
 */

/**
 * Surfboard capability: Client Authentication Token (status only).
 * @param {string} merchantId
 */
export function getSurfboardConnectionStatus(merchantId) {
  // Future: return apiClient.get(`/merchants/${merchantId}/surfboard-connection`).then((res) => res.data)
  return notImplemented('Client Authentication Token', { merchantId })
}
