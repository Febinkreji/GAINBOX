/**
 * Composition surface for the Surfboard integration. Domain services should
 * import the *port* they need and receive an implementation via dependency
 * injection at app assembly time — importing adapters directly from this
 * index is only for that one wiring point (see src/app.js).
 *
 * `surfboardAuthService`, `withRetry`, `isTransientSurfboardError`, and
 * `mapSurfboardError` are the Phase 1 foundation pieces every future
 * business adapter (Merchant/Store/Device/Payment) should reuse rather
 * than reimplement — see surfboard.client.js, which already composes all
 * four for its own request() method.
 */
export { surfboardClient } from './surfboard.client.js'
export { surfboardAuthService } from './surfboardAuth.service.js'
export { withRetry, isTransientSurfboardError } from './surfboardRetry.js'
export { mapSurfboardError } from './surfboardError.js'
export { checkSurfboardHealth } from './surfboard.health.js'
export { surfboardMerchantAdapter } from './adapters/surfboardMerchantAdapter.js'
export { surfboardStoreAdapter } from './adapters/surfboardStoreAdapter.js'
export { surfboardDeviceAdapter } from './adapters/surfboardDeviceAdapter.js'
export { surfboardPaymentAdapter } from './adapters/surfboardPaymentAdapter.js'
export { surfboardBillingAdapter } from './adapters/surfboardBillingAdapter.js'
export { surfboardPaymentConfigAdapter } from './adapters/surfboardPaymentConfigAdapter.js'
