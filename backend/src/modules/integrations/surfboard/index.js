/**
 * Composition surface for the Surfboard integration. Domain services should
 * import the *port* they need and receive an implementation via dependency
 * injection at app assembly time — importing adapters directly from this
 * index is only for that one wiring point (see src/app.js).
 */
export { surfboardClient } from './surfboard.client.js'
export { surfboardMerchantAdapter } from './adapters/surfboardMerchantAdapter.js'
export { surfboardStoreAdapter } from './adapters/surfboardStoreAdapter.js'
export { surfboardDeviceAdapter } from './adapters/surfboardDeviceAdapter.js'
export { surfboardPaymentAdapter } from './adapters/surfboardPaymentAdapter.js'
