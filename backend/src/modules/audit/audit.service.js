import { auditRepository } from './audit.repository.js'

/**
 * Internal infrastructure only — no routes, no controller, nothing public.
 * Called by domain services after a successful write, inside the same DB
 * transaction as that write (see merchant.service.js), so "the change
 * happened but nothing recorded who did it" can't occur: if the audit
 * insert fails, the whole transaction rolls back with it.
 */
export const auditService = {
  /**
   * @param {{ entityType: string, entityId: string, action: string, actorUserId?: string|null, metadata?: object }} entry
   * @param {import('pg').PoolClient} [client] - pass the transaction client when called inside one.
   */
  async record(entry, client) {
    return auditRepository.record(entry, client)
  },
}
