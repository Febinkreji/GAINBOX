import { notImplemented } from '../../../../utils/notImplemented.js'

/**
 * Surfboard's implementation of PaymentProviderPort (see
 * ports/paymentProvider.port.js). This is the adapter that will eventually
 * hold real Surfboard Client Authentication Token logic, once implemented.
 */
export const surfboardPaymentAdapter = {
  async createPayment(_payment) {
    notImplemented('SurfboardPaymentAdapter.createPayment')
  },

  async refundPayment(_externalId, _amount) {
    notImplemented('SurfboardPaymentAdapter.refundPayment')
  },

  async capturePayment(_externalId) {
    notImplemented('SurfboardPaymentAdapter.capturePayment')
  },

  async cancelPayment(_externalId) {
    notImplemented('SurfboardPaymentAdapter.cancelPayment')
  },

  async getReceipt(_externalId) {
    notImplemented('SurfboardPaymentAdapter.getReceipt')
  },
}
