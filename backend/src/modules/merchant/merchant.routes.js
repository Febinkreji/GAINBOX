import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { merchantController } from './merchant.controller.js'
import {
  createMerchantSchema,
  updateMerchantSchema,
  merchantIdParamSchema,
  listMerchantsQuerySchema,
} from './merchant.validation.js'

const router = Router()

router.use(requireAuth())

router.get('/', validate(listMerchantsQuerySchema, 'query'), merchantController.list)
router.get('/:id', validate(merchantIdParamSchema, 'params'), merchantController.getById)
router.post('/', validate(createMerchantSchema), merchantController.create)
router.patch(
  '/:id',
  validate(merchantIdParamSchema, 'params'),
  validate(updateMerchantSchema),
  merchantController.update,
)
router.delete('/:id', validate(merchantIdParamSchema, 'params'), merchantController.remove)

export default router
