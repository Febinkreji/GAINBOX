import { membershipPlanRepository } from './membershipPlan.repository.js'
import { subscriptionRepository } from './subscription.repository.js'

/**
 * No Surfboard integration point here — plans and subscriptions are pure
 * GainBox concepts. A subscription's recurring charge is what eventually
 * calls into the Payment domain (which *does* talk to Surfboard).
 */
export const membershipService = {
  async listPlans(_merchantId) {
    return membershipPlanRepository.findAll()
  },

  async getPlanById(id) {
    return membershipPlanRepository.findById(id)
  },

  async createPlan(data) {
    return membershipPlanRepository.create(data)
  },

  async updatePlan(id, data) {
    return membershipPlanRepository.update(id, data)
  },

  async removePlan(id) {
    return membershipPlanRepository.delete(id)
  },

  async listSubscriptions(_planId) {
    return subscriptionRepository.findAll()
  },

  async createSubscription(data) {
    return subscriptionRepository.create(data)
  },

  async cancelSubscription(id) {
    return subscriptionRepository.update(id, { status: 'cancelled' })
  },
}
