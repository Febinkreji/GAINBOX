import { notImplemented } from '@/services/notImplemented'
import { apiClient } from '@/services/apiClient'

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

/**
 * Redeems a Merchant Owner invitation token (Platform Administration, Step
 * 3) — called once the invited person has already signed in with Google
 * (Identity Sync has reconciled their user row) but has no merchant
 * assignment yet. See ProtectedRoute.jsx and pages/AcceptInvitation for
 * where this is surfaced.
 */
export function acceptInvitation(token) {
  return apiClient.post('/auth/invitations/accept', { token }).then((res) => res.data.data)
}

/**
 * Read-only preview of an invitation by token — shows merchant name/
 * invited email/status before the user commits to accepting. Powers the
 * shareable invitation link's acceptance screen (pages/AcceptInvitation).
 */
export function previewInvitation(token) {
  return apiClient.get('/auth/invitations/preview', { params: { token } }).then((res) => res.data.data)
}
