import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { branchSyncService } from './branchSync.service.js'

/**
 * Platform Admin's (and, read-only, the merchant portal's) window into
 * Branch's Surfboard Store sync — same shape as merchantSyncController.
 */
export const branchSyncController = {
  triggerSync: asyncHandler(async (req, res) => {
    const result = await branchSyncService.startSync(req.params.branchId, { actorUserId: req.user?.id })
    ApiResponse.send(res, { data: result, message: 'Branch sync attempted' })
  }),

  getStatus: asyncHandler(async (req, res) => {
    const status = await branchSyncService.getStatus(req.params.branchId)
    ApiResponse.send(res, { data: status })
  }),

  getHistory: asyncHandler(async (req, res) => {
    const result = await branchSyncService.getAllHistory(req.query)
    ApiResponse.send(res, { data: result.items, meta: result.meta })
  }),
}
