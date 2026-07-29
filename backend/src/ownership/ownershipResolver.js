import { branchRepository } from '../modules/branch/branch.repository.js'
import { deviceRepository } from '../modules/device/device.repository.js'
import { membershipPlanRepository } from '../modules/membership/membershipPlan.repository.js'
import { subscriptionRepository } from '../modules/membership/subscription.repository.js'

/**
 * Pure relationship resolution — no Express, no authentication, no RBAC.
 * Given an entity id, answers "which Merchant/Branch owns this row" by
 * walking the same FK chain the business modules already query, through
 * the same repositories (no new SQL, nothing duplicated). This module only
 * ever answers "who owns it" — never "is the current user allowed to touch
 * it". That second question belongs to a future Authorization layer, which
 * will call these functions rather than re-derive the merchant → branch →
 * device traversal itself.
 *
 * Deliberately NOT included: resolveMerchantFromPayment. Payment doesn't
 * have a real repository yet (still a stub from the original foundation
 * phase) — adding a resolver against a method that only throws
 * NotImplementedError would be dead code, not working infrastructure. Add
 * it here the same day Payment gets a real repository.
 */

export async function resolveMerchantFromBranch(branchId) {
  const branch = await branchRepository.findById(branchId)
  return branch ? branch.merchantId : null
}

export async function resolveBranchFromDevice(deviceId) {
  const device = await deviceRepository.findById(deviceId)
  return device ? device.branchId : null
}

export async function resolveMerchantFromDevice(deviceId) {
  const branchId = await resolveBranchFromDevice(deviceId)
  return branchId ? resolveMerchantFromBranch(branchId) : null
}

export async function resolveMerchantFromMembershipPlan(membershipPlanId) {
  const plan = await membershipPlanRepository.findById(membershipPlanId)
  return plan ? plan.merchantId : null
}

export async function resolveMerchantFromSubscription(subscriptionId) {
  const subscription = await subscriptionRepository.findById(subscriptionId)
  return subscription ? resolveMerchantFromMembershipPlan(subscription.membershipPlanId) : null
}

/**
 * Registry mapping an entity type to the ownership facts it can resolve.
 * Adding a new entity (Payment, ...) means adding one entry here —
 * resolveOwnership() itself, and every existing caller, stay unchanged.
 * Keys use the same entityType vocabulary as audit_logs/outbox (e.g.
 * 'membershipPlan'), so a future caller can pass one string to both systems
 * without a translation table between them.
 */
const RESOLVERS = {
  branch: { merchantId: resolveMerchantFromBranch },
  device: { branchId: resolveBranchFromDevice, merchantId: resolveMerchantFromDevice },
  membershipPlan: { merchantId: resolveMerchantFromMembershipPlan },
  subscription: { merchantId: resolveMerchantFromSubscription },
}

/**
 * Generic dispatcher: `resolveOwnership('device', id)` -> `{ branchId, merchantId }`.
 * Returns `null` for an unknown entityType or a non-existent entityId.
 */
export async function resolveOwnership(entityType, entityId) {
  const resolvers = RESOLVERS[entityType]

  if (!resolvers) {
    return null
  }

  const entries = await Promise.all(
    Object.entries(resolvers).map(async ([key, resolve]) => [key, await resolve(entityId)]),
  )

  return Object.fromEntries(entries)
}
