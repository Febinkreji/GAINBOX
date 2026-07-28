import { paymentRepository } from './payment.repository.js'
import { receiptRepository } from './receipt.repository.js'

/**
 * Surfboard integration points (see modules/integrations/surfboard/ports):
 * - `create`          -> paymentProviderPort (Make Your Payments, Additional
 *   Payment Methods)
 * - `refund`/`capture`/`cancel` -> paymentProviderPort (Additional Operations)
 * - `getReceipt`       -> paymentProviderPort (Receipts)
 */
export const paymentService = {
  async list(_filters) {
    return paymentRepository.findAll()
  },

  async getById(id) {
    return paymentRepository.findById(id)
  },

  async create(data) {
    return paymentRepository.create(data)
  },

  async refund(id, _refundDetails) {
    return paymentRepository.update(id, { status: 'refunded' })
  },

  async capture(id) {
    return paymentRepository.update(id, { status: 'paid' })
  },

  async cancel(id) {
    return paymentRepository.update(id, { status: 'cancelled' })
  },

  async getReceipt(paymentId) {
    return receiptRepository.findAll({ paymentId })
  },
}
