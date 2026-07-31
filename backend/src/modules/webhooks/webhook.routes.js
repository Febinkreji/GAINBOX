import { Router } from 'express'
import { validate } from '../../middlewares/validate.middleware.js'
import { verifySurfboardWebhookSignature } from './surfboardWebhookSignature.js'
import { webhookController } from './webhook.controller.js'
import { surfboardWebhookSchema } from './webhook.validation.js'

const router = Router()

// No requireAuth(): Surfboard calls this as a server, not as a GainBox
// user. verifySurfboardWebhookSignature is what actually authenticates the
// caller now — HMAC-SHA512 over the raw body, not a GainBox session.
router.post(
  '/surfboard',
  verifySurfboardWebhookSignature,
  validate(surfboardWebhookSchema),
  webhookController.receiveSurfboardWebhook,
)

export default router
