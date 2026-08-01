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

export function deleteMerchant(merchantId) {
  return apiClient.delete(`/platform/merchants/${merchantId}`).then((res) => res.data)
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

export function getMerchantSyncHistory(merchantId, params) {
  return apiClient
    .get('/integrations/surfboard/merchants/history', { params: { merchantId, ...params } })
    .then((res) => res.data)
}

// Phase 2 — Store & Device Integration: same integration surface, one level
// down the entity hierarchy (Branch -> Surfboard Store, Device -> Surfboard
// Terminal). `getBranchSyncStatus`/`getDeviceSyncStatus` are also callable
// from the Merchant Portal (ownership-gated, not platform-admin-gated on
// the backend) — see storeService.js/deviceService.js for those read-only
// wrappers; triggering a sync stays here, platform-admin only.

export function getBranchSyncStatus(branchId) {
  return apiClient.get(`/integrations/surfboard/branches/${branchId}/status`).then((res) => res.data.data)
}

export function triggerBranchSync(branchId) {
  return apiClient.post(`/integrations/surfboard/branches/${branchId}/sync`).then((res) => res.data.data)
}

export function getDeviceSyncStatus(deviceId) {
  return apiClient.get(`/integrations/surfboard/devices/${deviceId}/status`).then((res) => res.data.data)
}

export function triggerDeviceSync(deviceId) {
  return apiClient.post(`/integrations/surfboard/devices/${deviceId}/sync`).then((res) => res.data.data)
}
