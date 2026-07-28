import { notImplemented } from '@/services/notImplemented'

/**
 * Device domain service.
 *
 * Surfboard capabilities covered here:
 * - Device Management  — register and assign payment terminals to branches.
 * - Device Handling    — device lifecycle: replace, reassign, deactivate.
 * - Configure Branding — customize payment terminal branding.
 * - Configure Tips     — enable tipping on a terminal (mainly for meal providers).
 *
 * Powers the Devices page. Every function is a stub — it returns
 * `notImplemented()` and sketches the eventual backend call in a comment.
 * Once implemented, these will call the GainBox backend via `apiClient`
 * from './apiClient' — never Surfboard directly.
 */

/**
 * Surfboard capability: Device Management.
 * @param {string} storeId
 * @param {{ model: string, serialNumber: string }} payload
 */
export function registerDevice(storeId, payload) {
  // Future: return apiClient.post(`/stores/${storeId}/devices`, payload).then((res) => res.data)
  return notImplemented('Device Management', { storeId, payload })
}

/**
 * Surfboard capability: Device Management.
 * @param {string} storeId
 */
export function listDevices(storeId) {
  // Future: return apiClient.get(`/stores/${storeId}/devices`).then((res) => res.data)
  return notImplemented('Device Management', { storeId })
}

/**
 * Surfboard capability: Device Management.
 * @param {string} deviceId
 */
export function getDevice(deviceId) {
  // Future: return apiClient.get(`/devices/${deviceId}`).then((res) => res.data)
  return notImplemented('Device Management', { deviceId })
}

/**
 * Surfboard capability: Device Handling (replace a faulty/lost terminal).
 * @param {string} deviceId
 * @param {{ replacementSerialNumber: string }} payload
 */
export function replaceDevice(deviceId, payload) {
  // Future: return apiClient.post(`/devices/${deviceId}/replace`, payload).then((res) => res.data)
  return notImplemented('Device Handling', { deviceId, payload })
}

/**
 * Surfboard capability: Device Handling (move a terminal to a different branch).
 * @param {string} deviceId
 * @param {string} targetStoreId
 */
export function reassignDevice(deviceId, targetStoreId) {
  // Future: return apiClient.post(`/devices/${deviceId}/reassign`, { targetStoreId }).then((res) => res.data)
  return notImplemented('Device Handling', { deviceId, targetStoreId })
}

/**
 * Surfboard capability: Device Handling.
 * @param {string} deviceId
 */
export function deactivateDevice(deviceId) {
  // Future: return apiClient.post(`/devices/${deviceId}/deactivate`).then((res) => res.data)
  return notImplemented('Device Handling', { deviceId })
}

/**
 * Surfboard capability: Configure Branding (terminal-level, not merchant-level).
 * @param {string} deviceId
 * @param {{ logoUrl?: string, accentColor?: string }} brandingConfig
 */
export function configureDeviceBranding(deviceId, brandingConfig) {
  // Future: return apiClient.patch(`/devices/${deviceId}/branding`, brandingConfig).then((res) => res.data)
  return notImplemented('Configure Branding', { deviceId, brandingConfig })
}

/**
 * Surfboard capability: Configure Tips.
 * @param {string} deviceId
 * @param {{ enabled: boolean, suggestedPercentages?: number[] }} tipConfig
 */
export function configureDeviceTips(deviceId, tipConfig) {
  // Future: return apiClient.patch(`/devices/${deviceId}/tips`, tipConfig).then((res) => res.data)
  return notImplemented('Configure Tips', { deviceId, tipConfig })
}
