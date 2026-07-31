import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { authController } from './auth.controller.js'
import { createSessionSchema } from './auth.validation.js'
import { invitationController } from '../invitation/invitation.controller.js'
import { acceptInvitationSchema, previewInvitationQuerySchema } from '../invitation/invitation.validation.js'

const router = Router()

router.post('/session', validate(createSessionSchema), authController.createSession)

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: The authenticated caller's identity, merchant assignments, and roles
 *     description: >
 *       Powers the Merchant Portal's own session bootstrap and role-based
 *       navigation — there is no separate "my assignments" endpoint;
 *       merchantAssignments/roles are additions to this existing response.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user
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
 *                         merchantAssignments:
 *                           type: array
 *                           items: { $ref: '#/components/schemas/PlatformMerchantAssignment' }
 *                         roles: { type: array, items: { type: string }, example: [merchant-owner] }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/me', requireAuth(), authController.getCurrentUser)

/**
 * @openapi
 * /auth/invitations/preview:
 *   get:
 *     summary: Preview a merchant staff invitation before accepting it
 *     description: >
 *       Read-only counterpart to POST /auth/invitations/accept — powers the
 *       shareable invitation link (/accept-invitation?token=...): once the
 *       invited person has signed in with Google, this lets the UI show the
 *       merchant name, invited email, and current invitation status before
 *       they commit to accepting. Runs every validity check accept() does
 *       (expired/revoked/already-accepted/wrong email/merchant suspended),
 *       so a successful preview means the follow-up accept() call will
 *       succeed too — but nothing is created or marked accepted here.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string, description: 'The 64-character hex token from the invitation link.' }
 *     responses:
 *       200:
 *         description: Invitation details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/MerchantInvitationPreview' }
 *       401:
 *         description: Missing/invalid bearer token, or invalid invitation token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Invitation was issued to a different email address
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Invitation already accepted, revoked, expired, or its merchant is suspended
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Malformed token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.get(
  '/invitations/preview',
  requireAuth(),
  validate(previewInvitationQuerySchema, 'query'),
  invitationController.preview,
)

/**
 * @openapi
 * /auth/invitations/accept:
 *   post:
 *     summary: Accept a merchant staff invitation (Feature 5)
 *     description: >
 *       Authenticated-user only, not platform-admin — any signed-in user
 *       can accept an invitation addressed to their own email. Validates
 *       the token, checks status/expiration, confirms req.user's email
 *       matches the invitation's email, then creates the merchant_staff
 *       assignment and marks the invitation accepted, all in one
 *       transaction. Identity Sync (unchanged) is what created req.user
 *       in the first place, via this same user's first Google sign-in.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string, description: 'The 64-character hex token from the invitation.' }
 *     responses:
 *       200:
 *         description: Invitation accepted
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
 *                         merchantId: { type: string, format: uuid }
 *                         businessName: { type: string }
 *                         role: { type: string, example: merchant-owner }
 *                         status: { type: string, example: accepted }
 *                         merchantStaffId: { type: string, format: uuid }
 *       401:
 *         description: Missing/invalid bearer token, or invalid invitation token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Invitation was issued to a different email address
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Invitation already accepted, revoked, expired, already assigned, or its merchant is suspended
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationError' }
 */
router.post('/invitations/accept', requireAuth(), validate(acceptInvitationSchema), invitationController.accept)

export default router
