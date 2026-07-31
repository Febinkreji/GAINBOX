import { surfboardPaymentAdapter } from '../integrations/surfboard/index.js'

/**
 * Composition point for PaymentProviderPort (see
 * integrations/surfboard/ports/paymentProvider.port.js). payment.service.js
 * imports `paymentProvider` from here, never `surfboardPaymentAdapter`
 * directly — mirrors merchant.providers.js/branch.providers.js/device.providers.js.
 */
export const paymentProvider = surfboardPaymentAdapter
