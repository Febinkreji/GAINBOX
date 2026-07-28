import { BaseRepository } from '../../database/BaseRepository.js'

/**
 * @typedef {object} Subscription
 * @property {string} id
 * @property {string} membershipPlanId
 * @property {string} customerId - references a User with a customer role
 * @property {string} status - "active" | "cancelled" | "expired"
 * @property {string} startedAt
 */
export class SubscriptionRepository extends BaseRepository {
  constructor() {
    super('subscriptions')
  }
}

export const subscriptionRepository = new SubscriptionRepository()
