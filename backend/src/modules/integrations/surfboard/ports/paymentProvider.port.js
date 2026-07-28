/**
 * Interface a payment-processing provider must implement. This is the most
 * important port in the system — it's what lets "Payment" stay a generic
 * GainBox domain while Surfboard (or a future replacement) does the actual
 * money movement.
 *
 * Surfboard capabilities this covers: Make Your Payments, Additional
 * Payment Methods, Additional Operations, Receipts, Client Authentication
 * Token (implicitly, as the auth mechanism behind every call below).
 *
 * @typedef {object} PaymentProviderPort
 * @property {(payment: object) => Promise<{ externalId: string, status: string }>} createPayment
 * @property {(externalId: string, amount?: number) => Promise<void>} refundPayment
 * @property {(externalId: string) => Promise<void>} capturePayment
 * @property {(externalId: string) => Promise<void>} cancelPayment
 * @property {(externalId: string) => Promise<object>} getReceipt
 */
export const PAYMENT_PROVIDER_PORT_SHAPE = [
  'createPayment',
  'refundPayment',
  'capturePayment',
  'cancelPayment',
  'getReceipt',
]
