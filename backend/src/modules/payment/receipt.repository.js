import { BaseRepository } from '../../database/BaseRepository.js'

/**
 * @typedef {object} Receipt
 * @property {string} id
 * @property {string} paymentId
 * @property {string} issuedAt
 *
 * Not exposed as its own top-level route — a Receipt has no lifecycle
 * independent of its Payment. Reached only via GET /payments/:id/receipt.
 */
export class ReceiptRepository extends BaseRepository {
  constructor() {
    super('receipts')
  }
}

export const receiptRepository = new ReceiptRepository()
