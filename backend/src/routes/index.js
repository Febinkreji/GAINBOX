import { Router } from 'express'
import healthRoutes from './health.routes.js'
import merchantRoutes from '../modules/merchant/index.js'
import branchRoutes from '../modules/branch/index.js'
import deviceRoutes from '../modules/device/index.js'
import membershipRoutes from '../modules/membership/index.js'
import paymentRoutes from '../modules/payment/index.js'
import analyticsRoutes from '../modules/analytics/index.js'
import userRoutes from '../modules/user/index.js'
import authRoutes from '../modules/auth/index.js'
import roleRoutes from '../modules/role/index.js'
import notificationRoutes from '../modules/notification/index.js'
import platformRoutes from '../modules/platform/index.js'

/**
 * Every module owns its own router; this file only aggregates and mounts
 * them. Adding a domain means adding one line here, never restructuring
 * existing ones.
 */
const router = Router()

router.use('/health', healthRoutes)
router.use('/auth', authRoutes)
router.use('/merchants', merchantRoutes)
router.use('/branches', branchRoutes)
router.use('/devices', deviceRoutes)
router.use('/memberships', membershipRoutes)
router.use('/payments', paymentRoutes)
router.use('/analytics', analyticsRoutes)
router.use('/users', userRoutes)
router.use('/roles', roleRoutes)
router.use('/notifications', notificationRoutes)
router.use('/platform', platformRoutes)

export default router
