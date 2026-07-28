import { notImplemented } from '../../../../utils/notImplemented.js'

/**
 * Surfboard's implementation of MerchantProviderPort (see
 * ports/merchantProvider.port.js). The Merchant domain service should never
 * import this file directly in application code — it's wired in at
 * composition time (app.js) so the dependency can be swapped later.
 */
export const surfboardMerchantAdapter = {
  async createMerchant(_merchant) {
    notImplemented('SurfboardMerchantAdapter.createMerchant')
  },

  async updateMerchant(_externalId, _updates) {
    notImplemented('SurfboardMerchantAdapter.updateMerchant')
  },

  async groupMerchants(_groupId, _merchantIds) {
    notImplemented('SurfboardMerchantAdapter.groupMerchants')
  },
}
