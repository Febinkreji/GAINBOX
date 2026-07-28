import { BaseRepository } from '../../database/BaseRepository.js'

/**
 * @typedef {object} MembershipPlan
 * @property {string} id
 * @property {string} merchantId
 * @property {string} name - e.g. "Weight Loss Package", "Muscle Gain Package"
 * @property {number} price
 * @property {string} billingCycle - "one-time" | "monthly"
 *
 * Pure GainBox domain concept — Surfboard has no notion of a membership plan.
 */
export class MembershipPlanRepository extends BaseRepository {
  constructor() {
    super('membership_plans')
  }
}

export const membershipPlanRepository = new MembershipPlanRepository()
