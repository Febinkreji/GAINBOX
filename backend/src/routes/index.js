import { Router } from 'express'
import healthRoutes from './health.routes.js'
import merchantRoutes from '../modules/merchant/index.js'
import merchantContextRoutes from '../modules/merchant/merchantContext.routes.js'
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
import merchantSyncRoutes from '../modules/merchantSync/merchantSync.routes.js'

/**
 * Every module owns its own router; this file only aggregates and mounts
 * them. Adding a domain means adding one line here, never restructuring
 * existing ones.
 */
const router = Router()

router.use('/health', healthRoutes)
router.use('/auth', authRoutes)
router.use('/merchants', merchantRoutes)
// Singular, distinct from /merchants above: merchant-context routes derive
// the merchant from the authenticated user (see requireMerchantContext() in
// authorization.middleware.js) — the frontend never supplies a merchantId
// here. See merchantContext.routes.js.
router.use('/merchant', merchantContextRoutes)
router.use('/branches', branchRoutes)
router.use('/devices', deviceRoutes)
router.use('/memberships', membershipRoutes)
router.use('/payments', paymentRoutes)
router.use('/analytics', analyticsRoutes)
router.use('/users', userRoutes)
router.use('/roles', roleRoutes)
router.use('/notifications', notificationRoutes)
router.use('/platform', platformRoutes)
// Merchant Integration Framework (Sprint 2A) — see
// docs/architecture/SURFBOARD_INTEGRATION.md. Not nested under /platform:
// this is a distinct integration surface (the exact paths this sprint's
// design specified), even though it's gated to platform-admin the same way.
router.use('/integrations/surfboard/merchants', merchantSyncRoutes)

export default router
