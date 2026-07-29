import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { platformService } from './platform.service.js'
import { platformHealthService } from './platform.health.service.js'

export const platformController = {
  getDashboard: asyncHandler(async (_req, res) => {
    const summary = await platformService.getDashboardSummary()
    ApiResponse.send(res, { data: summary })
  }),

  getHealth: asyncHandler(async (_req, res) => {
    const health = await platformHealthService.getHealth()
    ApiResponse.send(res, { data: health })
  }),

  listMerchantOverview: asyncHandler(async (req, res) => {
    const { items, meta } = await platformService.listMerchantOverview(req.query)
    ApiResponse.send(res, { data: items, meta })
  }),

  getMerchantDetails: asyncHandler(async (req, res) => {
    const details = await platformService.getMerchantDetails(req.params.merchantId)
    ApiResponse.send(res, { data: details })
  }),

  listUserOverview: asyncHandler(async (req, res) => {
    const { items, meta } = await platformService.listUserOverview(req.query)
    ApiResponse.send(res, { data: items, meta })
  }),

  getUserDetails: asyncHandler(async (req, res) => {
    const details = await platformService.getUserDetails(req.params.userId)
    ApiResponse.send(res, { data: details })
  }),
}
