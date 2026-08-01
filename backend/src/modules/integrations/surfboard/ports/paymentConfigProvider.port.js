/**
 * Interface a payment-configuration infrastructure provider must implement.
 *
 * Surfboard capabilities this covers: Payment Methods API (list), Reporting
 * API (settlement reports) — merchant-level payment configuration/status
 * visibility, distinct from PaymentProviderPort (transactions/orders).
 *
 * @typedef {object} PaymentConfigProviderPort
 * @property {(merchantExternalId: string) => Promise<Array<object>>} listPaymentMethods
 * @property {(merchantExternalId: string) => Promise<Array<object>>} getSettlementReports
 */
export const PAYMENT_CONFIG_PROVIDER_PORT_SHAPE = ['listPaymentMethods', 'getSettlementReports']
