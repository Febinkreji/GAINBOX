import { ForbiddenError, NotFoundError } from '../errors/index.js'
import { authorizationService } from '../modules/authorization/authorization.service.js'
import { resolveOwnership } from '../ownership/ownershipResolver.js'

/**
 * Authorization: decides what an already-identified req.user (see
 * modules/identity/identitySync.service.js) is allowed to do. Reads
 * role/permission state from Postgres only (via authorizationService) —
 * never from the Firebase token or anything upstream of Identity Sync.
 *
 * Three composable middlewares, applied per-route, in the order the request
 * flow expects (Authentication -> Identity Sync -> Authorization ->
 * Ownership -> Controller):
 *
 *  - requireRole(...names)       coarse: user must literally hold one of
 *                                 these role names, globally or at any
 *                                 merchant. Reserved for genuinely
 *                                 platform-wide actions (e.g. listing every
 *                                 merchant) — not general business-module
 *                                 gating, which should prefer...
 *  - requirePermission(name)     ...the general case: user must hold this
 *                                 permission via *some* assigned role,
 *                                 anywhere. Doesn't know or care which
 *                                 merchant the request targets — that's
 *                                 Ownership's job, applied next.
 *  - requireOwnership(type, id)  fine-grained: resolves the specific
 *                                 entity's owning merchant via
 *                                 OwnershipResolver (../ownership/
 *                                 ownershipResolver.js — untouched by this
 *                                 file, only called) and checks req.user
 *                                 actually belongs to it. Platform admins
 *                                 bypass this check (see
 *                                 authorizationService.userCanAccessMerchant).
 *
 * None of these ever inspect a role/permission list inline in a controller —
 * every decision is data-driven from Postgres, per "do not hardcode
 * permissions inside controllers".
 *
 * Every one of the three checks account status first, before any role or
 * permission evaluation — a disabled user is rejected regardless of what
 * roles/permissions they'd otherwise hold. This lives here (Authorization),
 * not in requireAuth() (Authentication) or Identity Sync: `req.user.status`
 * is already populated by Identity Sync, Authorization just enforces it,
 * once, in one shared helper — never duplicated per-controller.
 */
function assertActiveAccount(user) {
  if (user.status !== 'active') {
    throw new ForbiddenError('Account is not active')
  }
}

export function requireRole(...roleNames) {
  return async function requireRoleMiddleware(req, _res, next) {
    try {
      assertActiveAccount(req.user)

      const allowed = await authorizationService.userHasAnyRole(req.user.id, roleNames)

      if (!allowed) {
        throw new ForbiddenError(`Requires one of these roles: ${roleNames.join(', ')}`)
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

export function requirePermission(permissionName) {
  return async function requirePermissionMiddleware(req, _res, next) {
    try {
      assertActiveAccount(req.user)

      const allowed = await authorizationService.userHasPermission(req.user.id, permissionName)

      if (!allowed) {
        throw new ForbiddenError(`Missing required permission: ${permissionName}`)
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Populates `req.accessibleMerchantIds` for tenant-scoped list endpoints —
 * `null` (platform admin, unrestricted) or an array of merchant ids this
 * user is actively staffed at (possibly empty). Controllers only ever read
 * this value and forward it to their service/repository's `merchantIds`
 * filter; the repository is what turns it into SQL (`= ANY(...)`), so
 * scoping happens in one round trip, never by loading every row and
 * filtering in memory. See authorizationService.getAccessibleMerchantIds.
 */
export function scopeMerchantAccess() {
  return async function scopeMerchantAccessMiddleware(req, _res, next) {
    try {
      assertActiveAccount(req.user)

      req.accessibleMerchantIds = await authorizationService.getAccessibleMerchantIds(req.user.id)
      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * `entityType` is one of OwnershipResolver's registered types ('branch' |
 * 'device' | 'membershipPlan' | 'subscription'), or the literal 'merchant' —
 * a merchant is its own owning merchant, so that one case is resolved here
 * rather than registering a self-referencing entry in OwnershipResolver.
 *
 * `getEntityId(req)` reads wherever the route keeps the relevant id: an
 * existing entity's :id param for get/update/delete, or a parent id in the
 * request body for create (e.g. `(req) => req.body.merchantId` when
 * creating a branch, since the branch itself doesn't exist yet to resolve
 * ownership from).
 */
export function requireOwnership(entityType, getEntityId) {
  return async function requireOwnershipMiddleware(req, _res, next) {
    try {
      assertActiveAccount(req.user)

      const entityId = getEntityId(req)

      if (!entityId) {
        throw new NotFoundError(`${entityType} not found`)
      }

      const merchantId =
        entityType === 'merchant' ? entityId : (await resolveOwnership(entityType, entityId))?.merchantId

      if (!merchantId) {
        throw new NotFoundError(`${entityType} not found`)
      }

      const allowed = await authorizationService.userCanAccessMerchant(req.user.id, merchantId)

      if (!allowed) {
        throw new ForbiddenError(`You do not have access to this ${entityType}`)
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}
