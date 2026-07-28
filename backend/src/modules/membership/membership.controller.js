import { asyncHandler } from '../../utils/asyncHandler.js'
import { ApiResponse } from '../../utils/ApiResponse.js'
import { membershipService } from './membership.service.js'

export const membershipController = {
  listPlans: asyncHandler(async (req, res) => {
    const plans = await membershipService.listPlans(req.query.merchantId)
    ApiResponse.send(res, { data: plans })
  }),

  getPlanById: asyncHandler(async (req, res) => {
    const plan = await membershipService.getPlanById(req.params.id)
    ApiResponse.send(res, { data: plan })
  }),

  createPlan: asyncHandler(async (req, res) => {
    const plan = await membershipService.createPlan(req.body)
    ApiResponse.send(res, { statusCode: 201, data: plan, message: 'Membership plan created' })
  }),

  updatePlan: asyncHandler(async (req, res) => {
    const plan = await membershipService.updatePlan(req.params.id, req.body)
    ApiResponse.send(res, { data: plan, message: 'Membership plan updated' })
  }),

  removePlan: asyncHandler(async (req, res) => {
    await membershipService.removePlan(req.params.id)
    ApiResponse.send(res, { message: 'Membership plan deleted' })
  }),

  listSubscriptions: asyncHandler(async (req, res) => {
    const subscriptions = await membershipService.listSubscriptions(req.query.planId)
    ApiResponse.send(res, { data: subscriptions })
  }),

  createSubscription: asyncHandler(async (req, res) => {
    const subscription = await membershipService.createSubscription(req.body)
    ApiResponse.send(res, { statusCode: 201, data: subscription, message: 'Subscription created' })
  }),

  cancelSubscription: asyncHandler(async (req, res) => {
    const subscription = await membershipService.cancelSubscription(req.params.id)
    ApiResponse.send(res, { data: subscription, message: 'Subscription cancelled' })
  }),
}
