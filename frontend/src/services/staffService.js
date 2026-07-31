import { apiClient } from '@/services/apiClient'

/**
 * Merchant staff + invitations — powers the Staff page (Step 7). Calls the
 * merchant-context routes (/merchant/staff, /merchant/invitations) — the
 * backend derives the merchant from the authenticated user, so nothing
 * here ever passes a merchantId. Distinct from Platform Control Center's
 * /platform/invitations (platform-admin only, any merchant) — different
 * authorization scope, same underlying invitation lifecycle.
 */

export function listStaff() {
  return apiClient.get('/merchant/staff').then((res) => res.data.data)
}

export function removeStaff(staffId) {
  return apiClient.delete(`/merchant/staff/${staffId}`).then((res) => res.data)
}

export function listInvitations(params) {
  return apiClient.get('/merchant/invitations', { params }).then((res) => res.data)
}

export function inviteStaff(payload) {
  return apiClient.post('/merchant/invitations', payload).then((res) => res.data.data)
}

export function resendInvitation(invitationId) {
  return apiClient.post(`/merchant/invitations/${invitationId}/resend`).then((res) => res.data.data)
}

export function revokeInvitation(invitationId) {
  return apiClient.post(`/merchant/invitations/${invitationId}/revoke`).then((res) => res.data.data)
}
