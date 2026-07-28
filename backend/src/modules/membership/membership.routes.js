import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { membershipController } from './membership.controller.js'
import {
  createMembershipPlanSchema,
  updateMembershipPlanSchema,
  createSubscriptionSchema,
} from './membership.validation.js'

const router = Router()

router.use(requireAuth())

router.get('/plans', membershipController.listPlans)
router.get('/plans/:id', membershipController.getPlanById)
router.post('/plans', validate(createMembershipPlanSchema), membershipController.createPlan)
router.patch('/plans/:id', validate(updateMembershipPlanSchema), membershipController.updatePlan)
router.delete('/plans/:id', membershipController.removePlan)

router.get('/subscriptions', membershipController.listSubscriptions)
router.post('/subscriptions', validate(createSubscriptionSchema), membershipController.createSubscription)
router.post('/subscriptions/:id/cancel', membershipController.cancelSubscription)

export default router
