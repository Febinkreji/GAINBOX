import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { merchantSyncService } from './merchantSync.service.js'

/**
 * Platform Admin's window into the Merchant Integration Framework
 * (Sprint 2A). Every response here is "clean and meaningful" even though
 * the underlying adapter always throws NotImplementedError today — see
 * merchantSync.service.js's attemptSync(), which turns that into a
 * recorded `failed` sync outcome, not an HTTP 501. A Platform Admin
 * clicking "Manual Sync" gets a 200 with a real, inspectable result every
 * time, not a scary unhandled-error page.
 */
export const merchantSyncController = {
  triggerSync: asyncHandler(async (req, res) => {
    const result = await merchantSyncService.startSync(req.params.merchantId, { actorUserId: req.user?.id })
    ApiResponse.send(res, { data: result, message: 'Merchant sync attempted' })
  }),

  /** Demo-only — see merchantSyncService.simulateOnboarding()'s own docstring. */
  simulateOnboarding: asyncHandler(async (req, res) => {
    const result = await merchantSyncService.simulateOnboarding(req.params.merchantId, { actorUserId: req.user?.id })
    ApiResponse.send(res, { data: result, message: 'Simulated onboarding completed (demo mode — not a real Surfboard connection)' })
  }),

  getStatus: asyncHandler(async (req, res) => {
    const status = await merchantSyncService.getStatus(req.params.merchantId)
    ApiResponse.send(res, { data: status })
  }),

  getHistory: asyncHandler(async (req, res) => {
    const result = await merchantSyncService.getAllHistory(req.query)
    ApiResponse.send(res, { data: result.items, meta: result.meta })
  }),
}
