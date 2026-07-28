import { idempotencyRepository } from './idempotency.repository.js'
import { notImplemented } from '../../utils/notImplemented.js'

// Standard idempotency-key TTL (matches common industry practice, e.g.
// Stripe's 24-hour window). A fixed infrastructure default, not a
// business rule — safe to hardcode here rather than route it through
// per-request configuration.
const IDEMPOTENCY_KEY_TTL_MS = 24 * 60 * 60 * 1000

export const idempotencyService = {
  async findByKey(idempotencyKey) {
    return idempotencyRepository.findByKey(idempotencyKey)
  },

  async createPendingRecord(idempotencyKey, requestHash) {
    const expiresAt = new Date(Date.now() + IDEMPOTENCY_KEY_TTL_MS)
    return idempotencyRepository.create({ idempotencyKey, requestHash, expiresAt })
  },

  /**
   * Returning a previously-stored response for a repeated request is the
   * entire point of idempotency keys — and is deliberately not built yet.
   * The middleware calls this the moment it finds an existing record, so
   * the "record exists" branch is proven wired without pretending replay
   * works.
   */
  async replay(_existingRecord) {
    notImplemented('IdempotencyService.replay')
  },
}
