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
 * Endpoint, auth, and request/response shape are all confirmed (not
 * researched here — see the Sprint task that supplied this contract).
 * Reuses `surfboardClient`/`surfboardConfig` exactly as
 * surfboardMerchantAdapter.js does — same headers, retry, and error
 * mapping, no changes to any of that shared infrastructure.
 */
export const surfboardStoreAdapter = {
  /**
   * @param {string} merchantExternalId - Surfboard's own merchant id (from
   *   provider_links, entityType='merchant') — NOT GainBox's merchant.id.
   *   Resolving that lookup is the caller's job (see branch.service.js),
   *   not this adapter's.
   * @param {object} branch - GainBox's Branch (see branch.repository.js)
   */
  async createStore(merchantExternalId, branch) {
    // GainBox-side validation for the confirmed required fields. Branch
    // has no phone number captured today (see branch.repository.js — no
    // such column exists), so this will always throw here until that
    // model gains one — an expected, documented gap, not a bug.
    const missing = []
    if (!branch.name) missing.push('name')
    if (!branch.phoneNumber?.code) missing.push('phoneNumber.code')
    if (!branch.phoneNumber?.number) missing.push('phoneNumber.number')
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
      phoneNumber: { code: branch.phoneNumber.code, number: branch.phoneNumber.number },
      address: branch.address,
      city: branch.city,
      zipCode: branch.postalCode,
      country: branch.country,
      // email/acquirerMID/onlineInfo are optional and have no GainBox
      // Branch equivalent today — omitted, not guessed at.
    }

    const path = `/partners/${surfboardConfig.partnerId}/merchants/${merchantExternalId}/stores`

    // Any error status is already thrown as a mapped AppError by
    // surfboard.client.js before this line (same pipeline, same mapping
    // as Merchant Creation — see surfboardError.js).
    const response = await surfboardClient.request('POST', path, { payload })

    // Confirmed: on success, the external Store id is `data.storeId`.
    return { externalId: response.data.storeId, status: response.status, metadata: response.data }
  },

  async updateStore(_externalId, _updates) {
    notImplemented('SurfboardStoreAdapter.updateStore')
  },
}
