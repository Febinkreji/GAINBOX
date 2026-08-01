import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.js'
import { requirePermission, requireMerchantContext } from '../../middlewares/authorization.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { merchantController } from './merchant.controller.js'
import { updateMerchantSchema } from './merchant.validation.js'
import { merchantStaffController } from '../merchantStaff/merchantStaff.controller.js'
import { staffIdParamSchema, invitationIdOnlyParamSchema } from '../merchantStaff/merchantStaff.validation.js'
import { createMerchantScopedInvitationSchema, listInvitationsQuerySchema } from '../invitation/invitation.validation.js'
import { merchantSyncController } from '../merchantSync/merchantSync.controller.js'

/**
 * Merchant-context routes — mounted at /merchant (singular), not /merchants.
 * The whole point: the frontend never knows or supplies its own merchantId.
 * requireMerchantContext() derives req.merchantId from the authenticated
 * user's own merchant_staff assignment (see authorization.middleware.js),
 * and every handler below is the SAME controller function the legacy
 * /merchants/:id/* routes use (see merchant.controller.js/
 * merchantStaff.controller.js's resolveMerchantId helpers) — no business
 * logic, validation, or SQL is duplicated between the two route families.
 */
const router = Router()

router.use(requireAuth(), requireMerchantContext())

/**
 * @openapi
 * /merchant/profile:
 *   get:
 *     summary: The authenticated user's own merchant profile
 *     description: merchantId is derived from the caller — never supplied. Equivalent to GET /merchants/{id} for "my own merchant".
 *     tags: [Merchant Context]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: The merchant
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Merchant' }
 *       401: { description: Missing or invalid bearer token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: No merchant.read permission, or caller has no merchant assignment, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *   patch:
 *     summary: Update the authenticated user's own merchant profile
 *     tags: [Merchant Context]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               businessName: { type: string }
 *               legalName: { type: string, nullable: true }
 *               businessType: { type: string }
 *               status: { type: string, enum: [pending, active, suspended] }
 *               contactEmail: { type: string, format: email }
 *               contactPhone: { type: string }
 *               address: { type: string, nullable: true }
 *               timezone: { type: string, nullable: true }
 *               currency: { type: string }
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
 *       401: { description: Missing or invalid bearer token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: No merchant.write permission, or caller has no merchant assignment, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       422: { description: Invalid request body, content: { application/json: { schema: { $ref: '#/components/schemas/ValidationError' } } } }
 */
router.get('/profile', requirePermission('merchant.read'), merchantController.getById)
router.patch('/profile', requirePermission('merchant.write'), validate(updateMerchantSchema), merchantController.update)

/**
 * @openapi
 * /merchant/payment-status:
 *   get:
 *     summary: Phase 3 — the authenticated user's own merchant's Surfboard payment configuration/status
 *     description: >
 *       Read-only — merchantId is derived from the caller, never supplied.
 *       Same data and same underlying controller/service as Platform
 *       Admin's GET /integrations/surfboard/merchants/{merchantId}/status
 *       (see merchantSync.controller.js's resolveMerchantId-style reuse) —
 *       no separate sync-trigger action exists here; Refresh Sync stays
 *       Platform Admin only.
 *     tags: [Merchant Context]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Current payment configuration/status
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/MerchantSyncStatus' }
 *       401: { description: Missing or invalid bearer token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: No merchant.read permission, or caller has no merchant assignment, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get('/payment-status', requirePermission('merchant.read'), merchantSyncController.getStatus)

/**
 * @openapi
 * /merchant/staff:
 *   get:
 *     summary: This staff roster, for the authenticated user's own merchant
 *     tags: [Merchant Context]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Staff roster
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { type: array, items: { $ref: '#/components/schemas/PlatformMerchantStaffEntry' } }
 *       401: { description: Missing or invalid bearer token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: No merchant.read permission, or caller has no merchant assignment, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.get('/staff', requirePermission('merchant.read'), merchantStaffController.listStaff)

/**
 * @openapi
 * /merchant/staff/{staffId}:
 *   delete:
 *     summary: Remove a staff member from the authenticated user's own merchant
 *     tags: [Merchant Context]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Staff member removed, content: { application/json: { schema: { $ref: '#/components/schemas/ApiResponse' } } } }
 *       401: { description: Missing or invalid bearer token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: No merchant.write permission, or caller has no merchant assignment, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Staff assignment not found, content: { application/json: { schema: { $ref: '#/components/schemas/NotFoundError' } } } }
 *       409: { description: Already removed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.delete(
  '/staff/:staffId',
  requirePermission('merchant.write'),
  validate(staffIdParamSchema, 'params'),
  merchantStaffController.removeStaff,
)

/**
 * @openapi
 * /merchant/invitations:
 *   get:
 *     summary: This merchant's invitations
 *     tags: [Merchant Context]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, accepted, expired, revoked] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 100 }
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
 *                     data: { type: array, items: { $ref: '#/components/schemas/MerchantInvitation' } }
 *                     meta: { $ref: '#/components/schemas/Pagination' }
 *       401: { description: Missing or invalid bearer token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: No merchant.read permission, or caller has no merchant assignment, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *   post:
 *     summary: Invite a new staff member to the authenticated user's own merchant
 *     description: merchantId is derived from the caller — never accepted in the body.
 *     tags: [Merchant Context]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, role]
 *             properties:
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
 *       401: { description: Missing or invalid bearer token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: No merchant.write permission, or caller has no merchant assignment, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       409: { description: A pending invitation already exists for this email at this merchant, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       422: { description: Invalid request body, content: { application/json: { schema: { $ref: '#/components/schemas/ValidationError' } } } }
 */
router.get(
  '/invitations',
  requirePermission('merchant.read'),
  validate(listInvitationsQuerySchema, 'query'),
  merchantStaffController.listInvitations,
)
router.post(
  '/invitations',
  requirePermission('merchant.write'),
  validate(createMerchantScopedInvitationSchema),
  merchantStaffController.createInvitation,
)

/**
 * @openapi
 * /merchant/invitations/{invitationId}/resend:
 *   post:
 *     summary: Reissue a fresh token/expiration for this merchant's invitation
 *     tags: [Merchant Context]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: invitationId
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
 *       401: { description: Missing or invalid bearer token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: No merchant.write permission, or caller has no merchant assignment, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Invitation not found (or belongs to a different merchant), content: { application/json: { schema: { $ref: '#/components/schemas/NotFoundError' } } } }
 *       409: { description: Already accepted or revoked, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.post(
  '/invitations/:invitationId/resend',
  requirePermission('merchant.write'),
  validate(invitationIdOnlyParamSchema, 'params'),
  merchantStaffController.resendInvitation,
)

/**
 * @openapi
 * /merchant/invitations/{invitationId}/revoke:
 *   post:
 *     summary: Revoke this merchant's pending/expired invitation
 *     tags: [Merchant Context]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: invitationId
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
 *       401: { description: Missing or invalid bearer token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: No merchant.write permission, or caller has no merchant assignment, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Invitation not found (or belongs to a different merchant), content: { application/json: { schema: { $ref: '#/components/schemas/NotFoundError' } } } }
 *       409: { description: Already accepted or revoked, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.post(
  '/invitations/:invitationId/revoke',
  requirePermission('merchant.write'),
  validate(invitationIdOnlyParamSchema, 'params'),
  merchantStaffController.revokeInvitation,
)

export default router
