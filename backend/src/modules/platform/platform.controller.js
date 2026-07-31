import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { platformService } from './platform.service.js'
import { platformHealthService } from './platform.health.service.js'
import { merchantService } from '../merchant/merchant.service.js'
import { userService } from '../user/user.service.js'

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

  // Merchant Edit/Activate/Deactivate (Step 1) — thin wrappers over the
  // merchant module's own service; no business logic lives here.
  updateMerchant: asyncHandler(async (req, res) => {
    const merchant = await merchantService.update(req.params.merchantId, req.body, req.user?.id)
    ApiResponse.send(res, { data: merchant, message: 'Merchant updated' })
  }),

  activateMerchant: asyncHandler(async (req, res) => {
    const merchant = await merchantService.activate(req.params.merchantId, req.user?.id)
    ApiResponse.send(res, { data: merchant, message: 'Merchant activated' })
  }),

  deactivateMerchant: asyncHandler(async (req, res) => {
    const merchant = await merchantService.deactivate(req.params.merchantId, req.user?.id)
    ApiResponse.send(res, { data: merchant, message: 'Merchant deactivated' })
  }),

  // User Activate/Deactivate (Step 4) — thin wrappers over the user
  // module's own service; no business logic lives here.
  activateUser: asyncHandler(async (req, res) => {
    const user = await userService.activate(req.params.userId, req.user?.id)
    ApiResponse.send(res, { data: user, message: 'User activated' })
  }),

  deactivateUser: asyncHandler(async (req, res) => {
    const user = await userService.deactivate(req.params.userId, req.user?.id)
    ApiResponse.send(res, { data: user, message: 'User deactivated' })
  }),
}
