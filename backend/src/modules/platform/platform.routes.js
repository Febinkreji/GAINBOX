import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.js'
import { requireRole } from '../../middlewares/authorization.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { platformController } from './platform.controller.js'
import {
  merchantOverviewQuerySchema,
  merchantIdParamSchema,
  userOverviewQuerySchema,
  userIdParamSchema,
} from './platform.validation.js'
import { updateMerchantSchema } from '../merchant/merchant.validation.js'
import { auditController } from '../audit/audit.controller.js'
import { listAuditQuerySchema, auditIdParamSchema } from '../audit/audit.validation.js'
import { incidentController } from '../incident/incident.controller.js'
import {
  createIncidentSchema,
  updateIncidentSchema,
  incidentIdParamSchema,
  listIncidentsQuerySchema,
} from '../incident/incident.validation.js'
import { runbookController } from '../runbook/runbook.controller.js'
import {
  createRunbookSchema,
  updateRunbookSchema,
  runbookIdParamSchema,
  listRunbooksQuerySchema,
} from '../runbook/runbook.validation.js'
import { recommendationController } from '../recommendation/recommendation.controller.js'
import {
  createRecommendationSchema,
  updateRecommendationSchema,
  recommendationIdParamSchema,
  listRecommendationsQuerySchema,
} from '../recommendation/recommendation.validation.js'
import { merchantOnboardingController } from '../merchantOnboarding/merchantOnboarding.controller.js'
import { onboardMerchantSchema } from '../merchantOnboarding/merchantOnboarding.validation.js'
import { invitationController } from '../invitation/invitation.controller.js'
import {
  createInvitationSchema,
  invitationIdParamSchema,
  listInvitationsQuerySchema,
} from '../invitation/invitation.validation.js'

const router = Router()

// Platform Control Center: every route requires the platform-admin role via
// the existing Authorization middleware — no bespoke gate, no bypass.
// Merchant Owner/Staff/Viewer get the same 403 any other role-gated route
// in this codebase produces (see requireRole in authorization.middleware.js).
// Dashboard/Merchant/User/Audit/Health routes are read-only; Incident/
// Runbook/Recommendation routes below are the only writes in this module,
// and each still goes through the same requireAuth()+requireRole() gate —
// there is no separate, weaker path into them.
router.use(requireAuth(), requireRole('platform-admin'))

/**
 * @openapi
 * /platform/dashboard:
 *   get:
 *     summary: Platform-wide summary statistics
 *     description: >
 *       Every field is one aggregated SQL count computed in a single query
 *       — not a per-row scan. platform-admin only.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform summary
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/PlatformDashboardSummary' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/dashboard', platformController.getDashboard)

/**
 * @openapi
 * /platform/merchants:
 *   get:
 *     summary: Paginated merchant overview
 *     description: >
 *       Per-merchant branch/device/staff/membership-plan counts, computed
 *       via correlated SQL subqueries (no in-memory aggregation).
 *       platform-admin only — unlike /merchants (business API), this is
 *       never scoped to "merchants I belong to".
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Matches against the merchant's business name.
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, active, suspended] }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [businessName, createdAt, status] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: A page of merchant overview entries
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/PlatformMerchantOverviewItem' }
 *                     meta: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.get(
  '/merchants',
  validate(merchantOverviewQuerySchema, 'query'),
  platformController.listMerchantOverview,
)

/**
 * @openapi
 * /platform/merchants:
 *   post:
 *     summary: Onboard a new merchant (Merchant Onboarding, Features 1+2+3)
 *     description: >
 *       Creates the merchant and assigns its initial Merchant Owner in one
 *       atomic transaction (see merchantOnboarding.service.js). If
 *       `ownerEmail` matches an existing user, they're linked as
 *       merchant-owner immediately; otherwise a pending invitation is
 *       created (see /platform/invitations) for them to accept once they
 *       sign in via Google for the first time (Identity Sync creates their
 *       user then — this endpoint never creates a Firebase user itself).
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/MerchantOnboardingRequest' }
 *     responses:
 *       201:
 *         description: Merchant onboarded
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/MerchantOnboardingResult' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.post('/merchants', validate(onboardMerchantSchema), merchantOnboardingController.onboard)

/**
 * @openapi
 * /platform/merchants/{merchantId}:
 *   get:
 *     summary: Full detail view of one merchant
 *     description: >
 *       Merchant plus every branch, device, membership plan, and staff
 *       assignment (including historical/removed staff) — read only,
 *       platform-admin only.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Full merchant detail
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/PlatformMerchantDetails' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Merchant not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */
router.get(
  '/merchants/:merchantId',
  validate(merchantIdParamSchema, 'params'),
  platformController.getMerchantDetails,
)

/**
 * @openapi
 * /platform/merchants/{merchantId}:
 *   patch:
 *     summary: Edit a merchant (Platform Administration, Step 1)
 *     description: >
 *       Reuses merchant.service.js's own update() — the same validation,
 *       transaction, and `merchant.updated` audit entry as the merchant-
 *       scoped `PATCH /merchant/profile` route, just addressable by any
 *       merchant id since the caller is a platform-admin, not a merchant
 *       staff member. Accepts `status` too; prefer the dedicated
 *       activate/deactivate actions below for lifecycle transitions — they
 *       add a more specific audit entry on top of the same write.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               businessName: { type: string, example: Iron Forge Fitness }
 *               legalName: { type: string, nullable: true }
 *               businessType:
 *                 type: string
 *                 enum: [gym, meal-provider, wellness-center, yoga-studio, physio-clinic, nutrition-center, fitness-chain, other]
 *               status: { type: string, enum: [pending, active, suspended] }
 *               contactEmail: { type: string, format: email }
 *               contactPhone: { type: string }
 *               address: { type: string, nullable: true }
 *               timezone: { type: string, nullable: true, example: Asia/Kolkata }
 *               currency: { type: string, example: INR }
 *               country: { type: string, nullable: true }
 *     responses:
 *       200:
 *         description: Merchant updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Merchant' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Merchant not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 *       422:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.patch(
  '/merchants/:merchantId',
  validate(merchantIdParamSchema, 'params'),
  validate(updateMerchantSchema),
  platformController.updateMerchant,
)

/**
 * @openapi
 * /platform/merchants/{merchantId}/activate:
 *   post:
 *     summary: Activate a merchant (Platform Administration, Step 1)
 *     description: >
 *       Sets status to "active" via merchant.service.js's update(), plus a
 *       dedicated `merchant.activated` audit entry (on top of the generic
 *       `merchant.updated` one update() already records) so the lifecycle
 *       transition is distinctly identifiable in the audit trail. Rejects
 *       with 409 if the merchant is already active.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Merchant activated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Merchant' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Merchant not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 *       409:
 *         description: Merchant is already active
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post(
  '/merchants/:merchantId/activate',
  validate(merchantIdParamSchema, 'params'),
  platformController.activateMerchant,
)

/**
 * @openapi
 * /platform/merchants/{merchantId}/deactivate:
 *   post:
 *     summary: Deactivate (suspend) a merchant (Platform Administration, Step 1)
 *     description: >
 *       Sets status to "suspended" via merchant.service.js's update(), plus
 *       a dedicated `merchant.deactivated` audit entry (on top of the
 *       generic `merchant.updated` one update() already records). Rejects
 *       with 409 if the merchant is already suspended.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Merchant deactivated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Merchant' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Merchant not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 *       409:
 *         description: Merchant is already suspended
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post(
  '/merchants/:merchantId/deactivate',
  validate(merchantIdParamSchema, 'params'),
  platformController.deactivateMerchant,
)

/**
 * @openapi
 * /platform/merchants/{merchantId}:
 *   delete:
 *     summary: Delete a merchant (Platform Administration)
 *     description: >
 *       Soft-deletes via merchant.service.js's remove() — sets `deleted_at`;
 *       the row is never physically removed, matching the same pattern
 *       already used for incidents/runbooks/recommendations. Blocked with
 *       409 if the merchant has any branches, devices, active memberships
 *       (subscriptions to any of its membership plans), or a pending/running
 *       Surfboard onboarding sync. On success, every pending/expired
 *       invitation for the merchant is revoked and its Surfboard provider
 *       link (if any) is soft-deleted, all in the same transaction as the
 *       merchant's own soft-delete. Records a `merchant.deleted` audit entry
 *       and a `MerchantDeleted` outbox event.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Merchant deleted
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiResponse' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Merchant not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 *       409:
 *         description: >
 *           Merchant has branches, devices, active memberships, and/or
 *           pending Surfboard onboarding — the error message names which.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.delete(
  '/merchants/:merchantId',
  validate(merchantIdParamSchema, 'params'),
  platformController.removeMerchant,
)

/**
 * @openapi
 * /platform/users:
 *   get:
 *     summary: Paginated user overview
 *     description: >
 *       Every user's assigned role names (global + merchant-scoped, merged)
 *       and distinct merchant count, computed via aggregate SQL. platform-
 *       admin only.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Matches against display name or email.
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, invited, disabled] }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [platform-admin, merchant-owner, merchant-staff, viewer, customer] }
 *         description: Restricts to users holding this role, globally or at any merchant.
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [displayName, email, createdAt, status] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: A page of user overview entries
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/PlatformUserOverviewItem' }
 *                     meta: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.get('/users', validate(userOverviewQuerySchema, 'query'), platformController.listUserOverview)

/**
 * @openapi
 * /platform/users/{userId}:
 *   get:
 *     summary: Full detail view of one user
 *     description: >
 *       User profile, every merchant assignment (including historical/
 *       removed), assigned role names, and the union of every permission
 *       those roles grant — reusing Authorization's own role-merging logic,
 *       so this view can never drift from what Authorization enforces.
 *       Read only, platform-admin only.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Full user detail
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/PlatformUserDetails' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */
router.get('/users/:userId', validate(userIdParamSchema, 'params'), platformController.getUserDetails)

/**
 * @openapi
 * /platform/users/{userId}/activate:
 *   post:
 *     summary: Activate a user (Platform Administration, Step 4)
 *     description: >
 *       Sets the user's status to "active" via user.service.js's new
 *       activate() (reusing userRepository's existing generic status
 *       writer, not a new repository method). Records a `user.activated`
 *       audit entry and a `UserActivated` outbox event. Does not touch
 *       role or permission assignments. Rejects with 409 if the user is
 *       already active.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User activated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         id: { type: string, format: uuid }
 *                         firebaseUid: { type: string }
 *                         email: { type: string, format: email }
 *                         displayName: { type: string, nullable: true }
 *                         status: { type: string, enum: [active, invited, disabled] }
 *                         createdAt: { type: string, format: date-time }
 *                         updatedAt: { type: string, format: date-time }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 *       409:
 *         description: User is already active
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/users/:userId/activate', validate(userIdParamSchema, 'params'), platformController.activateUser)

/**
 * @openapi
 * /platform/users/{userId}/deactivate:
 *   post:
 *     summary: Deactivate a user (Platform Administration, Step 4)
 *     description: >
 *       Sets the user's status to "disabled" via user.service.js's new
 *       deactivate(). A disabled user fails `assertActiveAccount` on their
 *       next request (see authorization.middleware.js), so this is the
 *       actual access-revocation mechanism — no separate "ban" flag exists.
 *       Records a `user.deactivated` audit entry and a `UserDeactivated`
 *       outbox event. Rejects with 409 if the user is already disabled.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User deactivated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         id: { type: string, format: uuid }
 *                         firebaseUid: { type: string }
 *                         email: { type: string, format: email }
 *                         displayName: { type: string, nullable: true }
 *                         status: { type: string, enum: [active, invited, disabled] }
 *                         createdAt: { type: string, format: date-time }
 *                         updatedAt: { type: string, format: date-time }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 *       409:
 *         description: User is already disabled
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/users/:userId/deactivate', validate(userIdParamSchema, 'params'), platformController.deactivateUser)

/**
 * @openapi
 * /platform/health:
 *   get:
 *     summary: Current system health
 *     description: >
 *       Live checks, not monitoring history — database and Firebase
 *       connectivity are checked fresh on every call; Surfboard/queue/
 *       storage are honest placeholders (no real client/worker/storage
 *       exists yet). platform-admin only.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Health snapshot
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/PlatformHealth' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/health', platformController.getHealth)

/**
 * @openapi
 * /platform/audit:
 *   get:
 *     summary: Paginated audit log browser
 *     description: >
 *       Reads audit_logs only — never writes it (see audit.service.js's
 *       record(), untouched). `severity` filters metadata->>'severity',
 *       since audit_logs has no severity column; no current entries set
 *       it (the write path never has), forward-compatible only.
 *       `before` is always null for the same reason — audit writes only
 *       ever capture one snapshot, never a before/after pair.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Matches against action, entity type, or metadata content.
 *       - in: query
 *         name: entityType
 *         schema: { type: string, example: merchant }
 *       - in: query
 *         name: entityId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: actorUserId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: action
 *         schema: { type: string, example: merchant.created }
 *       - in: query
 *         name: severity
 *         schema: { type: string }
 *         description: Matches metadata->>'severity' — see description above.
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: A page of audit entries
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/PlatformAuditEntry' }
 *                     meta: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.get('/audit', validate(listAuditQuerySchema, 'query'), auditController.list)

/**
 * @openapi
 * /platform/audit/{id}:
 *   get:
 *     summary: Get one audit entry by id
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: The audit entry
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/PlatformAuditEntry' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Audit entry not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */
router.get('/audit/:id', validate(auditIdParamSchema, 'params'), auditController.getById)

/**
 * @openapi
 * /platform/incidents:
 *   get:
 *     summary: List incidents
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Matches against title or description.
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [open, investigating, resolved, closed, cancelled] }
 *       - in: query
 *         name: severity
 *         schema: { type: string, enum: [low, medium, high, critical] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: merchantId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: branchId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: deviceId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: assignedTo
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [createdAt, updatedAt, severity, status, title] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: A page of incidents
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Incident' }
 *                     meta: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.get('/incidents', validate(listIncidentsQuerySchema, 'query'), incidentController.list)

/**
 * @openapi
 * /platform/incidents/{id}:
 *   get:
 *     summary: Get an incident by id
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: The incident
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Incident' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Incident not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */
router.get('/incidents/:id', validate(incidentIdParamSchema, 'params'), incidentController.getById)

/**
 * @openapi
 * /platform/incidents:
 *   post:
 *     summary: Create an incident
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               description: { type: string, nullable: true }
 *               severity: { type: string, enum: [low, medium, high, critical], default: medium }
 *               status: { type: string, enum: [open, investigating, resolved, closed, cancelled], default: open }
 *               category: { type: string, nullable: true }
 *               merchantId: { type: string, format: uuid, nullable: true }
 *               branchId: { type: string, format: uuid, nullable: true }
 *               deviceId: { type: string, format: uuid, nullable: true }
 *               assignedTo: { type: string, format: uuid, nullable: true }
 *     responses:
 *       201:
 *         description: Incident created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Incident' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.post('/incidents', validate(createIncidentSchema), incidentController.create)

/**
 * @openapi
 * /platform/incidents/{id}:
 *   patch:
 *     summary: Update an incident
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               title: { type: string }
 *               description: { type: string, nullable: true }
 *               severity: { type: string, enum: [low, medium, high, critical] }
 *               status: { type: string, enum: [open, investigating, resolved, closed, cancelled] }
 *               category: { type: string, nullable: true }
 *               merchantId: { type: string, format: uuid, nullable: true }
 *               branchId: { type: string, format: uuid, nullable: true }
 *               deviceId: { type: string, format: uuid, nullable: true }
 *               assignedTo: { type: string, format: uuid, nullable: true }
 *     responses:
 *       200:
 *         description: Incident updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Incident' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Incident not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 *       422:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.patch(
  '/incidents/:id',
  validate(incidentIdParamSchema, 'params'),
  validate(updateIncidentSchema),
  incidentController.update,
)

/**
 * @openapi
 * /platform/incidents/{id}:
 *   delete:
 *     summary: Soft-delete an incident
 *     description: Sets deleted_at; the row is never physically removed.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Incident deleted
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiResponse' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Incident not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */
router.delete('/incidents/:id', validate(incidentIdParamSchema, 'params'), incidentController.remove)

/**
 * @openapi
 * /platform/runbooks:
 *   get:
 *     summary: List runbooks
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Matches against title or description.
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: active
 *         schema: { type: string, enum: ['true', 'false'] }
 *       - in: query
 *         name: relatedIncidentType
 *         schema: { type: string }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [title, createdAt, updatedAt, version] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: A page of runbooks
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Runbook' }
 *                     meta: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.get('/runbooks', validate(listRunbooksQuerySchema, 'query'), runbookController.list)

/**
 * @openapi
 * /platform/runbooks/{id}:
 *   get:
 *     summary: Get a runbook by id
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: The runbook
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Runbook' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Runbook not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */
router.get('/runbooks/:id', validate(runbookIdParamSchema, 'params'), runbookController.getById)

/**
 * @openapi
 * /platform/runbooks:
 *   post:
 *     summary: Create a runbook
 *     description: Always created at version 1, active by default.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string }
 *               category: { type: string, nullable: true }
 *               description: { type: string, nullable: true }
 *               steps:
 *                 type: array
 *                 items: {}
 *                 description: Free-form ordered procedure content — strings or objects.
 *               relatedIncidentTypes: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Runbook created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Runbook' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.post('/runbooks', validate(createRunbookSchema), runbookController.create)

/**
 * @openapi
 * /platform/runbooks/{id}:
 *   patch:
 *     summary: Update a runbook
 *     description: Every successful update bumps `version` by one automatically — not client-settable.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               title: { type: string }
 *               category: { type: string, nullable: true }
 *               description: { type: string, nullable: true }
 *               steps: { type: array, items: {} }
 *               relatedIncidentTypes: { type: array, items: { type: string } }
 *               active: { type: boolean }
 *     responses:
 *       200:
 *         description: Runbook updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Runbook' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Runbook not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 *       422:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.patch(
  '/runbooks/:id',
  validate(runbookIdParamSchema, 'params'),
  validate(updateRunbookSchema),
  runbookController.update,
)

/**
 * @openapi
 * /platform/runbooks/{id}:
 *   delete:
 *     summary: Soft-delete a runbook
 *     description: Sets deleted_at; the row is never physically removed.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Runbook deleted
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiResponse' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Runbook not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */
router.delete('/runbooks/:id', validate(runbookIdParamSchema, 'params'), runbookController.remove)

/**
 * @openapi
 * /platform/recommendations:
 *   get:
 *     summary: List recommendations
 *     description: The Incident -> Recommendation -> Runbook link.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Matches against the recommendation's description.
 *       - in: query
 *         name: incidentId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: runbookId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [suggested, applied, dismissed] }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [createdAt, updatedAt, status] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: A page of recommendations
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Recommendation' }
 *                     meta: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.get('/recommendations', validate(listRecommendationsQuerySchema, 'query'), recommendationController.list)

/**
 * @openapi
 * /platform/recommendations/{id}:
 *   get:
 *     summary: Get a recommendation by id
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: The recommendation
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Recommendation' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Recommendation not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */
router.get(
  '/recommendations/:id',
  validate(recommendationIdParamSchema, 'params'),
  recommendationController.getById,
)

/**
 * @openapi
 * /platform/recommendations:
 *   post:
 *     summary: Create a recommendation
 *     description: Links an existing incident to an existing runbook — both must already exist.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [incidentId, runbookId]
 *             properties:
 *               incidentId: { type: string, format: uuid }
 *               runbookId: { type: string, format: uuid }
 *               description: { type: string, nullable: true }
 *               status: { type: string, enum: [suggested, applied, dismissed], default: suggested }
 *     responses:
 *       201:
 *         description: Recommendation created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Recommendation' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: incidentId or runbookId does not reference an existing row
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 *       422:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.post('/recommendations', validate(createRecommendationSchema), recommendationController.create)

/**
 * @openapi
 * /platform/recommendations/{id}:
 *   patch:
 *     summary: Update a recommendation
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               description: { type: string, nullable: true }
 *               status: { type: string, enum: [suggested, applied, dismissed] }
 *     responses:
 *       200:
 *         description: Recommendation updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Recommendation' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Recommendation not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 *       422:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.patch(
  '/recommendations/:id',
  validate(recommendationIdParamSchema, 'params'),
  validate(updateRecommendationSchema),
  recommendationController.update,
)

/**
 * @openapi
 * /platform/recommendations/{id}:
 *   delete:
 *     summary: Soft-delete a recommendation
 *     description: Sets deleted_at; the row is never physically removed.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Recommendation deleted
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiResponse' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Recommendation not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */
router.delete(
  '/recommendations/:id',
  validate(recommendationIdParamSchema, 'params'),
  recommendationController.remove,
)

/**
 * @openapi
 * /platform/invitations:
 *   get:
 *     summary: List merchant staff invitations (Feature 4)
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Matches against email or display name.
 *       - in: query
 *         name: merchantId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, accepted, expired, revoked] }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [merchant-owner, merchant-staff, viewer] }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [createdAt, expiresAt, status, email] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: A page of invitations
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/MerchantInvitation' }
 *                     meta: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.get('/invitations', validate(listInvitationsQuerySchema, 'query'), invitationController.list)

/**
 * @openapi
 * /platform/invitations/{id}:
 *   get:
 *     summary: Get an invitation by id
 *     description: Never returns the token or its hash — only metadata about the invitation.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: The invitation
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/MerchantInvitation' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Invitation not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */
router.get('/invitations/:id', validate(invitationIdParamSchema, 'params'), invitationController.getById)

/**
 * @openapi
 * /platform/invitations:
 *   post:
 *     summary: Create a standalone invitation (Feature 4)
 *     description: >
 *       Independent of Merchant Onboarding — invites someone to an
 *       existing merchant with any assignable role, not just
 *       merchant-owner. Returns the plaintext token exactly once; only its
 *       hash is ever persisted (see invitationToken.js). No email is sent
 *       — delivering the token to its recipient is out of scope for this
 *       phase.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [merchantId, email, role]
 *             properties:
 *               merchantId: { type: string, format: uuid }
 *               email: { type: string, format: email }
 *               displayName: { type: string, nullable: true }
 *               role: { type: string, enum: [merchant-owner, merchant-staff, viewer] }
 *     responses:
 *       201:
 *         description: Invitation created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/MerchantInvitationWithToken' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: merchantId or role does not reference an existing row
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 *       409:
 *         description: A pending invitation already exists for this email at this merchant
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.post('/invitations', validate(createInvitationSchema), invitationController.create)

/**
 * @openapi
 * /platform/invitations/{id}/resend:
 *   post:
 *     summary: Reissue a fresh token and expiration (Feature 4)
 *     description: Only valid for pending or expired invitations. No email is sent — same as create.
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Invitation resent
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/MerchantInvitationWithToken' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Invitation not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 *       409:
 *         description: Invitation is already accepted or revoked
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/invitations/:id/resend', validate(invitationIdParamSchema, 'params'), invitationController.resend)

/**
 * @openapi
 * /platform/invitations/{id}/revoke:
 *   post:
 *     summary: Revoke a pending or expired invitation (Feature 4)
 *     tags: [Platform]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Invitation revoked
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/MerchantInvitation' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Invitation not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 *       409:
 *         description: Invitation is already accepted or revoked
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/invitations/:id/revoke', validate(invitationIdParamSchema, 'params'), invitationController.revoke)

export default router
