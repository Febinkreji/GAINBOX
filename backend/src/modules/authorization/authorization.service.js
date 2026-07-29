import { userRoleRepository } from './userRole.repository.js'
import { merchantStaffRepository } from '../merchantStaff/merchantStaff.repository.js'
import { roleRepository } from '../role/role.repository.js'

const PLATFORM_ADMIN_ROLE = 'platform-admin'

/**
 * Answers "what is this user allowed to do", reading role/permission state
 * from Postgres only — never from the Firebase token or req.user beyond its
 * id, per "never trust Firebase claims". Two independent role sources
 * compose here: global grants (user_roles — e.g. Platform Admin) and
 * merchant-scoped grants (merchant_staff — Merchant Owner/Staff/Viewer at a
 * specific merchant). A permission or role check passes if *either* source
 * grants it; which merchant a merchant-scoped grant applies to is only
 * relevant to userCanAccessMerchant, not to the coarse role/permission
 * checks (that distinction is Ownership's job — see
 * ../../middlewares/authorization.middleware.js).
 */

async function getAssignedRoleIds(userId) {
  const [globalRoleIds, merchantRoleIds] = await Promise.all([
    userRoleRepository.findRoleIdsForUser(userId),
    merchantStaffRepository.findActiveRoleIdsForUser(userId),
  ])

  return [...new Set([...globalRoleIds, ...merchantRoleIds])]
}

async function getAssignedRoleNames(userId) {
  const [globalRoleNames, merchantRoleNames] = await Promise.all([
    userRoleRepository.findRoleNamesForUser(userId),
    merchantStaffRepository.findActiveRoleNamesForUser(userId),
  ])

  return [...new Set([...globalRoleNames, ...merchantRoleNames])]
}

async function isPlatformAdmin(userId) {
  const globalRoleNames = await userRoleRepository.findRoleNamesForUser(userId)
  return globalRoleNames.includes(PLATFORM_ADMIN_ROLE)
}

export const authorizationService = {
  isPlatformAdmin,

  /**
   * Every role id/name this user is assigned, merging global (user_roles)
   * and merchant-scoped (merchant_staff) grants — exposed publicly (not
   * just used internally by userHasAnyRole/userHasPermission) so read-only
   * consumers like Platform Control Center's User Details can display "what
   * roles/permissions does this user have" without re-deriving the same
   * merge logic outside Authorization.
   */
  getAssignedRoleIds,
  getAssignedRoleNames,

  /** Does this user hold ANY of these role names, globally or at any merchant? */
  async userHasAnyRole(userId, roleNames) {
    const assignedNames = await getAssignedRoleNames(userId)
    return assignedNames.some((name) => roleNames.includes(name))
  },

  /** Does this user hold this permission via *some* assigned role, anywhere? */
  async userHasPermission(userId, permissionName) {
    const roleIds = await getAssignedRoleIds(userId)
    return roleRepository.hasPermission(roleIds, permissionName)
  },

  /**
   * Can this user access this specific merchant? Platform admins bypass
   * merchant scoping entirely (they aren't tied to one by definition);
   * everyone else needs an active merchant_staff row for it.
   */
  async userCanAccessMerchant(userId, merchantId) {
    if (await isPlatformAdmin(userId)) {
      return true
    }

    const assignment = await merchantStaffRepository.findActiveAssignment(userId, merchantId)
    return assignment !== null
  },

  /**
   * The set of merchant ids a *list* query should be scoped to. `null`
   * means unrestricted (platform admin — see everything); otherwise an
   * array (possibly empty) of merchant ids this user is actively staffed
   * at. Repositories treat `null` as "no filter" and an array as
   * `merchant_id = ANY(...)` — see branch/device/membershipPlan
   * repositories' `merchantIds` filter.
   */
  async getAccessibleMerchantIds(userId) {
    if (await isPlatformAdmin(userId)) {
      return null
    }

    return merchantStaffRepository.findActiveMerchantIdsForUser(userId)
  },
}
