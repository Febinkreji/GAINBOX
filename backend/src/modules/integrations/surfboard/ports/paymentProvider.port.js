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
 * @property {(merchantExternalId: string, terminalExternalId: string, payment: object) => Promise<{ externalId: string, paymentId: string, status: string, metadata: object }>} createPayment
 * @property {(merchantExternalId: string, orderExternalId: string) => Promise<{ orderStatus: string, payments: Array<{ paymentId: string, paymentStatus: string, paymentMethod: string, amount: number }>, paymentIds: string[] }>} getPaymentStatus
 * @property {(externalId: string, amount?: number) => Promise<void>} refundPayment
 * @property {(paymentExternalId: string, amount?: number) => Promise<{ status: string, message: string }>} capturePayment
 * @property {(paymentExternalId: string) => Promise<{ status: string, paymentStatus: string, message: string }>} cancelPayment
 * @property {(merchantExternalId: string, paymentExternalId: string) => Promise<{ status: string, voidStatus: string, message: string }>} voidPayment
 * @property {(externalId: string) => Promise<object>} getReceipt
 */
export const PAYMENT_PROVIDER_PORT_SHAPE = [
  'createPayment',
  'getPaymentStatus',
  'refundPayment',
  'capturePayment',
  'cancelPayment',
  'voidPayment',
  'getReceipt',
]
