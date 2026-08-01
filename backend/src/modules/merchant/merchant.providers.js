import { surfboardMerchantAdapter, surfboardPaymentConfigAdapter } from '../integrations/surfboard/index.js'

/**
 * Composition point for MerchantProviderPort (see
 * integrations/surfboard/ports/merchantProvider.port.js). merchant.service.js
 * imports `merchantProvider` from here, never `surfboardMerchantAdapter`
 * directly — swapping infrastructure providers later means changing this
 * one binding, not merchant.service.js.
 */
export const merchantProvider = surfboardMerchantAdapter

/**
 * Composition point for PaymentConfigProviderPort (see
 * integrations/surfboard/ports/paymentConfigProvider.port.js) — Phase 3.
 * merchantSync.service.js imports `paymentConfigProvider` from here, same
 * reasoning as `merchantProvider` above.
 */
export const paymentConfigProvider = surfboardPaymentConfigAdapter
