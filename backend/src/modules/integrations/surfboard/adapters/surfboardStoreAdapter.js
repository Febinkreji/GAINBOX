import { notImplemented } from '../../../../utils/notImplemented.js'

/**
 * Surfboard's implementation of StoreProviderPort (see
 * ports/storeProvider.port.js). GainBox's "Branch" maps to Surfboard's
 * "Store" — the rename happens here, at the boundary, not in the Branch
 * domain module.
 */
export const surfboardStoreAdapter = {
  async createStore(_merchantExternalId, _branch) {
    notImplemented('SurfboardStoreAdapter.createStore')
  },

  async updateStore(_externalId, _updates) {
    notImplemented('SurfboardStoreAdapter.updateStore')
  },
}
