import { surfboardClient } from '../surfboard.client.js'
import { surfboardConfig } from '../../../../config/surfboard.config.js'
import { ValidationError } from '../../../../errors/index.js'
import { notImplemented } from '../../../../utils/notImplemented.js'

/**
 * Surfboard's implementation of StoreProviderPort (see
 * ports/storeProvider.port.js). GainBox's "Branch" maps to Surfboard's
 * "Store" — the rename happens here, at the boundary, not in the Branch
 * domain module. Only `createStore` is implemented; `updateStore` stays a
 * stub until its own scenario is confirmed.
 *
 * Endpoint and headers are confirmed against the official Surfboard Create
 * Store API documentation (Phase 2 — Store & Device Integration). The
 * *payload shape* diverges from that same documentation in two confirmed-
 * live ways (verified against the real sandbox, not just the docs table):
 *  - `address` must be a structured object
 *    (`{addressLine1, city, countryCode, postalCode}`), not the flat
 *    string the docs table describes — sending a string produces
 *    `{status:'ERROR', message:'Mandatory address parameters missing'}`
 *    on a 200 HTTP response.
 *  - `phoneNumber.code` must be a **string**, not a number (the docs'
 *    own request example shows a number, e.g. `91`) — sending a number
 *    produces `{status:'ERROR', message:'Dial Code must be of type
 *    String.'}`.
 * The top-level `city`/`zipCode`/`country` fields the docs also describe
 * are still sent alongside the structured `address` (both together is
 * the confirmed-working combination; not re-tested with either removed).
 * Reuses `surfboardClient`/`surfboardConfig` exactly as
 * surfboardMerchantAdapter.js does — same retry and error mapping, no
 * changes to any of that shared infrastructure.
 */
export const surfboardStoreAdapter = {
  /**
   * @param {string} merchantExternalId - Surfboard's own **merchant id**
   *   (e.g. `844f2789808f100a0e`) — NOT GainBox's merchant.id, and NOT the
   *   KYB applicationId either (those look similar but are different
   *   values; `provider_links.external_id` for entityType='merchant' holds
   *   the applicationId, while this real merchantId only exists once
   *   MERCHANT_CREATED — it lives in that same link's
   *   `metadata.merchantId`, via `unwrapProviderMetadata()`). Resolving
   *   that lookup is the caller's job (see branchSync.service.js), not
   *   this adapter's — passing the applicationId here fails against the
   *   real API (confirmed while designing Phase 2).
   * @param {object} branch - GainBox's Branch (see branch.repository.js) —
   *   `phoneCode`/`phoneNumber` are flat fields on this object (migration
   *   0030), not a nested `phoneNumber: {code, number}` structure.
   */
  async createStore(merchantExternalId, branch) {
    // GainBox-side validation for the confirmed required fields.
    const missing = []
    if (!branch.name) missing.push('name')
    if (!branch.phoneCode) missing.push('phoneCode')
    if (!branch.phoneNumber) missing.push('phoneNumber')
    if (!branch.address) missing.push('address')
    if (!branch.city) missing.push('city')
    if (!branch.postalCode) missing.push('postalCode')
    if (!branch.country) missing.push('country')

    if (missing.length > 0) {
      throw new ValidationError('GainBox branch is missing fields required by Surfboard Store Capabilities', {
        missing,
      })
    }

    const payload = {
      storeName: branch.name,
      // `code` must be a string — confirmed live (see this file's header
      // comment); `String(...)` guards against branch.phoneCode ever being
      // stored/passed as a number.
      phoneNumber: { code: String(branch.phoneCode), number: branch.phoneNumber },
      // Structured object, not a flat string — confirmed live (see this
      // file's header comment). GainBox's Branch has no addressLine2/
      // addressLine3/careOf equivalent — omitted, not guessed at.
      address: {
        addressLine1: branch.address,
        city: branch.city,
        countryCode: branch.country,
        postalCode: branch.postalCode,
      },
      city: branch.city,
      zipCode: branch.postalCode,
      country: branch.country,
      // email/acquirerMID/onlineInfo are optional and have no GainBox
      // Branch equivalent today — omitted, not guessed at.
    }

    const path = `/partners/${surfboardConfig.partnerId}/merchants/${merchantExternalId}/stores`

    // Confirmed required by the official Create Store docs, same as every
    // other merchant-scoped Store/Terminal endpoint (Fetch Store Details,
    // Deactivate Store, Fetch Terminal by ID, Check Link Status) — not
    // needed by Create Merchant, since no merchant exists yet at that point.
    const headers = { 'MERCHANT-ID': merchantExternalId }

    // Any error HTTP status is already thrown as a mapped AppError by
    // surfboard.client.js before this line (same pipeline, same mapping
    // as Merchant Creation — see surfboardError.js).
    const response = await surfboardClient.request('POST', path, { payload, headers })

    // Surfboard can return the ERROR envelope on a 2xx HTTP status (same
    // confirmed behavior as Create Merchant — see surfboardMerchantAdapter
    // .js's createMerchant()) — confirmed live during Phase 2 verification:
    // a 200 response with `{status: 'ERROR', message: '...'}` and no `data`
    // at all. Checked here, before touching `response.data`, so a business
    // rejection (e.g. a missing address field Surfboard itself requires)
    // surfaces as a clear ValidationError instead of a raw TypeError.
    if (response?.status === 'ERROR') {
      throw new ValidationError(response.message ?? 'Surfboard rejected store creation', {
        surfboardStatus: response.status,
        surfboardMessage: response.message,
      })
    }

    // Confirmed: on success, the external Store id is `data.storeId`.
    return { externalId: response.data.storeId, status: response.status, metadata: response.data }
  },

  /**
   * Fetch Store Details — confirmed against the official docs:
   * `GET /partners/{partnerId}/merchants/{merchantId}/stores/{storeId}`,
   * `MERCHANT-ID` header required, same as createStore() above.
   * @param {string} merchantExternalId - Surfboard's own real merchant id.
   * @param {string} storeExternalId - Surfboard's own store id (from
   *   provider_links, entityType='branch').
   * @returns {Promise<object>} the raw parsed response — branchSync
   *   .service.js decides what to persist from `data.status`/
   *   `data.onlineOnboardingStatus`, not this adapter.
   */
  async getStoreStatus(merchantExternalId, storeExternalId) {
    const path = `/partners/${surfboardConfig.partnerId}/merchants/${merchantExternalId}/stores/${storeExternalId}`
    const headers = { 'MERCHANT-ID': merchantExternalId }

    // Any error status is already thrown as a mapped AppError by
    // surfboard.client.js before this line — same pipeline as createStore().
    return surfboardClient.request('GET', path, { headers })
  },

  async updateStore(_externalId, _updates) {
    notImplemented('SurfboardStoreAdapter.updateStore')
  },
}
