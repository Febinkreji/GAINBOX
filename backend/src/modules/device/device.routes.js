import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { deviceController } from './device.controller.js'
import {
  registerDeviceSchema,
  updateDeviceSchema,
  configureDeviceBrandingSchema,
  configureDeviceTipsSchema,
} from './device.validation.js'

const router = Router()

router.use(requireAuth())

router.get('/', deviceController.list)
router.get('/:id', deviceController.getById)
router.post('/', validate(registerDeviceSchema), deviceController.register)
router.patch('/:id', validate(updateDeviceSchema), deviceController.update)
router.delete('/:id', deviceController.deactivate)
router.patch('/:id/branding', validate(configureDeviceBrandingSchema), deviceController.configureBranding)
router.patch('/:id/tips', validate(configureDeviceTipsSchema), deviceController.configureTips)

export default router
