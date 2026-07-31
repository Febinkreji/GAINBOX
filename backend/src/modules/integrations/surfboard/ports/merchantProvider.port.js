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
 * @property {(merchant: object) => Promise<{ externalId: string, status: string, metadata: { applicationId: string, webKybUrl: string|null, merchantId: string|null, storeId: string|null, shortLinkUrl: string|null, message: string } }>} createMerchant
 * @property {(applicationId: string) => Promise<{ status: string, data: { applicationId: string, webKybUrl: string, applicationStatus: string, merchantId: string, storeId: string }, message: string }>} getMerchantStatus
 * @property {(externalId: string, updates: object) => Promise<void>} updateMerchant
 * @property {(groupId: string, merchantIds: string[]) => Promise<void>} groupMerchants
 */
export const MERCHANT_PROVIDER_PORT_SHAPE = ['createMerchant', 'getMerchantStatus', 'updateMerchant', 'groupMerchants']
