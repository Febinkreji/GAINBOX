import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { notificationController } from './notification.controller.js'
import { createNotificationSchema } from './notification.validation.js'

const router = Router()

router.use(requireAuth())

router.get('/', notificationController.list)
router.post('/', validate(createNotificationSchema), notificationController.create)
router.patch('/:id/read', notificationController.markAsRead)

export default router
