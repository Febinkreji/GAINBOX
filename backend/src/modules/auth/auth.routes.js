import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { authController } from './auth.controller.js'
import { createSessionSchema } from './auth.validation.js'

const router = Router()

router.post('/session', validate(createSessionSchema), authController.createSession)
router.get('/me', requireAuth(), authController.getCurrentUser)

export default router
