import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { analyticsController } from './analytics.controller.js'
import { analyticsQuerySchema } from './analytics.validation.js'

const router = Router()

router.use(requireAuth())

router.get('/revenue-summary', validate(analyticsQuerySchema, 'query'), analyticsController.revenueSummary)
router.get('/branch-performance', validate(analyticsQuerySchema, 'query'), analyticsController.branchPerformance)
router.get('/membership-trends', validate(analyticsQuerySchema, 'query'), analyticsController.membershipTrends)

export default router
