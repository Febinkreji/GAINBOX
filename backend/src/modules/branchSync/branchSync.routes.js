import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.js'
import { requireRole, requirePermission, requireOwnership } from '../../middlewares/authorization.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { branchSyncController } from './branchSync.controller.js'
import { branchSyncIdParamSchema, branchSyncHistoryQuerySchema } from './branchSync.validation.js'

const router = Router()

router.use(requireAuth())

// Unlike merchantSync.routes.js (platform-admin only for every route),
// this module is read by two different callers: Platform Admin (who can
// also trigger a sync) and the Merchant Portal (read-only status, for its
// own branch — no sync/admin actions there, per Phase 2's own rules). So
// gating is per-route, not router-wide.

/**
 * @openapi
 * /integrations/surfboard/branches/history:
 *   get:
 *     summary: Synchronization history across branches (Phase 2 — Store & Device Integration)
 *     description: Every recorded sync attempt for entity_type='branch', newest first. Platform-admin only.
 *     tags: [Surfboard Integration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
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
  validate(branchSyncHistoryQuerySchema, 'query'),
  branchSyncController.getHistory,
)

/**
 * @openapi
 * /integrations/surfboard/branches/{branchId}/sync:
 *   post:
 *     summary: Manually trigger a Surfboard Store sync for one branch, or refresh its status if already synced (Platform Admin only)
 *     description: >
 *       Runs Duplicate Prevention — if no provider_links mapping exists yet,
 *       calls Create Store (requires the branch's merchant to have already
 *       reached MERCHANT_CREATED); if one exists, refreshes its status via
 *       Fetch Store Details instead of creating a duplicate.
 *     tags: [Surfboard Integration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
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
 *         description: Branch not found
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
  '/:branchId/sync',
  requireRole('platform-admin'),
  validate(branchSyncIdParamSchema, 'params'),
  branchSyncController.triggerSync,
)

/**
 * @openapi
 * /integrations/surfboard/branches/{branchId}/status:
 *   get:
 *     summary: Current Surfboard Store synchronization status for one branch
 *     description: >
 *       Read-only — reachable by Platform Admin (any branch) or the
 *       branch's own merchant-owner/staff (their own branch only, via the
 *       same ownership check /branches/{id} already uses). No sync/admin
 *       action lives behind this route.
 *     tags: [Surfboard Integration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Current sync status
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/BranchSyncStatus' }
 *       404:
 *         description: Branch not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Not staffed at this branch's merchant
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get(
  '/:branchId/status',
  validate(branchSyncIdParamSchema, 'params'),
  requirePermission('branch.read'),
  requireOwnership('branch', (req) => req.params.branchId),
  branchSyncController.getStatus,
)

export default router
