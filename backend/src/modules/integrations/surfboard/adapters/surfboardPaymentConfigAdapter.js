import { surfboardClient } from '../surfboard.client.js'
import { surfboardConfig } from '../../../../config/surfboard.config.js'
import { ValidationError } from '../../../../errors/index.js'

/**
 * Surfboard's Payment Methods (list) and Reporting (settlement reports)
 * endpoints — merchant-level payment configuration/status visibility,
 * confirmed directly against the official Surfboard docs. Distinct from
 * surfboardPaymentAdapter.js (transactions/orders, out of scope for
 * Phase 3) and surfboardMerchantAdapter.js (KYB onboarding, which already
 * surfaces a byproduct `paymentMethods` field via Check Application
 * Status — this adapter calls the dedicated, authoritative endpoint
 * instead).
 *
 * Every merchant/store/terminal-scoped Surfboard endpoint confirmed so far
 * (Phase 2) requires a `MERCHANT-ID` header — applied here defensively for
 * both calls, consistent with that pattern.
 */
export const surfboardPaymentConfigAdapter = {
  /**
   * List Payment Methods — `GET /merchants/{merchantId}/payment-methods`.
   * @param {string} merchantExternalId - Surfboard's own real merchant id.
   * @returns {Promise<Array<{paymentMethodId: string, paymentMethod: string}>>}
   */
  async listPaymentMethods(merchantExternalId) {
    const path = `/merchants/${merchantExternalId}/payment-methods`
    const headers = { 'MERCHANT-ID': merchantExternalId }

    const response = await surfboardClient.request('GET', path, { headers })

    if (response?.status === 'ERROR') {
      throw new ValidationError(response.message ?? 'Surfboard rejected the payment methods request', {
        surfboardStatus: response.status,
        surfboardMessage: response.message,
      })
    }

    return response?.data ?? []
  },

  /**
   * Fetch Settlement Reports — `GET /partners/{partnerId}/merchants/{merchantId}/reports`.
   * @param {string} merchantExternalId - Surfboard's own real merchant id.
   * @returns {Promise<Array<object>>}
   */
  async getSettlementReports(merchantExternalId) {
    const path = `/partners/${surfboardConfig.partnerId}/merchants/${merchantExternalId}/reports`
    const headers = { 'MERCHANT-ID': merchantExternalId }

    const response = await surfboardClient.request('GET', path, { headers })

    if (response?.status === 'ERROR') {
      throw new ValidationError(response.message ?? 'Surfboard rejected the settlement reports request', {
        surfboardStatus: response.status,
        surfboardMessage: response.message,
      })
    }

    return response?.data ?? []
  },
}
