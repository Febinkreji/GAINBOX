import { surfboardClient } from '../surfboard.client.js'
import { surfboardConfig } from '../../../../config/surfboard.config.js'
import { ValidationError, ExternalServiceError } from '../../../../errors/index.js'
import { notImplemented } from '../../../../utils/notImplemented.js'
import { logger } from '../../../../logger/logger.js'

const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/

/**
 * Surfboard's implementation of MerchantProviderPort (see
 * ports/merchantProvider.port.js). The Merchant domain service should never
 * import this file directly in application code — it's wired in at
 * composition time (merchant.providers.js) so the dependency can be
 * swapped later. Only `createMerchant` is implemented — `updateMerchant`/
 * `groupMerchants` stay stubs until their own scenarios are confirmed.
 *
 * Endpoint, request shape, auth headers, and the full response envelope
 * (including the success shape) are confirmed directly against the
 * official Surfboard Create Merchant API documentation — see
 * docs/architecture/SURFBOARD_INTEGRATION.md for the full contract.
 */
export const surfboardMerchantAdapter = {
  /**
   * @param {object} merchant - GainBox's Merchant (see merchant.repository.js)
   * @returns {Promise<{ externalId: string, status: string, metadata: object }>}
   */
  async createMerchant(merchant) {
    // GainBox-side validation — distinct from whatever Surfboard itself
    // rejects (see surfboardError.js for that half). `country` is required
    // at the top level, format confirmed by the docs: "Two-letter ISO
    // country code, in uppercase e.g 'SE', 'DK', 'NO'."
    if (!merchant.country || !COUNTRY_CODE_PATTERN.test(merchant.country)) {
      throw new ValidationError('GainBox merchant is missing a valid two-letter ISO country code', {
        field: 'country',
        value: merchant.country ?? null,
      })
    }

    // `organisation.corporateId` is confirmed required by the official
    // Create Merchant docs. GainBox's merchant model has no corporateId
    // field today (no schema/migration exists for it) — reading
    // `merchant.corporateId` here is deliberate and forward-looking: once
    // that field exists (e.g. via Merchant Onboarding), this line needs no
    // change. Until then, this always throws — an honest gap, not a
    // fabricated value, same pattern as surfboardStoreAdapter.createStore()
    // handling Branch's missing phoneNumber.
    if (!merchant.corporateId) {
      throw new ValidationError('GainBox merchant is missing a corporate registration number required by Surfboard', {
        field: 'corporateId',
        value: null,
      })
    }

    // controlFields.transactionPricingPlan is confirmed required by the
    // official docs whenever the partner account has more than one billing
    // plan — account-level config, not per-merchant data (see
    // surfboardConfig's own docstring for why partnerId lives the same
    // way). Validated here rather than silently omitted, since omitting it
    // reproduces the exact "Partner has none or more than one plan" error
    // this field exists to prevent.
    if (!surfboardConfig.transactionPricingPlan) {
      throw new ValidationError('Surfboard transaction pricing plan is not configured', {
        field: 'transactionPricingPlan',
      })
    }

    // `organisation`'s other sub-fields (legalName, mccCode, address, email)
    // are documented as Conditional — "Mandatory for a PF partner" — not
    // sent here since GainBox isn't a PF partner and has no structured
    // address/phone fields to populate them from without guessing.
    // `controlFields.store` is deliberately not sent either: it's optional
    // ("if you also want to create a store"), and GainBox already creates
    // Stores separately via the confirmed Store Capabilities flow
    // (surfboardStoreAdapter.createStore(), from branch.service.js) —
    // bundling store creation in here would duplicate that existing path.
    const payload = {
      country: merchant.country,
      organisation: {
        corporateId: merchant.corporateId,
      },
      controlFields: {
        transactionPricingPlan: surfboardConfig.transactionPricingPlan,
      },
    }

    const path = `/partners/${surfboardConfig.partnerId}/merchants`

    // Any error status (400/401/403/422/429/5xx/network) is already thrown
    // as a mapped AppError by surfboard.client.js before this line — see
    // surfboardError.js.
    const response = await surfboardClient.request('POST', path, { payload })

    // Confirmed envelope (official docs): { status: 'SUCCESS'|'ERROR',
    // data: object|null, message: string }. Surfboard can return the ERROR
    // envelope on a 2xx HTTP status — the envelope's own `status` is the
    // real success/failure signal, distinct from the HTTP status
    // surfboard.client.js already checked.
    if (response?.status === 'ERROR') {
      throw new ValidationError(response.message ?? 'Surfboard rejected merchant creation', {
        surfboardStatus: response.status,
        surfboardMessage: response.message,
      })
    }

    // Confirmed success shape (official docs):
    // { status: 'SUCCESS', data: { applicationId, webKybUrl, merchantId?,
    // storeId?, shortLinkUrl? }, message }. `applicationId` is what
    // provider_links tracks as this merchant's Surfboard externalId — it's
    // what getMerchantStatus() and the Application Merchant Created webhook
    // both key off of.
    if (!response?.data?.applicationId) {
      logger.warn(
        { merchantId: merchant.id, responseData: response?.data },
        'Surfboard Merchant Creation returned SUCCESS without an applicationId — response no longer matches the documented contract',
      )
      throw new ExternalServiceError('Surfboard Merchant Creation succeeded but returned no applicationId')
    }

    return {
      externalId: response.data.applicationId,
      status: response.status,
      metadata: {
        applicationId: response.data.applicationId,
        webKybUrl: response.data.webKybUrl ?? null,
        merchantId: response.data.merchantId ?? null,
        storeId: response.data.storeId ?? null,
        shortLinkUrl: response.data.shortLinkUrl ?? null,
        message: response.message,
      },
    }
  },

  /**
   * @param {string} applicationId - Surfboard's own KYB application id
   *   (from provider_links, entityType='merchant', persisted by
   *   createMerchant() above as `externalId`).
   * @returns {Promise<object>} the raw parsed response — merchant.service.js
   *   decides what to do with `data.merchantId`/`data.storeId`, not this
   *   adapter.
   */
  async getMerchantStatus(applicationId) {
    // partnerId is account-level config, not a per-call value — read
    // directly from surfboardConfig, same as createMerchant()'s path
    // (surfboard.config.js's own docstring: "not a per-request value, so it
    // belongs here... rather than being threaded through every adapter call").
    const path = `/partners/${surfboardConfig.partnerId}/merchants/${applicationId}/status`

    // Any error status is already thrown as a mapped AppError by
    // surfboard.client.js before this line — same pipeline as every other
    // confirmed endpoint.
    return surfboardClient.request('GET', path)
  },

  async updateMerchant(_externalId, _updates) {
    notImplemented('SurfboardMerchantAdapter.updateMerchant')
  },

  async groupMerchants(_groupId, _merchantIds) {
    notImplemented('SurfboardMerchantAdapter.groupMerchants')
  },
}
