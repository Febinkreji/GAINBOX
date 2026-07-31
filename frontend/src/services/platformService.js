import { apiClient } from '@/services/apiClient'

/**
 * Platform Administration domain service — powers the Platform pages
 * (Merchant/User Management + Details, Invitations). Every function calls
 * an existing `/platform/*` endpoint gated by requireRole('platform-admin')
 * on the backend; nothing here duplicates business logic that already
 * lives server-side.
 */

export function getDashboardSummary() {
  return apiClient.get('/platform/dashboard').then((res) => res.data.data)
}

export function listMerchants(params) {
  return apiClient.get('/platform/merchants', { params }).then((res) => res.data)
}

export function getMerchantDetails(merchantId) {
  return apiClient.get(`/platform/merchants/${merchantId}`).then((res) => res.data.data)
}

export function createMerchant(payload) {
  return apiClient.post('/platform/merchants', payload).then((res) => res.data.data)
}

export function updateMerchant(merchantId, updates) {
  return apiClient.patch(`/platform/merchants/${merchantId}`, updates).then((res) => res.data.data)
}

export function activateMerchant(merchantId) {
  return apiClient.post(`/platform/merchants/${merchantId}/activate`).then((res) => res.data.data)
}

export function deactivateMerchant(merchantId) {
  return apiClient.post(`/platform/merchants/${merchantId}/deactivate`).then((res) => res.data.data)
}

export function listUsers(params) {
  return apiClient.get('/platform/users', { params }).then((res) => res.data)
}

export function getUserDetails(userId) {
  return apiClient.get(`/platform/users/${userId}`).then((res) => res.data.data)
}

export function activateUser(userId) {
  return apiClient.post(`/platform/users/${userId}/activate`).then((res) => res.data.data)
}

export function deactivateUser(userId) {
  return apiClient.post(`/platform/users/${userId}/deactivate`).then((res) => res.data.data)
}

export function listInvitations(params) {
  return apiClient.get('/platform/invitations', { params }).then((res) => res.data)
}

export function getInvitation(id) {
  return apiClient.get(`/platform/invitations/${id}`).then((res) => res.data.data)
}

export function createInvitation(payload) {
  return apiClient.post('/platform/invitations', payload).then((res) => res.data.data)
}

export function resendInvitation(id) {
  return apiClient.post(`/platform/invitations/${id}/resend`).then((res) => res.data.data)
}

export function revokeInvitation(id) {
  return apiClient.post(`/platform/invitations/${id}/revoke`).then((res) => res.data.data)
}

// Merchant Integration Framework (Sprint 2A) — a distinct backend module
// (`/integrations/surfboard/merchants/*`, not `/platform/*`), same
// platform-admin gate. See docs/architecture/SURFBOARD_INTEGRATION.md.

export function getMerchantSyncStatus(merchantId) {
  return apiClient.get(`/integrations/surfboard/merchants/${merchantId}/status`).then((res) => res.data.data)
}

export function triggerMerchantSync(merchantId) {
  return apiClient.post(`/integrations/surfboard/merchants/${merchantId}/sync`).then((res) => res.data.data)
}

// Demo-only — see merchantSyncService.simulateOnboarding()'s docstring. Not
// a real Surfboard connection; disabled server-side in production.
export function simulateMerchantOnboarding(merchantId) {
  return apiClient.post(`/integrations/surfboard/merchants/${merchantId}/simulate`).then((res) => res.data.data)
}

export function getMerchantSyncHistory(merchantId, params) {
  return apiClient
    .get('/integrations/surfboard/merchants/history', { params: { merchantId, ...params } })
    .then((res) => res.data)
}
