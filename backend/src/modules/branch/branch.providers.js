import { surfboardStoreAdapter } from '../integrations/surfboard/index.js'

/**
 * Composition point for StoreProviderPort (see
 * integrations/surfboard/ports/storeProvider.port.js). branch.service.js
 * imports `storeProvider` from here, never `surfboardStoreAdapter`
 * directly — swapping infrastructure providers later means changing this
 * one binding, not branch.service.js. Mirrors merchant.providers.js.
 */
export const storeProvider = surfboardStoreAdapter
