import { notImplemented } from '@/services/notImplemented'

/**
 * Logistics domain service.
 *
 * Surfboard capability covered here:
 * - Logistics — ordering Surfboard payment terminals/accessories only.
 *   (Not GainBox delivery logistics — meal delivery tracking is a separate,
 *   unrelated concern and does not belong in this service.)
 *
 * Intended to power a "Order a new terminal" action on the Devices page.
 * Every function is a stub — it returns `notImplemented()` and sketches the
 * eventual backend call in a comment. Once implemented, these will call the
 * GainBox backend via `apiClient` from './apiClient' — never Surfboard directly.
 */

/**
 * Surfboard capability: Logistics.
 * @param {string} storeId
 * @param {{ terminalModel: string, quantity: number, shippingAddress: string }} payload
 */
export function orderTerminal(storeId, payload) {
  // Future: return apiClient.post(`/stores/${storeId}/terminal-orders`, payload).then((res) => res.data)
  return notImplemented('Logistics', { storeId, payload })
}

/**
 * @param {string} orderId
 */
export function getTerminalOrder(orderId) {
  // Future: return apiClient.get(`/terminal-orders/${orderId}`).then((res) => res.data)
  return notImplemented('Logistics', { orderId })
}

/**
 * @param {string} merchantId
 */
export function listTerminalOrders(merchantId) {
  // Future: return apiClient.get(`/merchants/${merchantId}/terminal-orders`).then((res) => res.data)
  return notImplemented('Logistics', { merchantId })
}
