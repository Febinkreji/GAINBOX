import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { paymentController } from './payment.controller.js'
import { createPaymentSchema, refundPaymentSchema } from './payment.validation.js'

const router = Router()

router.use(requireAuth())

router.get('/', paymentController.list)
router.get('/:id', paymentController.getById)
router.post('/', validate(createPaymentSchema), paymentController.create)
router.post('/:id/refund', validate(refundPaymentSchema), paymentController.refund)
router.post('/:id/capture', paymentController.capture)
router.post('/:id/cancel', paymentController.cancel)
router.get('/:id/receipt', paymentController.getReceipt)

export default router
