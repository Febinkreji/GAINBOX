import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { analyticsService } from './analytics.service.js'

export const analyticsController = {
  revenueSummary: asyncHandler(async (req, res) => {
    const summary = await analyticsService.getRevenueSummary(req.query.merchantId, req.query)
    ApiResponse.send(res, { data: summary })
  }),

  branchPerformance: asyncHandler(async (req, res) => {
    const performance = await analyticsService.getBranchPerformance(req.query.merchantId, req.query)
    ApiResponse.send(res, { data: performance })
  }),

  membershipTrends: asyncHandler(async (req, res) => {
    const trends = await analyticsService.getMembershipTrends(req.query.merchantId, req.query)
    ApiResponse.send(res, { data: trends })
  }),
}
