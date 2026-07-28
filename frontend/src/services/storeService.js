import { notImplemented } from '@/services/notImplemented'

/**
 * Store domain service.
 *
 * Surfboard capability covered here:
 * - Store Capabilities — create and manage gym branches or meal provider outlets.
 *
 * Surfboard's "store" concept maps to what GainBox calls a "branch" — this
 * service powers the Branches page. Every function is a stub — it returns
 * `notImplemented()` and sketches the eventual backend call in a comment.
 * Once implemented, these will call the GainBox backend via `apiClient`
 * from './apiClient' — never Surfboard directly.
 */

/**
 * Surfboard capability: Store Capabilities.
 * @param {string} merchantId
 * @param {{ name: string, address: string, city: string }} payload
 */
export function createStore(merchantId, payload) {
  // Future: return apiClient.post(`/merchants/${merchantId}/stores`, payload).then((res) => res.data)
  return notImplemented('Store Capabilities', { merchantId, payload })
}

/**
 * Surfboard capability: Store Capabilities.
 * @param {string} merchantId
 */
export function listStores(merchantId) {
  // Future: return apiClient.get(`/merchants/${merchantId}/stores`).then((res) => res.data)
  return notImplemented('Store Capabilities', { merchantId })
}

/**
 * Surfboard capability: Store Capabilities.
 * @param {string} storeId
 */
export function getStore(storeId) {
  // Future: return apiClient.get(`/stores/${storeId}`).then((res) => res.data)
  return notImplemented('Store Capabilities', { storeId })
}

/**
 * Surfboard capability: Store Capabilities.
 * @param {string} storeId
 * @param {{ name?: string, address?: string, city?: string }} updates
 */
export function updateStore(storeId, updates) {
  // Future: return apiClient.patch(`/stores/${storeId}`, updates).then((res) => res.data)
  return notImplemented('Store Capabilities', { storeId, updates })
}
