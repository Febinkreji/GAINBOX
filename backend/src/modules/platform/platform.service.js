import { platformRepository } from './platform.repository.js'
import { merchantRepository } from '../merchant/merchant.repository.js'
import { branchRepository } from '../branch/branch.repository.js'
import { deviceRepository } from '../device/device.repository.js'
import { membershipPlanRepository } from '../membership/membershipPlan.repository.js'
import { merchantStaffRepository } from '../merchantStaff/merchantStaff.repository.js'
import { userRepository } from '../user/user.repository.js'
import { roleRepository } from '../role/role.repository.js'
import { invitationRepository } from '../invitation/invitation.repository.js'
import { authorizationService } from '../authorization/authorization.service.js'
import { NotFoundError } from '../../errors/index.js'
import { parsePagination, buildPaginationMeta } from '../../utils/pagination.js'

/**
 * A read-only, computed onboarding-progress indicator layered on top of
 * merchants.status — it does NOT introduce a new persisted state or touch
 * the real status column/its transitions (still exactly 'pending' |
 * 'active' | 'suspended', still the only thing Activate/Deactivate write
 * and audit). 'pending' is ambiguous on its own (a merchant with no owner
 * yet looks identical to one with an owner invitation already out) — this
 * derives the distinction platform admins actually want to see from data
 * that already exists (a pending merchant-owner invitation), without
 * conflating "onboarding progress" with "account access state" in one
 * column. See merchant.service.js's activate/deactivate — unchanged.
 */
function deriveOnboardingStage(status, hasPendingOwnerInvite) {
  if (status === 'suspended') return 'suspended'
  if (status === 'active') return 'active'
  return hasPendingOwnerInvite ? 'invited' : 'draft'
}

// Merchant/User Details return every related row for one entity — a
// details view, not itself paginated. This is a pragmatic "effectively
// everything at realistic business scale" cap on the reused
// branch/device/membershipPlan list queries, not a stand-in for real
// pagination (which those repositories already provide on their own
// paginated list endpoints).
const DETAIL_LIST_PAGE = { pageSize: 500, offset: 0 }

// "Latest N" dashboard sections — a small, fixed preview, not a paginated
// list (those already exist as their own overview/list endpoints).
const DASHBOARD_LATEST_LIMIT = 5

/**
 * Platform Control Center: read-only aggregation across existing domain
 * repositories. This module owns no table of its own — every write
 * capability (create a merchant, edit a role, ...) already exists in its
 * proper module; this service only composes reads for operational
 * dashboards. No repository call here ever mutates anything.
 */
export const platformService = {
  /**
   * Counts plus a fixed set of small "latest N" operational summaries —
   * 11 total queries (1 aggregate count query + 10 bounded LIMIT-5 reads),
   * all run in parallel, one response. Not N+1: the query count is fixed
   * regardless of how large any underlying table grows.
   */
  async getDashboardSummary() {
    const [
      counts,
      latestMerchants,
      latestUsers,
      latestDevices,
      latestMembershipPlans,
      latestSubscriptions,
      pendingMerchantsList,
      suspendedMerchantsList,
      newestMerchantStaff,
      newestPlatformAdmins,
      recentActivity,
    ] = await Promise.all([
      platformRepository.getDashboardSummary(),
      platformRepository.getLatestMerchants(DASHBOARD_LATEST_LIMIT),
      platformRepository.getLatestUsers(DASHBOARD_LATEST_LIMIT),
      platformRepository.getLatestDevices(DASHBOARD_LATEST_LIMIT),
      platformRepository.getLatestMembershipPlans(DASHBOARD_LATEST_LIMIT),
      platformRepository.getLatestSubscriptions(DASHBOARD_LATEST_LIMIT),
      platformRepository.getPendingMerchants(DASHBOARD_LATEST_LIMIT),
      platformRepository.getSuspendedMerchants(DASHBOARD_LATEST_LIMIT),
      platformRepository.getNewestMerchantStaff(DASHBOARD_LATEST_LIMIT),
      platformRepository.getNewestPlatformAdmins(DASHBOARD_LATEST_LIMIT),
      platformRepository.getRecentActivity(DASHBOARD_LATEST_LIMIT),
    ])

    // `counts.pendingMerchants`/`counts.suspendedMerchants` are the
    // existing scalar counts (Phase 1, unchanged) — the *List suffix on
    // the new fields below is deliberate, so spreading `counts` first
    // can never have its count fields silently overwritten by these lists.
    return {
      ...counts,
      latestMerchants,
      latestUsers,
      latestDevices,
      latestMembershipPlans,
      latestSubscriptions,
      pendingMerchantsList,
      suspendedMerchantsList,
      newestMerchantStaff,
      newestPlatformAdmins,
      recentActivity,
    }
  },

  async listMerchantOverview(query) {
    const pagination = parsePagination(query)
    const filters = { status: query.status, search: query.search, sortBy: query.sortBy, sortOrder: query.sortOrder }

    const [items, total] = await Promise.all([
      platformRepository.findMerchantOverview(filters, pagination),
      platformRepository.countMerchantOverview(filters),
    ])

    return {
      items: items.map(({ hasPendingOwnerInvite, ...item }) => ({
        ...item,
        onboardingStage: deriveOnboardingStage(item.status, hasPendingOwnerInvite),
      })),
      meta: buildPaginationMeta({ page: pagination.page, pageSize: pagination.pageSize, total }),
    }
  },

  /**
   * Fixed query count regardless of how many branches/devices/plans/staff
   * the merchant has — one merchant lookup plus four independent,
   * parallel reads via the same repositories Merchant/Branch/Device/
   * Membership already use elsewhere, reusing their existing filters
   * (branch/plan by merchantId, device by the merchantIds tenant-scoping
   * filter Authorization already introduced) rather than duplicating SQL.
   */
  async getMerchantDetails(merchantId) {
    const merchant = await merchantRepository.findById(merchantId)

    if (!merchant) {
      throw new NotFoundError('Merchant not found')
    }

    const [branches, devices, membershipPlans, merchantStaff, pendingOwnerInviteCount] = await Promise.all([
      branchRepository.findAll({ merchantId }, DETAIL_LIST_PAGE),
      deviceRepository.findAll({ merchantIds: [merchantId] }, DETAIL_LIST_PAGE),
      membershipPlanRepository.findAll({ merchantId }, DETAIL_LIST_PAGE),
      merchantStaffRepository.findRosterForMerchant(merchantId),
      invitationRepository.count({ merchantId, status: 'pending', role: 'merchant-owner' }),
    ])

    const onboardingStage = deriveOnboardingStage(merchant.status, pendingOwnerInviteCount > 0)

    return { merchant, onboardingStage, branches, devices, membershipPlans, merchantStaff }
  },

  async listUserOverview(query) {
    const pagination = parsePagination(query)
    const filters = {
      status: query.status,
      search: query.search,
      role: query.role,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    }

    const [items, total] = await Promise.all([
      platformRepository.findUserOverview(filters, pagination),
      platformRepository.countUserOverview(filters),
    ])

    return {
      items,
      meta: buildPaginationMeta({ page: pagination.page, pageSize: pagination.pageSize, total }),
    }
  },

  /**
   * Roles/permissions are derived by reusing authorizationService's own
   * role-merging logic (the same "global + merchant-scoped" union
   * Authorization itself checks against) — not re-implemented here, so
   * this view can never drift from what Authorization actually enforces.
   */
  async getUserDetails(userId) {
    const user = await userRepository.findById(userId)

    if (!user) {
      throw new NotFoundError('User not found')
    }

    const [merchantAssignments, roleIds, roles] = await Promise.all([
      merchantStaffRepository.findAssignmentsForUser(userId),
      authorizationService.getAssignedRoleIds(userId),
      authorizationService.getAssignedRoleNames(userId),
    ])

    const permissions = await roleRepository.findPermissionNamesForRoles(roleIds)

    return { user, merchantAssignments, roles, permissions }
  },
}
