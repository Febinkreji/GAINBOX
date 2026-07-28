import { Router } from 'express'
import { validate } from '../../middlewares/validate.middleware.js'
import { webhookController } from './webhook.controller.js'
import { surfboardWebhookSchema } from './webhook.validation.js'

const router = Router()

// No requireAuth(): Surfboard calls this as a server, not as a GainBox
// user. Its own signature verification is intentionally not implemented
// yet (see webhook.service.js) — this endpoint currently trusts nothing.
router.post('/surfboard', validate(surfboardWebhookSchema), webhookController.receiveSurfboardWebhook)

export default router
