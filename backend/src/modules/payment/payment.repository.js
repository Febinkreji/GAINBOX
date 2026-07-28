import { BaseRepository } from '../../database/BaseRepository.js'

/**
 * @typedef {object} Payment
 * @property {string} id
 * @property {string} branchId
 * @property {string} deviceId
 * @property {string} subscriptionId
 * @property {number} amount
 * @property {string} currency
 * @property {string} status - "pending" | "paid" | "refunded" | "cancelled"
 * @property {string} purpose - "membership" | "meal-plan" | "consultation"
 */
export class PaymentRepository extends BaseRepository {
  constructor() {
    super('payments')
  }
}

export const paymentRepository = new PaymentRepository()
