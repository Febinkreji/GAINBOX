import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.js'
import { requirePermission, requireOwnership, scopeMerchantAccess } from '../../middlewares/authorization.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { branchController } from './branch.controller.js'
import {
  createBranchSchema,
  updateBranchSchema,
  branchIdParamSchema,
  listBranchesQuerySchema,
} from './branch.validation.js'

const router = Router()

router.use(requireAuth())

/**
 * @openapi
 * /branches:
 *   get:
 *     summary: List branches
 *     description: >
 *       Supports search, filtering, sorting, and pagination. Passing
 *       `merchantId` scopes the list to a single merchant's branches — the
 *       same endpoint serves both "list branches" and "list branches for
 *       merchant" via that optional filter.
 *     tags: [Branches]
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
 *         description: Restrict results to this merchant's branches.
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Matches against branch name and city.
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive] }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [name, createdAt, status] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: A page of branches
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Branch' }
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
// Tenant-scoped: scopeMerchantAccess() resolves req.accessibleMerchantIds
// (null for platform admins, else the merchants this user is actively
// staffed at) and branchController.list forwards it into the repository's
// SQL filter — non-admins never see another merchant's branches here.
router.get(
  '/',
  requirePermission('branch.read'),
  scopeMerchantAccess(),
  validate(listBranchesQuerySchema, 'query'),
  branchController.list,
)

/**
 * @openapi
 * /branches/{id}:
 *   get:
 *     summary: Get a branch by id
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: The branch
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Branch' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Branch not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */
router.get(
  '/:id',
  validate(branchIdParamSchema, 'params'),
  requirePermission('branch.read'),
  requireOwnership('branch', (req) => req.params.id),
  branchController.getById,
)

/**
 * @openapi
 * /branches:
 *   post:
 *     summary: Create a branch
 *     description: >
 *       A branch always belongs to an existing merchant — `merchantId` must
 *       reference a real, non-deleted merchant or the request fails with
 *       404. After creation, GainBox attempts a Surfboard Store sync
 *       (`branchSyncService.startSync` — Phase 2). This requires the
 *       merchant to have already reached MERCHANT_CREATED and this branch
 *       to have `phoneCode`/`phoneNumber` set; if either is missing, the
 *       sync fails and is logged, not surfaced to the caller — branch
 *       creation still succeeds either way. See
 *       `GET /integrations/surfboard/branches/{id}/status` and
 *       `POST .../sync` (Refresh Sync) to retry once ready.
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [merchantId, name, city]
 *             properties:
 *               merchantId: { type: string, format: uuid }
 *               name: { type: string, example: Anna Nagar }
 *               address: { type: string, nullable: true }
 *               city: { type: string, example: Chennai }
 *               state: { type: string, nullable: true, example: Tamil Nadu }
 *               country: { type: string, nullable: true, example: India }
 *               postalCode: { type: string, nullable: true, example: '600040' }
 *               phoneCode: { type: string, nullable: true, example: '46', description: Required for Surfboard Store sync (Phase 2) — omit to leave sync blocked until set. }
 *               phoneNumber: { type: string, nullable: true, example: '701234567', description: Required for Surfboard Store sync (Phase 2) — omit to leave sync blocked until set. }
 *     responses:
 *       201:
 *         description: Branch created
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Branch' }
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
  '/',
  validate(createBranchSchema),
  requirePermission('branch.write'),
  requireOwnership('merchant', (req) => req.body.merchantId),
  branchController.create,
)

/**
 * @openapi
 * /branches/{id}:
 *   patch:
 *     summary: Update a branch
 *     tags: [Branches]
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
 *               address: { type: string, nullable: true }
 *               city: { type: string }
 *               state: { type: string, nullable: true }
 *               country: { type: string, nullable: true }
 *               postalCode: { type: string, nullable: true }
 *               status: { type: string, enum: [active, inactive] }
 *     responses:
 *       200:
 *         description: Branch updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Branch' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Branch not found
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
  '/:id',
  validate(branchIdParamSchema, 'params'),
  requirePermission('branch.write'),
  requireOwnership('branch', (req) => req.params.id),
  validate(updateBranchSchema),
  branchController.update,
)

/**
 * @openapi
 * /branches/{id}:
 *   delete:
 *     summary: Soft-delete a branch
 *     description: Sets deleted_at; the row is never physically removed.
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Branch deleted
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiResponse' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Branch not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */
router.delete(
  '/:id',
  validate(branchIdParamSchema, 'params'),
  requirePermission('branch.write'),
  requireOwnership('branch', (req) => req.params.id),
  branchController.remove,
)

export default router
