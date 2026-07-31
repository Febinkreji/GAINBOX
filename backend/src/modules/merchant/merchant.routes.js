import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.js'
import { requireRole, requirePermission, requireOwnership } from '../../middlewares/authorization.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { merchantController } from './merchant.controller.js'
import {
  createMerchantSchema,
  updateMerchantSchema,
  merchantIdParamSchema,
  listMerchantsQuerySchema,
} from './merchant.validation.js'
import { merchantStaffController } from '../merchantStaff/merchantStaff.controller.js'
import { merchantStaffIdParamSchema, merchantInvitationIdParamSchema } from '../merchantStaff/merchantStaff.validation.js'
import { createMerchantScopedInvitationSchema, listInvitationsQuerySchema } from '../invitation/invitation.validation.js'

const router = Router()

router.use(requireAuth())

// Listing every merchant and onboarding a new one are platform-wide
// actions, not scoped to a merchant a user already belongs to — gated by
// role, not by requireOwnership (there's no existing merchant to check
// ownership against for either of these).
router.get('/', requireRole('platform-admin'), validate(listMerchantsQuerySchema, 'query'), merchantController.list)
router.get(
  '/:id',
  validate(merchantIdParamSchema, 'params'),
  requirePermission('merchant.read'),
  requireOwnership('merchant', (req) => req.params.id),
  merchantController.getById,
)
router.post('/', requireRole('platform-admin'), validate(createMerchantSchema), merchantController.create)
router.patch(
  '/:id',
  validate(merchantIdParamSchema, 'params'),
  requirePermission('merchant.write'),
  requireOwnership('merchant', (req) => req.params.id),
  validate(updateMerchantSchema),
  merchantController.update,
)
router.delete(
  '/:id',
  validate(merchantIdParamSchema, 'params'),
  requirePermission('merchant.write'),
  requireOwnership('merchant', (req) => req.params.id),
  merchantController.remove,
)

// Merchant Portal's staff-management surface (Merchant Owner/Staff acting
// on their own merchant) — distinct from Platform Control Center's
// /platform/invitations (platform-admin only, any merchant). Reuses
// invitationService/merchantStaffService entirely (see
// merchantStaff.controller.js); merchant.write covers "manage who has
// access to my merchant" the same way it already covers editing the
// merchant profile itself — there's no separate staff-specific permission.
//
// DEPRECATED (kept for backward compatibility, not removed): every route
// below has a merchant-context equivalent under /merchant/* (see
// merchantContext.routes.js) that derives the merchant from the
// authenticated user instead of requiring it in the URL. New frontend code
// should call those instead.

/**
 * @openapi
 * /merchants/{id}/staff:
 *   get:
 *     summary: List this merchant's staff roster
 *     deprecated: true
 *     description: '**Deprecated** — use `GET /merchant/staff` instead.'
 *     tags: [Merchants]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
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
 *       403: { description: No merchant.read permission or not staffed at this merchant, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Merchant not found, content: { application/json: { schema: { $ref: '#/components/schemas/NotFoundError' } } } }
 */
router.get(
  '/:id/staff',
  validate(merchantIdParamSchema, 'params'),
  requirePermission('merchant.read'),
  requireOwnership('merchant', (req) => req.params.id),
  merchantStaffController.listStaff,
)

/**
 * @openapi
 * /merchants/{id}/staff/{staffId}:
 *   delete:
 *     summary: Remove a staff member (status -> 'removed', not a delete)
 *     deprecated: true
 *     description: '**Deprecated** — use `DELETE /merchant/staff/{staffId}` instead.'
 *     tags: [Merchants]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Staff member removed, content: { application/json: { schema: { $ref: '#/components/schemas/ApiResponse' } } } }
 *       401: { description: Missing or invalid bearer token, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       403: { description: No merchant.write permission or not staffed at this merchant, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Staff assignment not found, content: { application/json: { schema: { $ref: '#/components/schemas/NotFoundError' } } } }
 *       409: { description: Already removed, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.delete(
  '/:id/staff/:staffId',
  validate(merchantStaffIdParamSchema, 'params'),
  requirePermission('merchant.write'),
  requireOwnership('merchant', (req) => req.params.id),
  merchantStaffController.removeStaff,
)

/**
 * @openapi
 * /merchants/{id}/invitations:
 *   get:
 *     summary: List this merchant's invitations
 *     deprecated: true
 *     description: '**Deprecated** — use `GET /merchant/invitations` instead.'
 *     tags: [Merchants]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
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
 *       403: { description: No merchant.read permission or not staffed at this merchant, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *   post:
 *     summary: Invite a new staff member to this merchant
 *     deprecated: true
 *     description: >
 *       **Deprecated** — use `POST /merchant/invitations` instead.
 *       merchantId is taken from the URL, never the request body.
 *     tags: [Merchants]
 *     security: [{ bearerAuth: [] }]
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
 *       403: { description: No merchant.write permission or not staffed at this merchant, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       409: { description: A pending invitation already exists for this email at this merchant, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       422: { description: Invalid request body, content: { application/json: { schema: { $ref: '#/components/schemas/ValidationError' } } } }
 */
router.get(
  '/:id/invitations',
  validate(merchantIdParamSchema, 'params'),
  requirePermission('merchant.read'),
  requireOwnership('merchant', (req) => req.params.id),
  validate(listInvitationsQuerySchema, 'query'),
  merchantStaffController.listInvitations,
)
router.post(
  '/:id/invitations',
  validate(merchantIdParamSchema, 'params'),
  requirePermission('merchant.write'),
  requireOwnership('merchant', (req) => req.params.id),
  validate(createMerchantScopedInvitationSchema),
  merchantStaffController.createInvitation,
)

/**
 * @openapi
 * /merchants/{id}/invitations/{invitationId}/resend:
 *   post:
 *     summary: Reissue a fresh token/expiration for this merchant's invitation
 *     deprecated: true
 *     description: '**Deprecated** — use `POST /merchant/invitations/{invitationId}/resend` instead.'
 *     tags: [Merchants]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
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
 *       403: { description: No merchant.write permission or not staffed at this merchant, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Invitation not found (or belongs to a different merchant), content: { application/json: { schema: { $ref: '#/components/schemas/NotFoundError' } } } }
 *       409: { description: Already accepted or revoked, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.post(
  '/:id/invitations/:invitationId/resend',
  validate(merchantInvitationIdParamSchema, 'params'),
  requirePermission('merchant.write'),
  requireOwnership('merchant', (req) => req.params.id),
  merchantStaffController.resendInvitation,
)

/**
 * @openapi
 * /merchants/{id}/invitations/{invitationId}/revoke:
 *   post:
 *     summary: Revoke this merchant's pending/expired invitation
 *     deprecated: true
 *     description: '**Deprecated** — use `POST /merchant/invitations/{invitationId}/revoke` instead.'
 *     tags: [Merchants]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
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
 *       403: { description: No merchant.write permission or not staffed at this merchant, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Invitation not found (or belongs to a different merchant), content: { application/json: { schema: { $ref: '#/components/schemas/NotFoundError' } } } }
 *       409: { description: Already accepted or revoked, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
router.post(
  '/:id/invitations/:invitationId/revoke',
  validate(merchantInvitationIdParamSchema, 'params'),
  requirePermission('merchant.write'),
  requireOwnership('merchant', (req) => req.params.id),
  merchantStaffController.revokeInvitation,
)

export default router
