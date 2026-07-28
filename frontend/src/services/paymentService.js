import { notImplemented } from '@/services/notImplemented'

/**
 * Payment domain service.
 *
 * Surfboard capabilities covered here:
 * - Make Your Payments         — process customer membership and meal plan purchases.
 * - Additional Payment Methods — wallets, QR codes, cards, NFC.
 * - Additional Operations      — refunds, delayed capture, cancellations.
 * - Receipts                   — issue and resend digital payment receipts.
 *
 * Powers the Payments page. Every function is a stub — it returns
 * `notImplemented()` and sketches the eventual backend call in a comment.
 * Once implemented, these will call the GainBox backend via `apiClient`
 * from './apiClient' — never Surfboard directly.
 */

/**
 * Surfboard capability: Make Your Payments.
 * @param {{ storeId: string, deviceId?: string, amount: number, currency: string, purpose: 'membership' | 'meal-plan' }} payload
 */
export function createPayment(payload) {
  // Future: return apiClient.post('/payments', payload).then((res) => res.data)
  return notImplemented('Make Your Payments', payload)
}

/**
 * @param {string} paymentId
 */
export function getPayment(paymentId) {
  // Future: return apiClient.get(`/payments/${paymentId}`).then((res) => res.data)
  return notImplemented('Make Your Payments', { paymentId })
}

/**
 * @param {{ storeId?: string, from?: string, to?: string }} [filters]
 */
export function listPayments(filters) {
  // Future: return apiClient.get('/payments', { params: filters }).then((res) => res.data)
  return notImplemented('Make Your Payments', filters)
}

/**
 * Surfboard capability: Additional Payment Methods.
 * @param {string} merchantId
 */
export function listSupportedPaymentMethods(merchantId) {
  // Future: return apiClient.get(`/merchants/${merchantId}/payment-methods`).then((res) => res.data)
  return notImplemented('Additional Payment Methods', { merchantId })
}

/**
 * Surfboard capability: Additional Operations (refund).
 * @param {string} paymentId
 * @param {{ amount?: number, reason?: string }} [payload] - partial refund if `amount` is set.
 */
export function refundPayment(paymentId, payload) {
  // Future: return apiClient.post(`/payments/${paymentId}/refund`, payload).then((res) => res.data)
  return notImplemented('Additional Operations', { paymentId, payload })
}

/**
 * Surfboard capability: Additional Operations (delayed capture).
 * @param {string} paymentId
 */
export function capturePayment(paymentId) {
  // Future: return apiClient.post(`/payments/${paymentId}/capture`).then((res) => res.data)
  return notImplemented('Additional Operations', { paymentId })
}

/**
 * Surfboard capability: Additional Operations (cancel).
 * @param {string} paymentId
 */
export function cancelPayment(paymentId) {
  // Future: return apiClient.post(`/payments/${paymentId}/cancel`).then((res) => res.data)
  return notImplemented('Additional Operations', { paymentId })
}

/**
 * Surfboard capability: Receipts.
 * @param {string} paymentId
 */
export function getReceipt(paymentId) {
  // Future: return apiClient.get(`/payments/${paymentId}/receipt`).then((res) => res.data)
  return notImplemented('Receipts', { paymentId })
}

/**
 * Surfboard capability: Receipts.
 * @param {string} paymentId
 * @param {{ email?: string, phone?: string }} deliveryTarget
 */
export function resendReceipt(paymentId, deliveryTarget) {
  // Future: return apiClient.post(`/payments/${paymentId}/receipt/resend`, deliveryTarget).then((res) => res.data)
  return notImplemented('Receipts', { paymentId, deliveryTarget })
}
