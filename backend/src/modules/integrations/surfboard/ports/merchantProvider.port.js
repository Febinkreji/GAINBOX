/**
 * Interface a merchant infrastructure provider must implement. The Merchant
 * domain service depends on this shape, not on `surfboardMerchantAdapter`
 * directly — swapping providers means writing a new adapter that satisfies
 * this same interface.
 *
 * Surfboard capabilities this covers: Merchant Creation, Merchant Functions,
 * Multi Merchant Group.
 *
 * @typedef {object} MerchantProviderPort
 * @property {(merchant: object) => Promise<{ externalId: string }>} createMerchant
 * @property {(externalId: string, updates: object) => Promise<void>} updateMerchant
 * @property {(groupId: string, merchantIds: string[]) => Promise<void>} groupMerchants
 */
export const MERCHANT_PROVIDER_PORT_SHAPE = ['createMerchant', 'updateMerchant', 'groupMerchants']
