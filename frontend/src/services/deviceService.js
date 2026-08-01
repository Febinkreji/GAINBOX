import { apiClient } from '@/services/apiClient'

/**
 * Device domain service — powers the Devices page (Step 5). No merchantId
 * filter param needed on list: Authorization tenant-scopes /devices to the
 * caller's own merchant(s) automatically (see backend's
 * scopeMerchantAccess middleware) — the frontend never has to know or pass
 * its own merchant id just to list its own devices.
 */

export function listDevices(params) {
  return apiClient.get('/devices', { params }).then((res) => res.data)
}

export function getDevice(deviceId) {
  return apiClient.get(`/devices/${deviceId}`).then((res) => res.data.data)
}

export function createDevice(payload) {
  return apiClient.post('/devices', payload).then((res) => res.data.data)
}

export function updateDevice(deviceId, updates) {
  return apiClient.patch(`/devices/${deviceId}`, updates).then((res) => res.data.data)
}

export function deleteDevice(deviceId) {
  return apiClient.delete(`/devices/${deviceId}`).then((res) => res.data)
}

// Phase 2 — Store & Device Integration. Read-only, same reasoning as
// storeService.js's getBranchSyncStatus — ownership-gated on the backend,
// no sync/admin action here (that stays Platform Admin only).
export function getDeviceSyncStatus(deviceId) {
  return apiClient.get(`/integrations/surfboard/devices/${deviceId}/status`).then((res) => res.data.data)
}
