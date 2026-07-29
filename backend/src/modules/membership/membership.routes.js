import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.js'
import { requirePermission, requireOwnership, scopeMerchantAccess } from '../../middlewares/authorization.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { membershipController } from './membership.controller.js'
import {
  createMembershipPlanSchema,
  updateMembershipPlanSchema,
  membershipPlanIdParamSchema,
  listMembershipPlansQuerySchema,
  createSubscriptionSchema,
  subscriptionIdParamSchema,
  listSubscriptionsQuerySchema,
} from './membership.validation.js'

const router = Router()

router.use(requireAuth())

/**
 * @openapi
 * /memberships/plans:
 *   get:
 *     summary: List membership plans
 *     description: Supports search, filtering by merchant/status, sorting, and pagination.
 *     tags: [Membership Plans]
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
 *         name: merchantId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Matches against the plan name.
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, archived] }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [name, price, createdAt, status] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: A page of membership plans
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/MembershipPlan' }
 *                     meta: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
// Tenant-scoped — same shape as branch.routes.js/device.routes.js.
router.get(
  '/plans',
  requirePermission('membership.read'),
  scopeMerchantAccess(),
  validate(listMembershipPlansQuerySchema, 'query'),
  membershipController.listPlans,
)

/**
 * @openapi
 * /memberships/plans/{id}:
 *   get:
 *     summary: Get a membership plan by id
 *     tags: [Membership Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: The membership plan
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/MembershipPlan' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Membership plan not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */
router.get(
  '/plans/:id',
  validate(membershipPlanIdParamSchema, 'params'),
  requirePermission('membership.read'),
  requireOwnership('membershipPlan', (req) => req.params.id),
  membershipController.getPlanById,
)

/**
 * @openapi
 * /memberships/plans:
 *   post:
 *     summary: Create a membership plan
 *     description: >
 *       A plan always belongs to an existing merchant — `merchantId` must
 *       reference a real, non-deleted merchant or the request fails with
 *       404. No Surfboard integration point exists for this module —
 *       membership plans are a pure GainBox concept.
 *     tags: [Membership Plans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [merchantId, name, price, billingCycle]
 *             properties:
 *               merchantId: { type: string, format: uuid }
 *               name: { type: string, example: 'Muscle Gain Package' }
 *               description: { type: string, nullable: true }
 *               price: { type: number, format: float, example: 2499 }
 *               currency: { type: string, example: INR }
 *               billingCycle: { type: string, enum: [one-time, monthly, quarterly, yearly] }
 *     responses:
 *       201:
 *         description: Membership plan created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/MembershipPlan' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: merchantId does not reference an existing merchant
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 *       422:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.post(
  '/plans',
  validate(createMembershipPlanSchema),
  requirePermission('membership.write'),
  requireOwnership('merchant', (req) => req.body.merchantId),
  membershipController.createPlan,
)

/**
 * @openapi
 * /memberships/plans/{id}:
 *   patch:
 *     summary: Update a membership plan
 *     tags: [Membership Plans]
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
 *               name: { type: string }
 *               description: { type: string, nullable: true }
 *               price: { type: number, format: float }
 *               currency: { type: string }
 *               billingCycle: { type: string, enum: [one-time, monthly, quarterly, yearly] }
 *               status: { type: string, enum: [active, archived] }
 *     responses:
 *       200:
 *         description: Membership plan updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/MembershipPlan' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Membership plan not found
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
  '/plans/:id',
  validate(membershipPlanIdParamSchema, 'params'),
  requirePermission('membership.write'),
  requireOwnership('membershipPlan', (req) => req.params.id),
  validate(updateMembershipPlanSchema),
  membershipController.updatePlan,
)

/**
 * @openapi
 * /memberships/plans/{id}:
 *   delete:
 *     summary: Soft-delete a membership plan
 *     description: Sets deleted_at; the row is never physically removed.
 *     tags: [Membership Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Membership plan deleted
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiResponse' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Membership plan not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */
router.delete(
  '/plans/:id',
  validate(membershipPlanIdParamSchema, 'params'),
  requirePermission('membership.write'),
  requireOwnership('membershipPlan', (req) => req.params.id),
  membershipController.removePlan,
)

/**
 * @openapi
 * /memberships/subscriptions:
 *   get:
 *     summary: List subscriptions
 *     description: Supports filtering by plan/customer/status, sorting, and pagination.
 *     tags: [Subscriptions]
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
 *         name: membershipPlanId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: customerId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, cancelled, expired] }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [createdAt, startedAt, status] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: A page of subscriptions
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Subscription' }
 *                     meta: { $ref: '#/components/schemas/Pagination' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
// Subscriptions list stays permission-gated only — not named in this
// phase's tenant-scoping scope (unlike branch/device/membershipPlan lists,
// now scoped below and in branch.routes.js/device.routes.js). Single-entity
// subscription routes below DO get full ownership checks, now that
// OwnershipResolver has resolveMerchantFromSubscription. Documented
// follow-up: subscriptions have no merchant_id of their own (would need a
// join through membership_plans, same shape as devices' branch_id join).
router.get(
  '/subscriptions',
  requirePermission('membership.read'),
  validate(listSubscriptionsQuerySchema, 'query'),
  membershipController.listSubscriptions,
)

/**
 * @openapi
 * /memberships/subscriptions/{id}:
 *   get:
 *     summary: Get a subscription by id
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: The subscription
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Subscription' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Subscription not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */
router.get(
  '/subscriptions/:id',
  validate(subscriptionIdParamSchema, 'params'),
  requirePermission('membership.read'),
  requireOwnership('subscription', (req) => req.params.id),
  membershipController.getSubscriptionById,
)

/**
 * @openapi
 * /memberships/subscriptions:
 *   post:
 *     summary: Create a subscription
 *     description: >
 *       `membershipPlanId` must reference a real, non-deleted, non-archived
 *       plan — subscribing to an archived plan fails with 409.
 *       `customerId` is validated as a well-formed UUID only; existence
 *       against Users is not checked (the User module has no real
 *       repository yet — out of scope for this phase, same reasoning
 *       Payments is excluded).
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [membershipPlanId, customerId]
 *             properties:
 *               membershipPlanId: { type: string, format: uuid }
 *               customerId: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Subscription created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Subscription' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: membershipPlanId does not reference an existing plan
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 *       409:
 *         description: The plan is archived and not accepting new subscribers
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.post(
  '/subscriptions',
  validate(createSubscriptionSchema),
  requirePermission('membership.write'),
  requireOwnership('membershipPlan', (req) => req.body.membershipPlanId),
  membershipController.createSubscription,
)

/**
 * @openapi
 * /memberships/subscriptions/{id}/cancel:
 *   post:
 *     summary: Cancel a subscription
 *     description: Only a currently-active subscription can be cancelled; cancelling an already-cancelled or expired one fails with 409.
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Subscription cancelled
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Subscription' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Subscription not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 *       409:
 *         description: Subscription is not active
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post(
  '/subscriptions/:id/cancel',
  validate(subscriptionIdParamSchema, 'params'),
  requirePermission('membership.write'),
  requireOwnership('subscription', (req) => req.params.id),
  membershipController.cancelSubscription,
)

export default router
