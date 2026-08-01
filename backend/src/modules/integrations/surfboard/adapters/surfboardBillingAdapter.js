import { surfboardClient } from '../surfboard.client.js'
import { surfboardConfig } from '../../../../config/surfboard.config.js'
import { ValidationError } from '../../../../errors/index.js'

/**
 * Surfboard's Create Billing Plans endpoint — confirmed directly against the
 * official Surfboard Create Billing Plans API documentation:
 * `POST /partners/{partnerId}/billing-plans`. Scoped only under `partnerId`,
 * with no merchant/store/terminal id anywhere in the path or payload — unlike
 * every other adapter in this integration (surfboardMerchantAdapter,
 * surfboardStoreAdapter, ...), this call has no dependency on a merchant
 * already existing, so it can run before or after Merchant Creation.
 *
 * No port/DI wiring exists for this yet (unlike MerchantProviderPort etc.)
 * since no domain service consumes it — this is an account-level
 * administrative call, same category as surfboardConfig.transactionPricingPlan.
 */
export const surfboardBillingAdapter = {
  /**
   * @param {Array<object>} plans - Billing plan objects, each requiring at
   *   least `id`, `cardBrand`, `terminalType`, `paymentMethod`, `planType`,
   *   and `description` per the confirmed docs; rate fields
   *   (domesticDebitNonCommercial, fixedPercentage, etc.) are optional and
   *   passed through as given — this adapter doesn't guess at defaults.
   * @returns {Promise<{ status: string, message: string }>}
   */
  async createBillingPlans(plans) {
    // GainBox-side structural gate — distinct from whatever Surfboard itself
    // rejects per-plan (missing id/cardBrand/etc. surface as its own 400).
    if (!Array.isArray(plans) || plans.length === 0) {
      throw new ValidationError('createBillingPlans requires a non-empty array of billing plan objects', {
        field: 'plans',
        value: plans,
      })
    }

    const path = `/partners/${surfboardConfig.partnerId}/billing-plans`

    // Any error status (400/401/403/429/5xx/network) is already thrown as a
    // mapped AppError by surfboard.client.js before this line — same
    // pipeline as every other confirmed endpoint.
    const response = await surfboardClient.request('POST', path, { payload: { plans } })

    // Confirmed response envelope (official docs): { status: 'SUCCESS'|'ERROR',
    // message: string } — no `data` field, unlike Create Merchant/Create Order.
    if (response?.status === 'ERROR') {
      throw new ValidationError(response.message ?? 'Surfboard rejected billing plan creation', {
        surfboardStatus: response.status,
        surfboardMessage: response.message,
      })
    }

    return { status: response?.status, message: response?.message }
  },
}
