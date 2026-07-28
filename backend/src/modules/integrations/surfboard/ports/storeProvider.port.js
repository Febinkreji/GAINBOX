/**
 * Interface a store/branch infrastructure provider must implement.
 *
 * Surfboard capability this covers: Store Capabilities.
 *
 * @typedef {object} StoreProviderPort
 * @property {(merchantExternalId: string, branch: object) => Promise<{ externalId: string }>} createStore
 * @property {(externalId: string, updates: object) => Promise<void>} updateStore
 */
export const STORE_PROVIDER_PORT_SHAPE = ['createStore', 'updateStore']
