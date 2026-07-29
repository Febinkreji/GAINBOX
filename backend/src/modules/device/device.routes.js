import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.js'
import { requirePermission, requireOwnership, scopeMerchantAccess } from '../../middlewares/authorization.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { deviceController } from './device.controller.js'
import {
  createDeviceSchema,
  updateDeviceSchema,
  deviceIdParamSchema,
  listDevicesQuerySchema,
} from './device.validation.js'

const router = Router()

router.use(requireAuth())

/**
 * @openapi
 * /devices:
 *   get:
 *     summary: List devices
 *     description: >
 *       Supports search, filtering, sorting, and pagination. Passing
 *       `branchId` scopes the list to a single branch's devices — the same
 *       endpoint serves both "list devices" and "list devices for branch"
 *       via that optional filter (same pattern as /branches?merchantId=).
 *     tags: [Devices]
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
 *         name: branchId
 *         schema: { type: string, format: uuid }
 *         description: Restrict results to this branch's devices.
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Matches against the device label.
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [registered, active, offline, deactivated] }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [label, createdAt, status] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: A page of devices
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Device' }
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
// Tenant-scoped — same shape as branch.routes.js. Devices have no
// merchant_id of their own; deviceRepository resolves the scope via
// branch_id -> branches.merchant_id.
router.get(
  '/',
  requirePermission('device.read'),
  scopeMerchantAccess(),
  validate(listDevicesQuerySchema, 'query'),
  deviceController.list,
)

/**
 * @openapi
 * /devices/{id}:
 *   get:
 *     summary: Get a device by id
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: The device
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Device' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Device not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */
router.get(
  '/:id',
  validate(deviceIdParamSchema, 'params'),
  requirePermission('device.read'),
  requireOwnership('device', (req) => req.params.id),
  deviceController.getById,
)

/**
 * @openapi
 * /devices:
 *   post:
 *     summary: Register a device
 *     description: >
 *       A device always belongs to an existing branch — `branchId` must
 *       reference a real, non-deleted branch or the request fails with
 *       404. After creation, GainBox calls the Surfboard device provider
 *       placeholder (`deviceProvider.registerDevice`), which currently
 *       throws NotImplementedError; that failure is logged, not surfaced to
 *       the caller — device creation still succeeds.
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [branchId, label]
 *             properties:
 *               branchId: { type: string, format: uuid }
 *               label: { type: string, example: 'Front Desk Terminal' }
 *               brandingConfig:
 *                 type: object
 *                 additionalProperties: true
 *                 nullable: true
 *               tipConfig:
 *                 type: object
 *                 additionalProperties: true
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Device registered
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Device' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: branchId does not reference an existing branch
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
  validate(createDeviceSchema),
  requirePermission('device.write'),
  requireOwnership('branch', (req) => req.body.branchId),
  deviceController.create,
)

/**
 * @openapi
 * /devices/{id}:
 *   patch:
 *     summary: Update a device
 *     tags: [Devices]
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
 *               label: { type: string }
 *               status: { type: string, enum: [registered, active, offline, deactivated] }
 *               brandingConfig: { type: object, additionalProperties: true, nullable: true }
 *               tipConfig: { type: object, additionalProperties: true, nullable: true }
 *     responses:
 *       200:
 *         description: Device updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Device' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Device not found
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
  validate(deviceIdParamSchema, 'params'),
  requirePermission('device.write'),
  requireOwnership('device', (req) => req.params.id),
  validate(updateDeviceSchema),
  deviceController.update,
)

/**
 * @openapi
 * /devices/{id}:
 *   delete:
 *     summary: Soft-delete a device
 *     description: Sets deleted_at; the row is never physically removed.
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Device deleted
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiResponse' }
 *       401:
 *         description: Missing or invalid bearer token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Device not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/NotFoundError' }
 */
router.delete(
  '/:id',
  validate(deviceIdParamSchema, 'params'),
  requirePermission('device.write'),
  requireOwnership('device', (req) => req.params.id),
  deviceController.remove,
)

export default router
