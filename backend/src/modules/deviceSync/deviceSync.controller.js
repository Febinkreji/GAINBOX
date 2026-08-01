import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { deviceSyncService } from './deviceSync.service.js'

/**
 * Platform Admin's (and, read-only, the merchant portal's) window into
 * Device's Surfboard Terminal sync — same shape as branchSyncController.
 */
export const deviceSyncController = {
  triggerSync: asyncHandler(async (req, res) => {
    const result = await deviceSyncService.startSync(req.params.deviceId, { actorUserId: req.user?.id })
    ApiResponse.send(res, { data: result, message: 'Device sync attempted' })
  }),

  getStatus: asyncHandler(async (req, res) => {
    const status = await deviceSyncService.getStatus(req.params.deviceId)
    ApiResponse.send(res, { data: status })
  }),

  getHistory: asyncHandler(async (req, res) => {
    const result = await deviceSyncService.getAllHistory(req.query)
    ApiResponse.send(res, { data: result.items, meta: result.meta })
  }),
}
