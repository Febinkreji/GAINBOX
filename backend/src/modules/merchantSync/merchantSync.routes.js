import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.js'
import { requireRole } from '../../middlewares/authorization.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { merchantSyncController } from './merchantSync.controller.js'
import { merchantSyncIdParamSchema, syncHistoryQuerySchema } from './merchantSync.validation.js'

const router = Router()

// Platform Admin only — same gate as Platform Control Center itself
// (platform.routes.js). Merchant Owners/Staff and unauthenticated callers
// get the same 401/403 any other role-gated route in this codebase
// produces; there is no separate, weaker path into these.
router.use(requireAuth(), requireRole('platform-admin'))

/**
 * @openapi
 * /integrations/surfboard/merchants/history:
 *   get:
 *     summary: Synchronization history across merchants (Sprint 2A — Merchant Integration Framework)
 *     description: >
 *       Every recorded sync attempt for entity_type='merchant', newest
 *       first. Pass `merchantId` to scope this to one merchant (this is
 *       what Merchant Details' own Sync History section calls — there is
 *       no separate per-merchant route). Real Surfboard results don't
 *       exist yet (see docs/architecture/SURFBOARD_INTEGRATION.md) — every
 *       row's `status` reflects the framework's own recorded outcome.
 *     tags: [Surfboard Integration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: merchantId
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
router.get('/history', validate(syncHistoryQuerySchema, 'query'), merchantSyncController.getHistory)

/**
 * @openapi
 * /integrations/surfboard/merchants/{merchantId}/sync:
 *   post:
 *     summary: Manually trigger a Surfboard sync for one merchant (Sprint 2A — Merchant Integration Framework)
 *     description: >
 *       Runs the full framework end-to-end — Duplicate Prevention check,
 *       Provider Port call, Sync History recording — synchronously, and
 *       always returns 200 with the real outcome. The Surfboard adapter is
 *       a Sprint 2A stub (see docs/architecture/SURFBOARD_INTEGRATION.md),
 *       so `status` is "failed" today unless a provider_links mapping
 *       already exists (in which case it's "skipped").
 *     tags: [Surfboard Integration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
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
 *         description: Merchant not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/:merchantId/sync', validate(merchantSyncIdParamSchema, 'params'), merchantSyncController.triggerSync)

/**
 * @openapi
 * /integrations/surfboard/merchants/{merchantId}/simulate:
 *   post:
 *     summary: Simulate a completed onboarding for demo purposes (disabled in production)
 *     description: >
 *       Fabricates an obviously-fake applicationId/merchantId/storeId and
 *       records a `provider_links` mapping flagged `metadata.simulated: true`.
 *       Not a real Surfboard connection — exists only because this
 *       integration is currently blocked on an external, account-level gap
 *       (no transaction pricing plan provisioned for the partner account)
 *       that no request payload can work around. Returns 403 in production.
 *     tags: [Surfboard Integration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Simulated onboarding recorded
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/MerchantSyncResult' }
 *       409:
 *         description: A Surfboard mapping already exists for this merchant
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Disabled in production
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post(
  '/:merchantId/simulate',
  validate(merchantSyncIdParamSchema, 'params'),
  merchantSyncController.simulateOnboarding,
)

/**
 * @openapi
 * /integrations/surfboard/merchants/{merchantId}/status:
 *   get:
 *     summary: Current Surfboard synchronization status for one merchant (Sprint 2A — Merchant Integration Framework)
 *     description: >
 *       Derived from the latest sync_history row and whether an active
 *       provider_links mapping exists — never a separately stored column,
 *       so this can never drift from the history it's computed from.
 *     tags: [Surfboard Integration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
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
 *                     data: { $ref: '#/components/schemas/MerchantSyncStatus' }
 *       404:
 *         description: Merchant not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Caller is not a platform-admin
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/:merchantId/status', validate(merchantSyncIdParamSchema, 'params'), merchantSyncController.getStatus)

export default router
