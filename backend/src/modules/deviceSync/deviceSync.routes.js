import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.js'
import { requireRole, requirePermission, requireOwnership } from '../../middlewares/authorization.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { deviceSyncController } from './deviceSync.controller.js'
import { deviceSyncIdParamSchema, deviceSyncHistoryQuerySchema } from './deviceSync.validation.js'

const router = Router()

router.use(requireAuth())

// Same per-route gating rationale as branchSync.routes.js: Platform Admin
// can trigger a sync; the Merchant Portal only ever reads status for its
// own device (Phase 2B has no sync/admin actions).

/**
 * @openapi
 * /integrations/surfboard/devices/history:
 *   get:
 *     summary: Synchronization history across devices (Phase 2 — Store & Device Integration)
 *     description: Every recorded sync attempt for entity_type='device', newest first. Platform-admin only.
 *     tags: [Surfboard Integration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: deviceId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, running, completed, failed, skipped] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated sync history
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/MerchantSyncHistoryEntry' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get(
  '/history',
  requireRole('platform-admin'),
  validate(deviceSyncHistoryQuerySchema, 'query'),
  deviceSyncController.getHistory,
)

/**
 * @openapi
 * /integrations/surfboard/devices/{deviceId}/sync:
 *   post:
 *     summary: Manually trigger a Surfboard Terminal sync for one device, or refresh its status if already synced (Platform Admin only)
 *     description: >
 *       Runs Duplicate Prevention — if no provider_links mapping exists yet,
 *       calls Register Terminal (requires the device's branch to already
 *       have a Surfboard storeId, and that branch's merchant to have
 *       reached MERCHANT_CREATED); if one exists, refreshes its telemetry
 *       via Fetch Terminal by ID instead of registering a duplicate.
 *     tags: [Surfboard Integration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Sync attempted — see `data.status` for the real outcome
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/MerchantSyncResult' }
 *       404:
 *         description: Device not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post(
  '/:deviceId/sync',
  requireRole('platform-admin'),
  validate(deviceSyncIdParamSchema, 'params'),
  deviceSyncController.triggerSync,
)

/**
 * @openapi
 * /integrations/surfboard/devices/{deviceId}/status:
 *   get:
 *     summary: Current Surfboard Terminal synchronization status and telemetry for one device
 *     description: >
 *       Read-only — reachable by Platform Admin (any device) or the
 *       device's own merchant-owner/staff (their own device only, via the
 *       same ownership check /devices/{id} already uses). No sync/admin
 *       action lives behind this route.
 *     tags: [Surfboard Integration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Current sync status and terminal telemetry
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/DeviceSyncStatus' }
 *       404:
 *         description: Device not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Not staffed at this device's merchant
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get(
  '/:deviceId/status',
  validate(deviceSyncIdParamSchema, 'params'),
  requirePermission('device.read'),
  requireOwnership('device', (req) => req.params.deviceId),
  deviceSyncController.getStatus,
)

export default router
