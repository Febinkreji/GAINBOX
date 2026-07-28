import { outboxRepository } from './outbox.repository.js'

/**
 * Transactional Outbox pattern: `publish` is called inside the same DB
 * transaction as the business write it describes (see
 * merchant.service.js), guaranteeing the event and the change it reports
 * are always consistent — no future worker can see a state where one
 * exists without the other.
 *
 * No worker processes these events yet. That's a deliberate, separate
 * piece of future work (a poller or listen/notify consumer reading
 * `outboxRepository.findPending`) — this service only records events.
 */
export const outboxService = {
  /**
   * @param {{ eventType: string, aggregateType: string, aggregateId: string, payload: object }} event
   * @param {import('pg').PoolClient} [client] - pass the transaction client when called inside one.
   */
  async publish(event, client) {
    return outboxRepository.create(event, client)
  },
}
