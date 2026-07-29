import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { membershipService } from './membership.service.js'

export const membershipController = {
  listPlans: asyncHandler(async (req, res) => {
    const { items, meta } = await membershipService.listPlans(req.query, req.accessibleMerchantIds)
    ApiResponse.send(res, { data: items, meta })
  }),

  getPlanById: asyncHandler(async (req, res) => {
    const plan = await membershipService.getPlanById(req.params.id)
    ApiResponse.send(res, { data: plan })
  }),

  createPlan: asyncHandler(async (req, res) => {
    const plan = await membershipService.createPlan(req.body, req.user?.id)
    ApiResponse.send(res, { statusCode: 201, data: plan, message: 'Membership plan created' })
  }),

  updatePlan: asyncHandler(async (req, res) => {
    const plan = await membershipService.updatePlan(req.params.id, req.body, req.user?.id)
    ApiResponse.send(res, { data: plan, message: 'Membership plan updated' })
  }),

  removePlan: asyncHandler(async (req, res) => {
    await membershipService.removePlan(req.params.id, req.user?.id)
    ApiResponse.send(res, { message: 'Membership plan deleted' })
  }),

  listSubscriptions: asyncHandler(async (req, res) => {
    const { items, meta } = await membershipService.listSubscriptions(req.query)
    ApiResponse.send(res, { data: items, meta })
  }),

  getSubscriptionById: asyncHandler(async (req, res) => {
    const subscription = await membershipService.getSubscriptionById(req.params.id)
    ApiResponse.send(res, { data: subscription })
  }),

  createSubscription: asyncHandler(async (req, res) => {
    const subscription = await membershipService.createSubscription(req.body, req.user?.id)
    ApiResponse.send(res, { statusCode: 201, data: subscription, message: 'Subscription created' })
  }),

  cancelSubscription: asyncHandler(async (req, res) => {
    const subscription = await membershipService.cancelSubscription(req.params.id, req.user?.id)
    ApiResponse.send(res, { data: subscription, message: 'Subscription cancelled' })
  }),
}
